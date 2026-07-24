import { escapeHtml, initials, safeUrl } from "../utils/html.js";
import { formatClockTime, formatDisplayDate } from "../../shared/date-utils.mjs";
import { formatDurationUnits } from "../../shared/duration-utils.mjs";
import { ICON_PICKER_CATEGORIES, iconPickerLabel, renderActionIcon, renderIcon } from "../ui/icon-registry.js";
import { propertyPills } from "../editor/inline-stay-editor.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { editField, renderEntryImage, renderEntryLinks } from "./shared.js";

export const stayConfig = {
  eyebrow: "Accommodation",
  title: "Accommodation",
  addTypes: [
    { type: "stay-summary", label: "Accommodation Summary" },
    { type: "stay-amenities", label: "Listing Highlights" },
    { type: "link", label: "Link" },
    { type: "note", label: "Note" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "stay");
    if (type === "stay-amenities") return baseBlock(type, { title: "Listing Highlights", groups: [newAmenityGroup()] });
    if (type === "stay-anatomy") return baseBlock(type, { title: "Distribuição da Casa", area: "Adicionar área", spaces: [newSpace()] });
    if (type === "essentials") return baseBlock(type, { title: "Novas Informações Essenciais", items: [{ label: "Detalhe", value: "Adicionar valor" }] });
    if (type === "link") return baseBlock(type, { title: "Link Útil", description: "Adicionar contexto", url: "https://" });
    return baseBlock(type, { name: "Nova Hospedagem", subtitle: "Adicionar descrição", checkin: "", checkinTime: "", checkout: "", checkoutTime: "", nights: "Adicionar noites", mapUrl: "", websiteUrl: "", propertyPills: [] });
  },
  render(block, editing, context = {}) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (editing) return renderStayEditor(block);
    return renderStayBlock(block, context);
  },
};

function baseBlock(type, data) {
  return { id: `stay-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderStayBlock(block, context) {
  if (block.type === "stay-summary") return renderSummary(block, context);
  if (block.type === "stay-amenities") return renderAmenities(block.data);
  if (block.type === "stay-distances") return renderDistances(block.data);
  if (block.type === "stay-anatomy") return renderAnatomy(block.data);
  if (block.type === "essentials") return renderEssentials(block.data);
  return renderLink(block.data);
}

function renderSummary(block, context) {
  const data = block.data;
  const section = context.section ?? "stay";
  const attachmentButton = context.attachments?.renderDownloadButton(block.id, section, "Download accommodation attachment")
    ?? `<button class="transport-attachment-button" type="button" data-transport-attachment data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(block.id)}" aria-label="Download accommodation attachment" title="Download accommodation attachment" aria-haspopup="dialog">${renderActionIcon("file")}</button>`;
  const links = renderEntryLinks({ mapUrl: data.mapUrl, websiteUrl: data.websiteUrl || data.link }, data.name, attachmentButton, { showMissing: true });
  const checkinTime = data.checkinTime || "TBD";
  const checkoutTime = data.checkoutTime || "TBD";
  const pills = propertyPills(data);
  const propertyPillMarkup = pills.map(renderPropertyPill).join("");
  const pillClass = pills.length ? "property-pills" : "property-pills is-empty";
  return `<article class="content-block stay-summary stay-summary-clean"><div class="stay-copy"><div class="stay-title-row"><div class="stay-title-copy"><h3>${escapeHtml(data.name)}</h3><p>${escapeHtml(data.subtitle)}</p></div>${links}</div><div class="${pillClass}">${propertyPillMarkup}${renderStayAddButton("add-pill", "Add property detail")}</div><div class="stay-dates"><div class="stay-date-card stay-checkin"><span class="stay-date-icon" aria-hidden="true" data-inline-date-action="block" data-inline-date-field="checkin" data-inline-date-label="Check-In Date">${renderIcon("calendar")}</span><div><small>Entrada</small><span class="stay-date-details"><strong data-inline-date-action="block" data-inline-date-field="checkin" data-inline-date-label="Check-In Date">${escapeHtml(formatDisplayDate(data.checkin))}</strong><span class="stay-date-separator" aria-hidden="true">·</span><span class="stay-time" data-inline-time-field="checkinTime" data-inline-time-label="Check-In Time">${escapeHtml(formatClockTime(checkinTime))}</span></span></div></div><div class="stay-date-card stay-checkout"><span class="stay-date-icon" aria-hidden="true" data-inline-date-action="block" data-inline-date-field="checkout" data-inline-date-label="Check-Out Date">${renderIcon("calendar")}</span><div><small>Saída</small><span class="stay-date-details"><strong data-inline-date-action="block" data-inline-date-field="checkout" data-inline-date-label="Check-Out Date">${escapeHtml(formatDisplayDate(data.checkout))}</strong><span class="stay-date-separator" aria-hidden="true">·</span><span class="stay-time" data-inline-time-field="checkoutTime" data-inline-time-label="Check-Out Time">${escapeHtml(formatClockTime(checkoutTime))}</span></span></div></div></div></div></article>`;
}

