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
      showToast("Cover image removed. Save changes to keep this update.");
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
      showToast("Cover image applied. Save changes to keep it.");
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
      if (file.size > MAX_UPLOAD_BYTES) throw new TypeError("Image must be 8 MB or smaller");
      const uploaded = await api.uploadMedia(file, auth.getSession().csrfToken);
      stagedUploads.add(uploaded.id);
      return { mediaId: uploaded.id, alt, position };
    }
    const url = safeUrl(String(form.get("url") ?? ""));
    if (!url || !url.startsWith("https://")) throw new TypeError("Enter an HTTPS image URL or choose a file");
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
    if (submitButton) submitButton.textContent = busy ? "Uploading..." : "Use Image";
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
  return `<form method="dialog" class="media-form" novalidate><button type="button" class="dialog-close" data-media-cancel aria-label="Close">×</button><small>Cover Image</small><h2 id="media-dialog-title">Choose an Image</h2><p class="media-error" data-media-error role="alert" hidden></p><label>Upload JPEG, PNG, or WebP <span class="media-limit">Maximum 8 MB and 20 megapixels</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp"></label><span class="form-divider">or</span><label>HTTPS Image URL<input type="url" name="url" value="${escapeHtml(current?.url ?? "")}" placeholder="https://..."></label><label>Alternative Text<input name="alt" value="${escapeHtml(current?.alt ?? "")}" placeholder="Describe the image"></label><label>Focal Position<select name="position">${positionOptions(current?.position)}</select></label><div class="dialog-actions"><button type="button" data-media-remove>Remove</button><button type="submit">Use Image</button></div></form>`;
}

function positionOptions(selected = "center") {
  return ["center", "top", "bottom", "left", "right"]
    .map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value[0].toUpperCase()}${value.slice(1)}</option>`)
    .join("");
}
