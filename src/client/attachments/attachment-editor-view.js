import { renderActionIcon } from "../ui/icon-registry.js";
import { escapeHtml } from "../utils/html.js";

export function renderAttachmentEditorContent({ attachments, section, blockId, translate, formatBytes, displayType }) {
  const rows = attachments.length
    ? attachments.map((attachment) => renderAttachmentEditorRow(attachment, translate, formatBytes, displayType)).join("")
    : `<p class="attachment-editor-empty">${translate("No documents added yet.")}</p>`;
  return `<div class="attachment-editor-upload"><label class="attachment-upload">${renderActionIcon("upload")}<span>${translate("Add document")}</span><input type="file" data-attachment-upload data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(blockId)}"></label><small>${translate("Up to 50 MB per file")}</small></div><div class="attachment-editor-list">${rows}</div>`;
}

function renderAttachmentEditorRow(attachment, translate, formatBytes, displayType) {
  const replaceLabel = translate("Replace document");
  const deleteLabel = translate("Delete document");
  return `<article class="attachment-editor-row"><span class="attachment-editor-file">${renderActionIcon("file")}<span><strong>${escapeHtml(attachment.name)}</strong><small>${formatBytes(attachment.byteSize)} · ${escapeHtml(displayType(attachment))}</small></span></span><span class="attachment-edit-controls"><label class="toolbar-icon attachment-replace" aria-label="${escapeHtml(replaceLabel)}" title="${escapeHtml(replaceLabel)}">${renderActionIcon("replace")}<input type="file" data-attachment-replace="${escapeHtml(attachment.id)}"></label><button class="toolbar-icon" type="button" data-attachment-action="delete" data-attachment-id="${escapeHtml(attachment.id)}" aria-label="${escapeHtml(deleteLabel)}" title="${escapeHtml(deleteLabel)}">${renderActionIcon("trash")}</button></span></article>`;
}