function renderPropertyPill(pill) {
  return `<span class="property-pill" data-stay-pill-id="${escapeHtml(pill.id)}"><i aria-hidden="true">${renderIcon(pill.iconKey)}</i><span data-inline-stay-field="pill-label" data-stay-pill-id="${escapeHtml(pill.id)}" data-inline-ignore>${escapeHtml(pill.label)}</span>${renderStayRemoveButton("remove-pill", "Remove property detail", { stayPillId: pill.id })}</span>`;
}

function renderAmenities(data) {
  const groups = data.groups.map(renderAmenityGroup).join("");
  const empty = groups ? "" : `<p class="stay-nested-empty">No highlights added.</p>`;
  return `<article class="content-block amenity-card"><header class="amenity-card-header feature-card-header"><h3>${escapeHtml(data.title)}</h3></header><div class="amenity-groups${groups ? "" : " is-empty"}">${groups}${empty}</div>${renderStayAddButton("add-group", "Add highlight group")}</article>`;
}

function renderAmenityGroup(group) {
  const categoryIcon = amenityGroupIconKey(group);
  const items = group.items.map((item) => `<li data-amenity-item-id="${escapeHtml(item.id)}"><span class="amenity-icon" data-amenity-item-icon data-amenity-group-id="${escapeHtml(group.id)}" data-amenity-item-id="${escapeHtml(item.id)}">${renderIcon(amenityItemIconKey(item))}</span><span data-inline-stay-field="item-label" data-amenity-group-id="${escapeHtml(group.id)}" data-amenity-item-id="${escapeHtml(item.id)}" data-inline-ignore>${escapeHtml(item.label)}</span>${renderStayRemoveButton("remove-item", "Remove highlight", { amenityGroupId: group.id, amenityItemId: item.id })}</li>`).join("");
  const empty = items ? "" : `<li class="stay-nested-empty">No highlights added.</li>`;
  return `<section class="amenity-group" data-amenity-group-id="${escapeHtml(group.id)}"><header class="amenity-group-heading"><span class="amenity-group-icon" data-icon="${escapeHtml(categoryIcon)}" aria-hidden="true">${renderIcon(categoryIcon)}</span><h4 data-inline-stay-field="group-label" data-amenity-group-id="${escapeHtml(group.id)}" data-inline-ignore>${escapeHtml(group.label)}</h4>${renderStayRemoveButton("remove-group", "Remove highlight group", { amenityGroupId: group.id })}</header><ul>${items}${empty}</ul>${renderStayAddButton("add-item", "Add highlight", { amenityGroupId: group.id })}</section>`;
}

function renderStayRemoveButton(action, label, data = {}) {
  const attributes = stayControlAttributes(data);
  return `<button class="inline-stay-remove" type="button" data-inline-stay-action="${action}"${attributes} data-inline-ignore aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${renderActionIcon("trash")}<span class="sr-only">${escapeHtml(label)}</span></button>`;
}

function renderStayAddButton(action, label, data = {}) {
  const attributes = stayControlAttributes(data);
  return `<button class="inline-stay-add" type="button" data-inline-stay-action="${action}"${attributes} data-inline-ignore>${renderActionIcon("plus")}<span>${escapeHtml(label)}</span></button>`;
}

function stayControlAttributes(data) {
  return Object.entries(data).map(([name, value]) => ` data-${name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}="${escapeHtml(value)}"`).join("");
}
function amenityGroupIconKey(group) {
  const category = `${group.id ?? ""} ${group.label ?? ""}`.toLowerCase();
  return [
    [/kitchen|cozinha|dining|refeiç/, "cookware"],
    [/bedroom|quarto|laundry|lavanderia/, "bed"],
    [/bathroom|banheiro|wellness|bem-estar/, "amenity-bathtub"],
    [/outdoor|extern|view|vista/, "amenity-tree"],
    [/living|sala|comfort|conforto/, "amenity-sofa"],
    [/media|technology|tecnologia/, "amenity-laptop"],
  ].find(([pattern]) => pattern.test(category))?.[1] ?? "home";
}

