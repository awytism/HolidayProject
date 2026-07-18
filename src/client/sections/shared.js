import { escapeHtml, initials, safeUrl } from "../utils/html.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_LABELS = Object.freeze({ high: "Alta", medium: "Média", low: "Baixa" });

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

export function renderPlace(place) {
  const image = renderEntryImage(place);
  const comment = place.comment ? `<small>${escapeHtml(place.comment)}</small>` : "";
  const routes = renderPlaceRouteModes(place);
  return `<div class="place-row priority-${escapeHtml(place.priority)}${routes ? " has-routes" : ""}"><span class="place-media"><span>${escapeHtml(initials(place.name))}</span>${image}</span><span class="place-copy"><strong>${escapeHtml(place.name)}</strong>${comment}${renderPriorityBadge(place.priority)}</span>${routes}${renderEntryLinks(place, place.name)}</div>`;
}

export function renderPlaceEditor(place) {
  const routeEditor = renderPlaceRouteEditor(place);
  return `<div class="place-editor" data-place-id="${escapeHtml(place.id)}"><div class="place-editor-fields"><input value="${escapeHtml(place.name)}" data-place-field="name" aria-label="Nome do lugar" placeholder="Nome do lugar"><input type="url" value="${escapeHtml(place.mapUrl)}" data-place-field="mapUrl" placeholder="URL do Google Maps" aria-label="URL do Google Maps"><input type="url" value="${escapeHtml(place.websiteUrl)}" data-place-field="websiteUrl" placeholder="URL do site" aria-label="URL do site"><textarea data-place-field="comment" placeholder="Comentário" aria-label="Comentário sobre o lugar">${escapeHtml(place.comment)}</textarea>${routeEditor}</div>${renderPriorityControl("place", place.priority)}<div class="nested-toolbar" aria-label="Controles do lugar">${placeActionButton("cover", "Imagem de capa", "image")}${placeActionButton("up", "Mover para cima", "arrow-up")}${placeActionButton("down", "Mover para baixo", "arrow-down")}${placeActionButton("delete", "Excluir lugar", "trash")}</div></div>`;
}

function renderPlaceRouteModes(place) {
  const modes = [
    ["driving", "De carro", "car"],
    ["walking", "A pé", "walking"],
    ["cycling", "De bicicleta", "bike"],
  ].map(([mode, label, icon]) => renderPlaceRouteMode(place, mode, label, icon)).join("");
  return modes ? `<span class="place-route-modes">${modes}</span>` : "";
}

function renderPlaceRouteMode(place, mode, label, icon) {
  const distance = String(place[`${mode}Distance`] ?? "").trim();
  const time = String(place[`${mode}Time`] ?? "").trim();
  if (!distance && !time) return "";
  const value = [distance, time].filter(Boolean).join(" · ");
  return `<span class="place-route-mode"><span class="place-route-icon">${renderIcon(icon)}</span><span><small>${label}</small><strong>${escapeHtml(value)}</strong></span></span>`;
}

function renderPlaceRouteEditor(place) {
  const modes = [
    ["driving", "De carro"],
    ["walking", "A pé"],
    ["cycling", "De bicicleta"],
  ].map(([mode, label]) => {
    const distance = escapeHtml(place[`${mode}Distance`] ?? "");
    const time = escapeHtml(place[`${mode}Time`] ?? "");
    return `<fieldset class="place-route-editor-mode"><legend>${label}</legend><input value="${distance}" data-place-field="${mode}Distance" placeholder="Distância" aria-label="${label} Distance"><input value="${time}" data-place-field="${mode}Time" placeholder="Tempo" aria-label="${label} Time"></fieldset>`;
  }).join("");
  return `<fieldset class="place-route-editor"><legend>Distâncias a partir da parada anterior ou da hospedagem</legend>${modes}</fieldset>`;
}

export function renderEntryImage(entry) {
  const imageUrl = mediaUrl(entry.cover) || safeUrl(entry.image);
  if (!imageUrl) return "";
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.cover?.alt ?? "")}" referrerpolicy="no-referrer" loading="lazy">`;
}

export function renderEntryLinks(entry, name) {
  const mapUrl = safeUrl(entry.mapUrl);
  const websiteUrl = safeUrl(entry.websiteUrl);
  const map = entryLink(mapUrl, `Abrir ${name} no Google Maps`, "map-pin", "map-link");
  const website = entryLink(websiteUrl, `Abrir site de ${name}`, "external-link", "website-link");
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
  return `<div class="priority-control" role="group" aria-label="Prioridade">${buttons}</div>`;
}

function placeActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-place-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function entryLink(url, label, icon, className) {
  if (!url) return "";
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${renderActionIcon(icon)}</a>`;
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

function mediaUrl(media) {
  if (media?.mediaId) return `/api/media/${encodeURIComponent(media.mediaId)}`;
  return media?.url ? safeUrl(media.url) : "";
}
