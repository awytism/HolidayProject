import { escapeHtml, initials, safeUrl } from "../utils/html.js";
import { renderActionIcon } from "../ui/icon-registry.js";

const PRIORITIES = ["high", "medium", "low"];

export function editField(label, field, value, options = {}) {
  const tag = options.multiline ? "textarea" : "input";
  const className = options.full ? "full-field" : "";
  const attributes = `data-block-field="${escapeHtml(field)}" aria-label="${escapeHtml(label)}"`;
  const control = tag === "textarea"
    ? `<textarea ${attributes}>${escapeHtml(value)}</textarea>`
    : `<input type="${options.type ?? "text"}" value="${escapeHtml(value)}" ${attributes}>`;
  return `<label class="${className}">${escapeHtml(label)}${control}</label>`;
}

export function renderNote(block, editing) {
  if (editing) {
    return `<div class="content-block edit-form">${editField("Title", "title", block.data.title)}${editField("Note", "text", block.data.text, { multiline: true, full: true })}</div>`;
  }
  return `<article class="content-block note-block"><h3>${escapeHtml(block.data.title)}</h3><p>${escapeHtml(block.data.text)}</p></article>`;
}

export function renderPlace(place) {
  const image = renderEntryImage(place);
  const comment = place.comment ? `<small>${escapeHtml(place.comment)}</small>` : "";
  return `<div class="place-row priority-${escapeHtml(place.priority)}"><span class="place-media"><span>${escapeHtml(initials(place.name))}</span>${image}</span><span class="place-copy"><strong>${escapeHtml(place.name)}</strong>${comment}${renderPriorityBadge(place.priority)}</span>${renderEntryLinks(place, place.name)}</div>`;
}

export function renderPlaceEditor(place) {
  return `<div class="place-editor" data-place-id="${escapeHtml(place.id)}"><div class="place-editor-fields"><input value="${escapeHtml(place.name)}" data-place-field="name" aria-label="Place Name" placeholder="Place Name"><input type="url" value="${escapeHtml(place.mapUrl)}" data-place-field="mapUrl" placeholder="Maps URL" aria-label="Maps URL"><input type="url" value="${escapeHtml(place.websiteUrl)}" data-place-field="websiteUrl" placeholder="Website URL" aria-label="Website URL"><textarea data-place-field="comment" placeholder="Comment" aria-label="Place Comment">${escapeHtml(place.comment)}</textarea></div>${renderPriorityControl("place", place.priority)}<div class="nested-toolbar" aria-label="Place Controls">${placeActionButton("cover", "Cover Image", "image")}${placeActionButton("up", "Move Up", "arrow-up")}${placeActionButton("down", "Move Down", "arrow-down")}${placeActionButton("delete", "Delete Place", "trash")}</div></div>`;
}

export function renderEntryImage(entry) {
  const imageUrl = mediaUrl(entry.cover) || safeUrl(entry.image);
  if (!imageUrl) return "";
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.cover?.alt ?? "")}" referrerpolicy="no-referrer" loading="lazy">`;
}

export function renderEntryLinks(entry, name) {
  const mapUrl = safeUrl(entry.mapUrl);
  const websiteUrl = safeUrl(entry.websiteUrl);
  const map = entryLink(mapUrl, `Open ${name} in Maps`, "map-pin", "map-link");
  const website = entryLink(websiteUrl, `Open ${name} Website`, "external-link", "website-link");
  return map || website ? `<span class="entry-links">${map}${website}</span>` : "";
}

export function renderPriorityBadge(priority = "medium") {
  const value = PRIORITIES.includes(priority) ? priority : "medium";
  return `<span class="priority-badge priority-${value}">${priorityLabel(value)}</span>`;
}

export function renderPriorityControl(kind, priority = "medium") {
  const buttons = PRIORITIES.map((value) => {
    const selected = value === priority;
    return `<button type="button" data-${kind}-action="priority" data-priority="${value}" aria-pressed="${selected}" class="priority-${value}${selected ? " is-selected" : ""}">${priorityLabel(value)}</button>`;
  }).join("");
  return `<div class="priority-control" role="group" aria-label="Priority">${buttons}</div>`;
}

function placeActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-place-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function entryLink(url, label, icon, className) {
  if (!url) return "";
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${renderActionIcon(icon)}</a>`;
}

function priorityLabel(priority) {
  return `${priority[0].toUpperCase()}${priority.slice(1)}`;
}

export function newNote(section) {
  return { id: `${section}-${crypto.randomUUID()}`, type: "note", cover: null, data: { title: "New Note", text: "Add details here." } };
}

export function renderCover(cover) {
  const url = mediaUrl(cover);
  if (!url) return "";
  const position = ["center", "top", "bottom", "left", "right"].includes(cover.position) ? cover.position : "center";
  return `<div class="block-cover position-${position}"><img src="${escapeHtml(url)}" alt="${escapeHtml(cover.alt)}" referrerpolicy="no-referrer" loading="lazy"></div>`;
}

function mediaUrl(media) {
  if (media?.mediaId) return `/api/media/${encodeURIComponent(media.mediaId)}`;
  return media?.url ? safeUrl(media.url) : "";
}