function renderDistances(data) {
  const items = sortDistanceItems(data.items).map(renderDistanceItem).join("");
  return `<article class="content-block distance-card"><header><small>From your accommodation</small><h3>${escapeHtml(data.title)}</h3></header><div class="distance-list">${items}</div></article>`;
}

function renderDistanceItem(item, index) {
  const image = renderEntryImage(item);
  const links = renderEntryLinks({ mapUrl: item.mapUrl || landmarkMapUrl(item.address) }, item.name);
  return `<section class="distance-landmark" data-inline-image-entry="list" data-inline-image-index="${index}"><div class="distance-landmark-heading"><span class="distance-landmark-media"><span>${escapeHtml(initials(item.name))}</span>${image}</span><div class="distance-landmark-copy"><h4>${escapeHtml(item.name)}</h4></div>${links}</div><div class="distance-modes">${renderDistanceMode(item, "driving")}${renderDistanceMode(item, "walking")}${renderDistanceMode(item, "cycling")}</div></section>`;
}

function renderDistanceMode(item, mode) {
  const details = {
    driving: { label: "De carro", distance: item.drivingDistance, time: item.drivingTime, url: item.drivingUrl, icon: "car" },
    walking: { label: "A pé", distance: item.walkingDistance, time: item.walkingTime, url: item.walkingUrl, icon: "walking" },
    cycling: { label: "De bicicleta", distance: item.cyclingDistance, time: item.cyclingTime, url: item.cyclingUrl, icon: "bike" },
  }[mode];
  const duration = formatDurationUnits(details.time);
  const href = safeUrl(details.url);
  const contents = `<span class="distance-mode-icon" aria-hidden="true">${renderIcon(details.icon)}</span><span><strong>${escapeHtml(details.distance)}<span class="distance-time">· ${escapeHtml(duration)}</span></strong></span>`;
  if (!href) return `<span class="distance-mode" role="img" aria-label="${escapeHtml(`${details.label}: ${details.distance}, ${duration}`)}">${contents}</span>`;
  const ariaLabel = `${details.label} directions to ${item.name}: ${details.distance}, ${duration}`;
  return `<a class="distance-mode" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(ariaLabel)}" title="Abrir ${escapeHtml(details.label.toLowerCase())}">${contents}</a>`;
}

function sortDistanceItems(items) {
  return [...items].sort((first, second) => numericDistance(first) - numericDistance(second));
}

