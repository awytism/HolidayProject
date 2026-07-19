import { escapeHtml, safeAssetUrl, safeUrl } from "../utils/html.js";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function createImagePicker(api, auth, showToast, translate = (value) => value) {
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
    dialog.innerHTML = renderDialog(current, translate);
    dialog.showModal();
    return new Promise((resolve) => { session.resolve = resolve; });
  }

  function handleClick(event) {
    const session = activeSession;
    if (event.target.closest("[data-media-cancel]") && session && !session.submitting) finishAndClose(session, undefined);
    if (event.target.closest("[data-media-remove]") && session && !session.submitting) {
      finishAndClose(session, null);
      showToast("Cover image removed. Save your changes to keep this update.");
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
      showToast("Cover image applied. Save your changes to keep it.");
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
    if (file?.size) return uploadSelectedFile(file, alt, position);
    return selectedUrl(form, alt, position);
  }

  async function uploadSelectedFile(file, alt, position) {
    if (file.size > MAX_UPLOAD_BYTES) throw new TypeError(translate("The image must be 8 MB or smaller"));
    const uploaded = await api.uploadMedia(file, auth.getSession().csrfToken);
    stagedUploads.add(uploaded.id);
    return { mediaId: uploaded.id, alt, position };
  }

  function selectedUrl(form, alt, position) {
    const source = String(form.get("url") ?? "");
    const url = safeAssetUrl(source) || safeUrl(source);
    if (!url || !(url.startsWith("https://") || url.startsWith("/assets/"))) {
      throw new TypeError(translate("Enter an HTTPS image URL or choose a file"));
    }
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
    if (submitButton) submitButton.textContent = translate(busy ? "Uploading..." : "Use Image");
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

function renderDialog(current, translate) {
  const label = (value) => escapeHtml(translate(value));
  return `<form method="dialog" class="media-form" novalidate><button type="button" class="dialog-close" data-media-cancel aria-label="${label("Close")}">×</button><small>${label("Cover Image")}</small><h2 id="media-dialog-title">${label("Choose an Image")}</h2><p class="media-error" data-media-error role="alert" hidden></p><label>${label("Upload JPEG, PNG or WebP")} <span class="media-limit">${label("Maximum 8 MB and 20 megapixels")}</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp"></label><span class="form-divider">${label("or")}</span><label>${label("Image HTTPS URL")}<input type="url" name="url" value="${escapeHtml(current?.url ?? "")}" placeholder="https://..."></label><label>${label("Alternative Text")}<input name="alt" value="${escapeHtml(current?.alt ?? "")}" placeholder="${label("Describe the image")}"></label><label>${label("Focus Position")}<select name="position">${positionOptions(current?.position, translate)}</select></label><div class="dialog-actions"><button type="button" data-media-remove>${label("Remove")}</button><button type="submit">${label("Use Image")}</button></div></form>`;
}

function positionOptions(selected = "center", translate = (value) => value) {
  const labels = { center: "Centre", top: "Top", bottom: "Bottom", left: "Left", right: "Right" };
  return ["center", "top", "bottom", "left", "right"]
    .map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(translate(labels[value]))}</option>`)
    .join("");
}
