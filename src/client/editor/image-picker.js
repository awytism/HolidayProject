import { escapeHtml, safeUrl } from "../utils/html.js";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function createImagePicker(api, auth, showToast) {
  const dialog = document.createElement("dialog");
  dialog.className = "media-dialog";
  dialog.setAttribute("aria-labelledby", "media-dialog-title");
  document.body.append(dialog);
  let activeSession;
  const stagedUploads = new Set();

  dialog.addEventListener("click", (event) => handleClick(event));
  dialog.addEventListener("submit", (event) => submit(event));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (activeSession && !activeSession.submitting) finishAndClose(activeSession, undefined);
  });

  return { open, commit, cancel };

  function open(current = null) {
    if (activeSession) finishAndClose(activeSession, undefined);
    const session = { resolve: null, submitting: false };
    activeSession = session;
    dialog.innerHTML = renderDialog(current);
    dialog.showModal();
    return new Promise((resolve) => { session.resolve = resolve; });
  }

  function handleClick(event) {
    const session = activeSession;
    if (event.target.closest("[data-media-cancel]") && session && !session.submitting) finishAndClose(session, undefined);
    if (event.target.closest("[data-media-remove]") && session && !session.submitting) {
      finishAndClose(session, null);
      showToast("Imagem de capa removida. Salve as alterações para manter esta atualização.");
    }
  }

  async function submit(event) {
    event.preventDefault();
    const session = activeSession;
    if (!session || session.submitting) return;
    const form = new FormData(event.target);
    clearError();
    setBusy(session, true);
    try {
      const media = await selectedMedia(form);
      if (session !== activeSession) return;
      finishAndClose(session, media);
      showToast("Imagem de capa aplicada. Salve as alterações para mantê-la.");
    } catch (error) {
      if (session !== activeSession) return;
      showError(error.message);
      setBusy(session, false);
    }
  }

  async function selectedMedia(form) {
    const file = form.get("file");
    const alt = String(form.get("alt") ?? "").trim();
    const position = String(form.get("position") ?? "center");
    if (file?.size) {
      if (file.size > MAX_UPLOAD_BYTES) throw new TypeError("A imagem deve ter no máximo 8 MB");
      const uploaded = await api.uploadMedia(file, auth.getSession().csrfToken);
      stagedUploads.add(uploaded.id);
      return { mediaId: uploaded.id, alt, position };
    }
    const url = safeUrl(String(form.get("url") ?? ""));
    if (!url || !url.startsWith("https://")) throw new TypeError("Digite uma URL HTTPS de imagem ou escolha um arquivo");
    return { url, alt, position };
  }

  function finishAndClose(session, value) {
    if (session !== activeSession) return;
    activeSession = null;
    if (dialog.open) dialog.close("selected");
    session.resolve?.(value);
  }

  function setBusy(session, busy) {
    if (session !== activeSession) return;
    session.submitting = busy;
    const form = dialog.querySelector("form");
    form?.setAttribute("aria-busy", String(busy));
    form?.querySelectorAll("button,input,select").forEach((control) => { control.disabled = busy; });
    const submitButton = form?.querySelector('[type="submit"]');
    if (submitButton) submitButton.textContent = busy ? "Enviando..." : "Usar Imagem";
  }

  function showError(message) {
    const error = dialog.querySelector("[data-media-error]");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    const error = dialog.querySelector("[data-media-error]");
    if (!error) return;
    error.textContent = "";
    error.hidden = true;
  }

  async function commit(document) {
    const serialized = JSON.stringify(document);
    const unused = [...stagedUploads].filter((id) => !serialized.includes(id));
    await deleteUploads(unused);
    stagedUploads.clear();
  }

  async function cancel() {
    await deleteUploads([...stagedUploads]);
    stagedUploads.clear();
  }

  async function deleteUploads(ids) {
    const csrf = auth.getSession()?.csrfToken;
    if (!csrf) return;
    await Promise.allSettled(ids.map((id) => api.deleteMedia(id, csrf)));
  }
}

function renderDialog(current) {
  return `<form method="dialog" class="media-form" novalidate><button type="button" class="dialog-close" data-media-cancel aria-label="Fechar">×</button><small>Imagem de Capa</small><h2 id="media-dialog-title">Escolher uma Imagem</h2><p class="media-error" data-media-error role="alert" hidden></p><label>Enviar JPEG, PNG ou WebP <span class="media-limit">Máximo de 8 MB e 20 megapixels</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp"></label><span class="form-divider">ou</span><label>URL HTTPS da Imagem<input type="url" name="url" value="${escapeHtml(current?.url ?? "")}" placeholder="https://..."></label><label>Texto Alternativo<input name="alt" value="${escapeHtml(current?.alt ?? "")}" placeholder="Descreva a imagem"></label><label>Posição do Foco<select name="position">${positionOptions(current?.position)}</select></label><div class="dialog-actions"><button type="button" data-media-remove>Remover</button><button type="submit">Usar Imagem</button></div></form>`;
}

function positionOptions(selected = "center") {
  const labels = { center: "Centro", top: "Topo", bottom: "Base", left: "Esquerda", right: "Direita" };
  return ["center", "top", "bottom", "left", "right"]
    .map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${labels[value]}</option>`)
    .join("");
}