function numericDistance(item) {
  const distance = Number.parseFloat(item.drivingDistance);
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

function landmarkMapUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function renderAnatomy(data) {
  const spaces = data.spaces.map((space) => `<li><strong>${escapeHtml(space.label)}</strong><span>${space.beds.map((bed) => `${bed.quantity} ${escapeHtml(bed.label)} ${bed.label.toLowerCase().includes("sof") ? "🛋️" : "🛏️"}`).join(" · ")}</span></li>`).join("");
  return `<article class="content-block anatomy-card"><div><small>Distribuição da Hospedagem</small><h3>${escapeHtml(data.title)}</h3><span class="area-pill">${escapeHtml(data.area)}</span></div><ul>${spaces}</ul></article>`;
}

function renderEssentials(data) {
  return `<article class="content-block list-card"><h3>${escapeHtml(data.title)}</h3><dl class="essential-list">${data.items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl></article>`;
}

function renderLink(data) {
  const link = safeUrl(data.url);
  return `<article class="content-block link-block"><div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></div>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Abrir Link ↗</a>` : ""}</article>`;
}

function renderStayEditor(block) {
  if (block.type === "stay-summary") return renderSummaryEditor(block);
  if (block.type === "stay-amenities") return renderAmenitiesEditor(block.data);
  if (block.type === "stay-distances") return renderDistancesEditor(block.data);
  if (block.type === "stay-anatomy") return renderAnatomyEditor(block.data);
  if (block.type === "essentials") return renderEssentialsEditor(block.data);
  return `<div class="content-block edit-form">${editField("Título", "title", block.data.title)}${editField("Descrição", "description", block.data.description)}${editField("URL", "url", block.data.url, { type: "url" })}</div>`;
}

function renderSummaryEditor(block) {
  const data = block.data;
  const image = renderEntryImage({ cover: block.cover });
  const action = block.cover ? "Change" : "Add";
  const visual = image
    ? `<span class="stay-cover-preview">${image}</span>`
    : `<span class="stay-cover-placeholder">${renderActionIcon("image")}</span>`;
  const coverControl = `<div class="stay-cover-editor"><button class="stay-cover-button" type="button" data-stay-cover aria-label="${action} Cover Image">${visual}<span class="stay-cover-copy"><strong>Cover Image</strong><small>${action}</small></span></button></div>`;
  return `<div class="content-block edit-form two-column">${editField("Nome da Hospedagem", "name", data.name)}${editField("Subtítulo", "subtitle", data.subtitle)}${editField("Data de Entrada", "checkin", data.checkin, { type: "date" })}${editField("Horário de Entrada", "checkinTime", data.checkinTime ?? "", { type: "time" })}${editField("Data de Saída", "checkout", data.checkout, { type: "date" })}${editField("Horário de Saída", "checkoutTime", data.checkoutTime ?? "", { type: "time" })}${editField("Duração", "nights", data.nights)}${editField("URL do Google Maps", "mapUrl", data.mapUrl ?? "", { type: "url" })}${editField("URL do site", "websiteUrl", data.websiteUrl || data.link || "", { type: "url" })}${coverControl}</div>`;
}

function renderAmenitiesEditor(data) {
  const groups = data.groups.map(renderAmenityGroupEditor).join("");
  return `<div class="content-block edit-form amenity-editor">${editField("Título", "title", data.title)}${groups}<button class="inline-add" type="button" data-amenity-action="add-group">+ Adicionar Categoria</button></div>`;
}

function renderAmenityGroupEditor(group) {
  const selected = group.items.map((item) => `<span data-amenity-item="${escapeHtml(item.id)}">${renderIcon(amenityItemIconKey(item))} ${escapeHtml(item.label)} <button type="button" data-amenity-action="delete-item" aria-label="Remover ${escapeHtml(item.label)}" title="Remover ${escapeHtml(item.label)}">${renderActionIcon("trash")}<span class="sr-only">Remover ${escapeHtml(item.label)}</span></button></span>`).join("");
  return `<section class="amenity-group-editor" data-amenity-group="${escapeHtml(group.id)}"><div class="collection-title"><input value="${escapeHtml(group.label)}" data-amenity-group-label aria-label="Nome do grupo"><button type="button" data-amenity-action="delete-group">Excluir Grupo</button></div><div class="amenity-selected">${selected}</div><label>Buscar Comodidades<input type="search" data-amenity-search placeholder="Buscar cozinha, vistas, estacionamento..."></label><div class="amenity-results" role="listbox"></div>${renderCustomAmenity()}</section>`;
}

function amenityItemIconKey(item) {
  const identity = `${item.presetId ?? ""} ${item.id ?? ""} ${item.label ?? ""}`.toLowerCase();
  return /\btoilet\b|vaso sanit[aá]rio/.test(identity) ? "toilet" : item.iconKey;
}

function renderCustomAmenity() {
  const options = ICON_PICKER_CATEGORIES.map((category) => `<optgroup label="${escapeHtml(category.label)}">${category.keys.map((key) => `<option value="${escapeHtml(key)}" ${key === "home" ? "selected" : ""}>${escapeHtml(iconPickerLabel(key))}</option>`).join("")}</optgroup>`).join("");
  return `<details class="custom-amenity"><summary>Adicionar Destaque Personalizado</summary><div><label>Texto do Destaque<input data-custom-amenity-label maxlength="500" placeholder="ex.: saída mais tarde"></label><label>Ícone<span class="custom-icon-choice"><span class="custom-icon-preview" aria-hidden="true">${renderIcon("home")}</span><select data-custom-amenity-icon aria-label="Ícone do destaque">${options}</select></span></label><button type="button" data-amenity-action="add-custom">Adicionar Destaque</button></div></details>`;
}

function renderDistancesEditor(data) {
  const items = data.items.map(renderDistanceEditorItem).join("");
  return `<div class="content-block edit-form distance-editor">${editField("Título", "title", data.title)}${editField("Endereço de Partida", "origin", data.origin, { full: true })}<div class="distance-editor-list">${items}</div><button class="inline-add" type="button" data-list-action="add">+ Adicionar Ponto de Interesse</button></div>`;
}

function renderDistanceEditorItem(item, index) {
  const identity = `<div class="distance-editor-copy"><input value="${escapeHtml(item.name)}" data-list-property="name" aria-label="Nome do ponto de interesse" placeholder="Nome do ponto de interesse"><input value="${escapeHtml(item.address)}" data-list-property="address" aria-label="Endereço do ponto de interesse" placeholder="Endereço do ponto de interesse"></div>`;
  const modes = `<div class="distance-editor-modes">${[
    distanceEditorField("Distância de carro", "drivingDistance", item.drivingDistance),
    distanceEditorField("Tempo de carro", "drivingTime", item.drivingTime),
    distanceEditorField("Distância a pé", "walkingDistance", item.walkingDistance),
    distanceEditorField("Tempo a pé", "walkingTime", item.walkingTime),
    distanceEditorField("Distância de bicicleta", "cyclingDistance", item.cyclingDistance),
    distanceEditorField("Tempo de bicicleta", "cyclingTime", item.cyclingTime),
    distanceEditorField("URL da rota de carro", "drivingUrl", item.drivingUrl, "url"),
    distanceEditorField("URL da rota a pé", "walkingUrl", item.walkingUrl, "url"),
    distanceEditorField("URL da rota de bicicleta", "cyclingUrl", item.cyclingUrl, "url"),
  ].join("")}</div>`;
  const actions = `<div class="nested-toolbar distance-editor-actions" aria-label="Controles do ponto de interesse">${distanceActionButton("cover", "Imagem de capa", "image")}${distanceActionButton("delete", `Delete ${item.name}`, "trash")}</div>`;
  return `<section class="distance-editor-row" data-item-index="${index}">${identity}${modes}${actions}</section>`;
}

function distanceEditorField(label, property, value, type = "text") {
  return `<label>${escapeHtml(label)}<input type="${type}" value="${escapeHtml(value)}" data-list-property="${property}"></label>`;
}

function distanceActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-list-action="${action}" data-tooltip="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${renderActionIcon(icon)}</button>`;
}

