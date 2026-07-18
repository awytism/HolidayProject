import { ApiError } from "../services/api.js";
import { renderActionIcon } from "../ui/icon-registry.js";
import { escapeHtml } from "../utils/html.js";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export function createAttachmentController(api, auth, showToast) {
  const sections = new Map();
  const loaded = new Set();
  const expandedPanels = new Set();
  const dialogs = createDialogs();
  let unlocked = false;
  let rerender = () => {};
  let actionAttachment = null;
  let viewerItems = [];
  let viewerIndex = 0;
  let zoom = 1;
  let returnFocus = null;
  let openingViewer = false;

  bindDialogs();

  return {
    bind(root, render) {
      rerender = render;
      root.addEventListener("click", handleClick);
      root.addEventListener("change", handleFileChange);
    },
    render(blockId, section, editing) {
      return renderAttachments(blockId, section, editing);
    },
    async unlock(_session, section) {
      unlocked = true;
      await loadSection(section, true);
    },
    lock() {
      unlocked = false;
      sections.clear();
      loaded.clear();
      expandedPanels.clear();
      closeDialogs();
    },
    async ensureSection(section) {
      if (!unlocked || loaded.has(section)) return;
      await loadSection(section);
      rerender();
    },
    async refresh(section) {
      if (!unlocked) return;
      await loadSection(section, true);
      rerender();
    },
    confirmBlockDeletion(section, blockId) {
      const count = attachmentsFor(section, blockId).length;
      const suffix = count === 0 ? "" : ` and permanently delete ${count} attachment${count === 1 ? "" : "s"}`;
      return window.confirm(`Delete this content block${suffix}?`);
    },
  };

  async function handleClick(event) {
    const unlock = event.target.closest("[data-attachment-unlock]");
    if (unlock) return unlockAttachments(unlock.dataset.section, unlock.dataset.blockId, unlock);
    const toggle = event.target.closest("[data-attachment-toggle]");
    if (toggle) return toggleAttachments(toggle.dataset.section, toggle.dataset.blockId, toggle);
    const open = event.target.closest("[data-attachment-open]");
    if (open) return openActions(open.dataset.attachmentOpen, open);
    const action = event.target.closest("[data-attachment-action]");
    if (!action) return;
    const attachment = findAttachment(action.dataset.attachmentId);
    if (!attachment) return;
    if (action.dataset.attachmentAction === "rename") await renameAttachment(attachment);
    if (action.dataset.attachmentAction === "delete") await deleteAttachment(attachment);
  }

  async function handleFileChange(event) {
    const input = event.target.closest("[data-attachment-upload],[data-attachment-replace]");
    const file = input?.files?.[0];
    if (!input || !file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      input.value = "";
      showToast("Attachments must be 50 MB or smaller");
      return;
    }
    input.disabled = true;
    try {
      const session = await requireSession();
      if (!session) return;
      if (input.dataset.attachmentUpload !== undefined) {
        await api.uploadAttachment(input.dataset.section, input.dataset.blockId, file, session.csrfToken);
        showToast(`${file.name} attached`);
        await loadSection(input.dataset.section, true);
      } else {
        const attachment = findAttachment(input.dataset.attachmentReplace);
        await api.replaceAttachment(attachment.id, file, session.csrfToken);
        showToast(`${attachment.name} replaced`);
        await loadSection(attachment.section, true);
      }
      rerender();
    } catch (error) {
      handleAttachmentError(error);
    } finally {
      input.value = "";
      input.disabled = false;
    }
  }

  async function unlockAttachments(section, blockId, trigger) {
    const viewportTop = trigger.getBoundingClientRect().top;
    try {
      const session = await auth.ensureAuthenticated();
      if (!session) return;
      unlocked = true;
      await loadSection(section, true);
      expandedPanels.add(panelKey(section, blockId));
      rerender();
      restoreDisclosureAfterRender(section, blockId, viewportTop);
    } catch (error) {
      handleAttachmentError(error);
    }
  }

  function toggleAttachments(section, blockId, button) {
    const key = panelKey(section, blockId);
    const container = button.closest(".attachment-section");
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (expandedPanels.has(key)) {
      expandedPanels.delete(key);
      container.querySelector(":scope > .attachment-panel")?.remove();
      container.classList.remove("is-expanded");
      container.classList.add("is-collapsed");
      button.setAttribute("aria-expanded", "false");
    } else {
      expandedPanels.add(key);
      container.insertAdjacentHTML("beforeend", renderAttachmentPanel(blockId, section, document.body.classList.contains("is-editing")));
      container.classList.remove("is-collapsed");
      container.classList.add("is-expanded");
      button.setAttribute("aria-expanded", "true");
    }
    window.scrollTo(scrollX, scrollY);
    button.focus({ preventScroll: true });
  }

  async function loadSection(section, force = false) {
    if (!force && loaded.has(section)) return;
    try {
      const response = await api.listAttachments(section);
      sections.set(section, response.attachments.map((attachment) => ({ ...attachment, section })));
      loaded.add(section);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        unlocked = false;
        loaded.clear();
        sections.clear();
        expandedPanels.clear();
      }
      throw error;
    }
  }

  function renderAttachments(blockId, section, editing) {
    if (!unlocked || !loaded.has(section)) {
      return `<section class="attachment-section is-locked is-collapsed"><button class="attachment-summary" type="button" data-attachment-unlock data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(blockId)}" aria-expanded="false">${renderActionIcon("file")}<span class="attachment-summary-copy"><strong>Attachments</strong><small>Unlock to view</small></span><span class="attachment-summary-chevron" aria-hidden="true">${renderActionIcon("arrow-down")}</span></button></section>`;
    }
    const attachments = attachmentsFor(section, blockId);
    const expanded = expandedPanels.has(panelKey(section, blockId));
    const count = `${attachments.length} file${attachments.length === 1 ? "" : "s"}`;
    const summary = `<button class="attachment-summary" type="button" data-attachment-toggle data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(blockId)}" aria-expanded="${expanded}">${renderActionIcon("file")}<span class="attachment-summary-copy"><strong>Attachments</strong><small>${count}</small></span><span class="attachment-summary-chevron" aria-hidden="true">${renderActionIcon("arrow-down")}</span></button>`;
    if (!expanded) return `<section class="attachment-section is-collapsed">${summary}</section>`;
    return `<section class="attachment-section is-expanded">${summary}${renderAttachmentPanel(blockId, section, editing)}</section>`;
  }

  function renderAttachmentPanel(blockId, section, editing) {
    const attachments = attachmentsFor(section, blockId);
    const rows = attachments.length
      ? attachments.map((attachment) => renderAttachmentRow(attachment, editing)).join("")
      : '<p class="attachment-empty">No attachments yet.</p>';
    const upload = editing ? `<div class="attachment-upload-group"><label class="attachment-upload">${renderActionIcon("upload")}<span>Add Attachment</span><input type="file" data-attachment-upload data-section="${section}" data-block-id="${escapeHtml(blockId)}"></label><small>Up to 50 MB per file</small></div>` : "";
    const actions = upload ? `<div class="attachment-panel-actions">${upload}</div>` : "";
    return `<div class="attachment-panel">${actions}<div class="attachment-list">${rows}</div></div>`;
  }

  function renderAttachmentRow(attachment, editing) {
    const editControls = editing ? `<span class="attachment-edit-controls">${attachmentIconButton("rename", "Rename Attachment", "pencil", attachment.id)}<label class="toolbar-icon attachment-replace" data-tooltip="Replace Attachment" aria-label="Replace Attachment">${renderActionIcon("replace")}<input type="file" data-attachment-replace="${attachment.id}"></label>${attachmentIconButton("delete", "Delete Attachment", "trash", attachment.id)}</span>` : "";
    return `<article class="attachment-row"><button class="attachment-open" type="button" data-attachment-open="${attachment.id}">${renderActionIcon("file")}<span><strong>${escapeHtml(attachment.name)}</strong><small>${formatBytes(attachment.byteSize)} · ${escapeHtml(displayType(attachment))}</small></span></button>${editControls}</article>`;
  }

  function attachmentIconButton(action, label, icon, id) {
    const alignment = action === "delete" ? ' data-tooltip-align="end"' : "";
    return `<button class="toolbar-icon" type="button" data-attachment-action="${action}" data-attachment-id="${id}" data-tooltip="${label}" aria-label="${label}"${alignment}>${renderActionIcon(icon)}</button>`;
  }

  async function renameAttachment(attachment) {
    const name = window.prompt("Attachment name", attachment.name);
    if (name === null || name.trim() === attachment.name) return;
    try {
      const session = await requireSession();
      if (!session) return;
      await api.renameAttachment(attachment.id, name, session.csrfToken);
      await loadSection(attachment.section, true);
      rerender();
      showToast("Attachment renamed");
    } catch (error) { handleAttachmentError(error); }
  }

  async function deleteAttachment(attachment) {
    if (!window.confirm(`Permanently delete ${attachment.name}?`)) return;
    try {
      const session = await requireSession();
      if (!session) return;
      await api.deleteAttachment(attachment.id, session.csrfToken);
      await loadSection(attachment.section, true);
      rerender();
      showToast("Attachment deleted");
    } catch (error) { handleAttachmentError(error); }
  }

  async function requireSession() {
    const existing = auth.getSession();
    if (existing?.authenticated) return existing;
    return auth.ensureAuthenticated();
  }

  function openActions(id, trigger) {
    actionAttachment = findAttachment(id);
    if (!actionAttachment) return;
    returnFocus = trigger;
    dialogs.actionName.textContent = actionAttachment.name;
    dialogs.view.disabled = !actionAttachment.previewable;
    dialogs.view.title = actionAttachment.previewable ? "View attachment" : "Preview unavailable for this file type";
    dialogs.action.showModal();
    dialogs.view.focus();
  }

  async function openViewer() {
    if (!actionAttachment?.previewable) return;
    viewerItems = attachmentsFor(actionAttachment.section, actionAttachment.blockId).filter((item) => item.previewable);
    viewerIndex = Math.max(0, viewerItems.findIndex((item) => item.id === actionAttachment.id));
    openingViewer = true;
    dialogs.action.close();
    dialogs.viewer.showModal();
    openingViewer = false;
    await showViewerItem();
  }

  async function showViewerItem() {
    const attachment = viewerItems[viewerIndex];
    if (!attachment) return;
    zoom = 1;
    dialogs.zoomStatus.textContent = "100%";
    dialogs.viewerName.textContent = attachment.name;
    dialogs.previous.disabled = viewerIndex === 0;
    dialogs.next.disabled = viewerIndex === viewerItems.length - 1;
    dialogs.zoomIn.disabled = attachment.previewKind === "pdf" || ["audio", "video"].includes(attachment.previewKind);
    dialogs.zoomOut.disabled = dialogs.zoomIn.disabled;
    dialogs.viewerBody.replaceChildren();
    const url = api.attachmentContentUrl(attachment.id, true);
    if (attachment.previewKind === "text") {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
      const pre = document.createElement("pre");
      pre.textContent = await response.text();
      dialogs.viewerBody.append(pre);
      return;
    }
    const element = createPreviewElement(attachment, url);
    dialogs.viewerBody.append(element);
  }

  function createPreviewElement(attachment, url) {
    if (attachment.previewKind === "image") {
      const image = document.createElement("img");
      image.src = url;
      image.alt = attachment.name;
      return image;
    }
    if (attachment.previewKind === "pdf") {
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = attachment.name;
      return frame;
    }
    const media = document.createElement(attachment.previewKind);
    media.src = url;
    media.controls = true;
    media.preload = "metadata";
    return media;
  }

  function changeViewerItem(offset) {
    const next = Math.max(0, Math.min(viewerItems.length - 1, viewerIndex + offset));
    if (next === viewerIndex) return;
    viewerIndex = next;
    showViewerItem().catch(handleAttachmentError);
  }

  function changeZoom(delta) {
    zoom = Math.max(0.5, Math.min(3, zoom + delta));
    const content = dialogs.viewerBody.firstElementChild;
    if (content) content.style.transform = `scale(${zoom})`;
    dialogs.zoomStatus.textContent = `${Math.round(zoom * 100)}%`;
  }

  function downloadSelected() {
    if (!actionAttachment) return;
    const link = document.createElement("a");
    link.href = api.attachmentContentUrl(actionAttachment.id);
    link.download = actionAttachment.name;
    document.body.append(link);
    link.click();
    link.remove();
    dialogs.action.close();
  }

  function bindDialogs() {
    dialogs.view.addEventListener("click", () => openViewer().catch(handleAttachmentError));
    dialogs.download.addEventListener("click", downloadSelected);
    dialogs.actionClose.addEventListener("click", () => dialogs.action.close());
    dialogs.viewerClose.addEventListener("click", () => dialogs.viewer.close());
    dialogs.previous.addEventListener("click", () => changeViewerItem(-1));
    dialogs.next.addEventListener("click", () => changeViewerItem(1));
    dialogs.zoomIn.addEventListener("click", () => changeZoom(0.25));
    dialogs.zoomOut.addEventListener("click", () => changeZoom(-0.25));
    dialogs.action.addEventListener("close", () => {
      if (!openingViewer) restoreFocus();
    });
    dialogs.viewer.addEventListener("close", restoreFocus);
  }

  function restoreFocus() {
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function closeDialogs() {
    if (dialogs.action.open) dialogs.action.close();
    if (dialogs.viewer.open) dialogs.viewer.close();
  }

  function attachmentsFor(section, blockId) {
    return (sections.get(section) ?? []).filter((attachment) => attachment.blockId === blockId);
  }

  function findAttachment(id) {
    return [...sections.values()].flat().find((attachment) => attachment.id === id);
  }

  function handleAttachmentError(error) {
    if (error instanceof ApiError && error.status === 401) {
      unlocked = false;
      loaded.clear();
      sections.clear();
      expandedPanels.clear();
      rerender();
      showToast("Your attachment session expired. Unlock again.");
      return;
    }
    showToast(error.message ?? "Attachment action failed");
  }

  function restoreDisclosureAfterRender(section, blockId, viewportTop) {
    window.queueMicrotask(() => {
      const button = [...document.querySelectorAll("[data-attachment-toggle]")]
        .find((candidate) => candidate.dataset.section === section && candidate.dataset.blockId === blockId);
      if (!button) return;
      const offset = button.getBoundingClientRect().top - viewportTop;
      if (Math.abs(offset) > 0.5) window.scrollBy(0, offset);
      button.focus({ preventScroll: true });
    });
  }
}

