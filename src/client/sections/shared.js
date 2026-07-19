import { escapeHtml, initials, safeAssetUrl, safeUrl } from "../utils/html.js";
import { formatDurationUnits } from "../../shared/duration-utils.mjs";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_LABELS = Object.freeze({ high: "High", medium: "Medium", low: "Low" });
const TRAVEL_ROUTE_MODES = Object.freeze([
  { key: "driving", label: "Driving", icon: "car" },
  { key: "cycling", label: "Cycling", icon: "bike" },
  { key: "walking", label: "Walking", icon: "walking" },
]);

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
    return `<div class="content-block edit-form">${editField("Título", "title", block.data.title)}${editField("Nota", "text", block.data.text, { multiline: true, full: true })}</div>`;
  }
  return `<article class="content-block note-block"><h3>${escapeHtml(block.data.title)}</h3><p>${escapeHtml(block.data.text)}</p></article>`;
}

export function renderPlace(place, options = {}) {
  const image = renderEntryImage(place);
  const hasComment = Boolean(String(place.comment ?? "").trim());
  const comment = hasComment ? `<small class="place-comment">${escapeHtml(place.comment)}</small>` : "";
  const routes = options.showRoutes === false ? "" : renderPlaceRouteToggle(place);
  const links = renderEntryLinks(place, place.name, options.extraLink ?? "", {
    showMissing: options.showMissingLinks === true,
  });
  const priority = normalizePriority(place.priority);
  const heading = `<span class="agenda-place-heading"><span class="place-media"><span>${escapeHtml(initials(place.name))}</span>${image}</span><span class="agenda-place-heading-copy"><span class="place-copy"><strong>${escapeHtml(place.name)}</strong></span>${renderPriorityBadge(priority)}</span></span>`;
  const footer = routes || links ? `<div class="agenda-place-footer">${links}${routes}</div>` : "";
  return `<div class="place-row priority-${priority}${hasComment ? " has-comment" : ""}${routes ? " has-routes" : ""}" data-inline-image-entry="place" data-inline-image-id="${escapeHtml(place.id)}"><div class="agenda-place-main">${heading}${comment}</div>${footer}</div>`;
}

export function renderPlaceEditor(place, options = {}) {
  const routeEditor = renderDistanceEditor(place, "place");
  const category = options.showCategory ? renderPlaceCategory(place.category) : "";
  return `<div class="place-editor" data-place-id="${escapeHtml(place.id)}"><div class="place-editor-fields">${category}<input value="${escapeHtml(place.name)}" data-place-field="name" aria-label="Nome do lugar" placeholder="Nome do lugar"><input type="url" value="${escapeHtml(place.mapUrl)}" data-place-field="mapUrl" placeholder="URL do Google Maps" aria-label="URL do Google Maps"><input type="url" value="${escapeHtml(place.websiteUrl)}" data-place-field="websiteUrl" placeholder="URL do site" aria-label="URL do site"><textarea data-place-field="comment" placeholder="Descrição" aria-label="Descrição">${escapeHtml(place.comment)}</textarea>${routeEditor}</div><div class="editor-entry-actions">${renderPriorityControl("place", place.priority)}<button class="editor-remove-button" type="button" data-place-action="delete">Remove Place</button></div><div class="nested-toolbar" aria-label="Controles do lugar">${placeActionButton("cover", "Imagem de capa", "image")}${placeActionButton("up", "Mover para cima", "arrow-up")}${placeActionButton("down", "Mover para baixo", "arrow-down")}${placeActionButton("delete", "Excluir lugar", "trash")}</div></div>`;
}

function renderPlaceCategory(category) {
  const value = category === "landmark" ? "landmark" : "restaurant";
  return `<label class="place-category-field">Category<select data-place-field="category" aria-label="Place category"><option value="restaurant"${value === "restaurant" ? " selected" : ""}>Restaurant</option><option value="landmark"${value === "landmark" ? " selected" : ""}>Landmark</option></select></label>`;
}

function placeRouteValue(place, mode) {
  return meaningfulRouteValue(formatDurationUnits(place[`${mode}Time`]));
}

function renderPlaceRouteToggle(place) {
  return renderTravelModeToggle(place, placeRouteValue, "place-route-toggle");
}

export function renderMealRouteToggle(option) {
  return renderTravelModeToggle(option, (entry, mode) => meaningfulRouteValue(entry[`${mode}Time`]));
}

function renderTravelModeToggle(entry, valueForMode, extraClass = "") {
  const availableModes = TRAVEL_ROUTE_MODES
    .map((mode) => ({ ...mode, value: valueForMode(entry, mode.key) }))
    .filter(({ value }) => value);
  if (!availableModes.length) return "";
  const modes = availableModes.map(({ key, label, icon, value }, index) => {
    const hidden = index === 0 ? "" : " hidden";
    return `<span class="meal-route-option" data-meal-route-option data-route-mode="${key}" data-route-label="${label}"${hidden}><span class="meal-route-glyph" aria-hidden="true">${renderIcon(icon)}</span><span class="meal-route-value">${escapeHtml(value)}</span></span>`;
  }).join("");
  const firstMode = availableModes[0];
  const className = `meal-route-toggle${extraClass ? ` ${extraClass}` : ""}`;
  if (availableModes.length === 1) {
    return `<span class="${className} is-static" data-mode="${firstMode.key}" title="${firstMode.label}">${modes}</span>`;
  }
  return `<button class="${className}" type="button" data-meal-route-toggle data-mode="${firstMode.key}" aria-label="Change travel mode" title="Change travel mode">${modes}</button>`;
}

function meaningfulRouteValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const numbers = text.match(/-?\d+(?:[.,]\d+)?/g);
  if (numbers?.length && numbers.every((number) => Number(number.replace(",", ".")) === 0)) return "";
  return text;
}

export function renderDistanceEditor(entry, kind) {
  const modes = TRAVEL_ROUTE_MODES.map(({ key: mode, label }) => {
    const distance = escapeHtml(entry[`${mode}Distance`] ?? "");
    const time = escapeHtml(formatDurationUnits(entry[`${mode}Time`]));
    return `<fieldset class="place-route-editor-mode"><legend>${label}</legend><input value="${distance}" data-${kind}-field="${mode}Distance" placeholder="Distance" aria-label="${label} distance"><input value="${time}" data-${kind}-field="${mode}Time" placeholder="Time" aria-label="${label} time"></fieldset>`;
  }).join("");
  return `<fieldset class="place-route-editor"><legend>Distance from Main Accommodation</legend>${modes}</fieldset>`;
}

export function renderEntryImage(entry) {
  const imageUrl = mediaUrl(entry.cover) || safeUrl(entry.image);
  if (!imageUrl) return "";
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.cover?.alt ?? "")}" referrerpolicy="no-referrer" loading="lazy">`;
}

export function renderEntryLinks(entry, name, extra = "", options = {}) {
  const mapUrl = safeUrl(entry.mapUrl);
  const websiteUrl = safeUrl(entry.websiteUrl);
  const editable = options.editable !== false;
  const map = entryLink({ url: mapUrl, label: `Abrir ${name} no Google Maps`, icon: "map-pin", className: "map-link", field: "mapUrl", showMissing: options.showMissing, editable });
  const website = entryLink({ url: websiteUrl, label: `Abrir site de ${name}`, icon: "external-link", className: "website-link", field: "websiteUrl", showMissing: options.showMissing, editable });
  return map || website || extra ? `<span class="entry-links">${map}${website}${extra}</span>` : "";
}

export function renderPriorityBadge(priority = "medium") {
  const value = normalizePriority(priority);
  return `<span class="place-priority-pill priority-${value}" aria-label="${priorityLabel(value)} priority">${priorityLabel(value)}</span>`;
}

function normalizePriority(priority) {
  return PRIORITIES.includes(priority) ? priority : "medium";
}

export function renderPriorityControl(kind, priority = "medium") {
  const normalized = normalizePriority(priority);
  const options = PRIORITIES.map((value) => {
    const selected = value === normalized;
    return `<button type="button" data-${kind}-action="priority" data-priority="${value}" aria-pressed="${selected}" class="priority-option priority-${value}${selected ? " is-selected" : ""}">${priorityLabel(value)}</button>`;
  }).join("");
  return `<div class="priority-field priority-${normalized}"><span>Priority</span><details class="priority-picker"><summary aria-label="Priority">${priorityLabel(normalized)}</summary><div class="priority-options" role="group" aria-label="Priority">${options}</div></details></div>`;
}

function placeActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-place-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function entryLink({ url, label, icon, className, field, showMissing = false, editable = true }) {
  const editorAttributes = editable ? ` data-inline-link-field="${field}" data-inline-ignore` : "";
  if (!url) {
    if (!showMissing) return "";
    const unavailableLabel = `${label} — link não adicionado`;
    return `<span class="${className} is-unavailable" role="img" aria-label="${escapeHtml(unavailableLabel)}" title="${escapeHtml(unavailableLabel)}"${editorAttributes}>${renderActionIcon(icon)}</span>`;
  }
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${editorAttributes}>${renderActionIcon(icon)}</a>`;
}

function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function newNote(section) {
  return { id: `${section}-${crypto.randomUUID()}`, type: "note", cover: null, data: { title: "Nova Nota", text: "Adicione os detalhes aqui." } };
}

export function renderCover(cover) {
  const url = mediaUrl(cover);
  if (!url) return "";
  const position = ["center", "top", "bottom", "left", "right"].includes(cover.position) ? cover.position : "center";
  return `<div class="block-cover position-${position}"><img src="${escapeHtml(url)}" alt="${escapeHtml(cover.alt)}" referrerpolicy="no-referrer" loading="lazy"></div>`;
}

export function mediaUrl(media) {
  if (media?.mediaId) return `/api/media/${encodeURIComponent(media.mediaId)}`;
  return media?.url ? safeAssetUrl(media.url) || safeUrl(media.url) : "";
}