function renderAnatomyEditor(data) {
  const spaces = data.spaces.map((space) => `<section class="space-editor" data-space-id="${escapeHtml(space.id)}"><div class="collection-title"><input value="${escapeHtml(space.label)}" data-space-field="label" aria-label="Nome do espaço"><button type="button" data-anatomy-action="delete-space">Excluir Espaço</button></div>${space.beds.map((bed) => `<div class="bed-editor" data-bed-id="${escapeHtml(bed.id)}"><input value="${escapeHtml(bed.label)}" data-bed-field="label" aria-label="Tipo de cama"><input type="number" min="1" max="20" value="${bed.quantity}" data-bed-field="quantity" aria-label="Quantidade de camas"><button type="button" data-anatomy-action="delete-bed" aria-label="Excluir cama" title="Excluir cama">${renderActionIcon("trash")}<span class="sr-only">Excluir cama</span></button></div>`).join("")}<button class="inline-add" type="button" data-anatomy-action="add-bed">+ Adicionar Cama</button></section>`).join("");
  return `<div class="content-block edit-form anatomy-editor">${editField("Título", "title", data.title)}${editField("Área", "area", data.area)}${spaces}<button class="inline-add" type="button" data-anatomy-action="add-space">+ Adicionar Quarto</button></div>`;
}

function renderEssentialsEditor(data) {
  const rows = data.items.map((item, index) => `<div class="list-edit-row two-fields" data-item-index="${index}"><input value="${escapeHtml(item.label)}" data-list-property="label" aria-label="Rótulo"><input value="${escapeHtml(item.value)}" data-list-property="value" aria-label="Valor"><button class="mini-action" type="button" data-list-action="delete" aria-label="Excluir item" title="Excluir item">${renderActionIcon("trash")}<span class="sr-only">Excluir item</span></button></div>`).join("");
  return `<div class="content-block edit-form"><label>Título<input value="${escapeHtml(data.title)}" data-block-field="title"></label><div class="list-editor">${rows}</div><button class="inline-add" type="button" data-list-action="add">+ Adicionar Item</button></div>`;
}

function newAmenityGroup() { return { id: `group-${crypto.randomUUID()}`, label: "Nova Categoria", items: [] }; }
function newSpace() { return { id: `space-${crypto.randomUUID()}`, label: "Novo Quarto", beds: [] }; }