function panelKey(section, blockId) {
  return `${section}\u0000${blockId}`;
}

function createDialogs() {
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="attachment-action-dialog" aria-labelledby="attachmentActionName">
      <button class="dialog-close" type="button" data-attachment-action-close aria-label="Close">×</button>
      <small>Protected Attachment</small>
      <h2 id="attachmentActionName"></h2>
      <div class="attachment-choice-row">
        <button type="button" data-attachment-view>${renderActionIcon("eye")}<span>View</span></button>
        <button type="button" data-attachment-download>${renderActionIcon("download")}<span>Download</span></button>
      </div>
    </dialog>
    <dialog class="attachment-viewer" aria-labelledby="attachmentViewerName">
      <header>
        <div><small>Attachment Preview</small><strong id="attachmentViewerName"></strong></div>
        <nav aria-label="Attachment Preview Controls">
          <button type="button" data-viewer-previous aria-label="Previous Attachment">${renderActionIcon("arrow-left")}</button>
          <button type="button" data-viewer-next aria-label="Next Attachment">${renderActionIcon("arrow-right")}</button>
          <button type="button" data-viewer-zoom-out aria-label="Zoom Out">${renderActionIcon("zoom-out")}</button>
          <span data-viewer-zoom-status>100%</span>
          <button type="button" data-viewer-zoom-in aria-label="Zoom In">${renderActionIcon("zoom-in")}</button>
          <button type="button" data-viewer-close aria-label="Close Preview">×</button>
        </nav>
      </header>
      <div class="attachment-viewer-body"></div>
    </dialog>`);
  const action = document.querySelector(".attachment-action-dialog");
  const viewer = document.querySelector(".attachment-viewer");
  return {
    action,
    actionName: action.querySelector("#attachmentActionName"),
    actionClose: action.querySelector("[data-attachment-action-close]"),
    view: action.querySelector("[data-attachment-view]"),
    download: action.querySelector("[data-attachment-download]"),
    viewer,
    viewerName: viewer.querySelector("#attachmentViewerName"),
    viewerBody: viewer.querySelector(".attachment-viewer-body"),
    viewerClose: viewer.querySelector("[data-viewer-close]"),
    previous: viewer.querySelector("[data-viewer-previous]"),
    next: viewer.querySelector("[data-viewer-next]"),
    zoomIn: viewer.querySelector("[data-viewer-zoom-in]"),
    zoomOut: viewer.querySelector("[data-viewer-zoom-out]"),
    zoomStatus: viewer.querySelector("[data-viewer-zoom-status]"),
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function displayType(attachment) {
  if (attachment.previewKind) return attachment.previewKind.toUpperCase();
  const extension = attachment.name.includes(".") ? attachment.name.split(".").at(-1) : "file";
  return extension.toUpperCase();
}
