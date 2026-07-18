import { escapeHtml, initials, safeUrl } from "../utils/html.js";
import { formatFullDate } from "../../shared/date-utils.mjs";
import { renderActionIcon, renderIcon, TRUSTED_ICON_KEYS } from "../ui/icon-registry.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { editField, renderEntryImage, renderEntryLinks } from "./shared.js";

export const stayConfig = {
  eyebrow: "Hospedagem",
  title: "Hospedagem",
  addTypes: [
    { type: "stay-summary", label: "Resumo da Hospedagem" },
    { type: "stay-amenities", label: "Comodidades" },
    { type: "stay-anatomy", label: "Distribuição dos Quartos" },
    { type: "essentials", label: "Informações Essenciais" },
    { type: "link", label: "Link" },
    { type: "note", label: "Descrição" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "stay");
    if (type === "stay-amenities") return baseBlock(type, { title: "Comodidades", groups: [newAmenityGroup()] });
    if (type === "stay-anatomy") return baseBlock(type, { title: "Distribuição da Casa", area: "Adicionar área", spaces: [newSpace()] });
    if (type === "essentials") return baseBlock(type, { title: "Novas Informações Essenciais", items: [{ label: "Detalhe", value: "Adicionar valor" }] });
    if (type === "link") return baseBlock(type, { title: "Link Útil", description: "Adicionar contexto", url: "https://" });
    return baseBlock(type, { name: "Nova Hospedagem", subtitle: "Adicionar descrição", checkin: "", checkinTime: "", checkout: "", checkoutTime: "", nights: "Adicionar noites", mapUrl: "", websiteUrl: "" });
  },
  render(block, editing) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (editing) return renderStayEditor(block);
    return renderStayBlock(block);
  },
};

function baseBlock(type, data) {
  return { id: `stay-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderStayBlock(block) {
  if (block.type === "stay-summary") return renderSummary(block.data);
  if (block.type === "stay-amenities") return renderAmenities(block.data);
  if (block.type === "stay-distances") return renderDistances(block.data);
  if (block.type === "stay-anatomy") return renderAnatomy(block.data);
  if (block.type === "essentials") return renderEssentials(block.data);
  return renderLink(block.data);
}

function renderSummary(data) {
  const links = renderEntryLinks({ mapUrl: data.mapUrl, websiteUrl: data.websiteUrl || data.link }, data.name);
  const checkinTime = data.checkinTime || "Horário a confirmar";
  const checkoutTime = data.checkoutTime || "Horário a confirmar";
  return `<article class="content-block stay-summary"><div class="stay-art" aria-hidden="true"><svg viewBox="0 0 300 220"><path d="M36 185h228M68 185v-82l82-54 82 54v82M105 185v-43h42v43M174 112h30v30h-30zM82 91l68-45 68 45"/></svg><span>${escapeHtml(data.nights)}</span></div><div class="stay-copy"><div class="stay-title-row"><div><small>Casa de Férias Inteira</small><h3>${escapeHtml(data.name)}</h3></div>${links}</div><p>${escapeHtml(data.subtitle)}</p><div class="property-pills"><span>3 quartos</span><span>4 camas</span><span>1 banheiro</span><span>90 m²</span></div><div class="stay-dates"><div><small>Entrada</small><strong>${escapeHtml(formatFullDate(data.checkin))}</strong><span class="stay-time">${escapeHtml(checkinTime)}</span></div><div><small>Saída</small><strong>${escapeHtml(formatFullDate(data.checkout))}</strong><span class="stay-time">${escapeHtml(checkoutTime)}</span></div></div></div></article>`;
}

function renderAmenities(data) {
  const groups = data.groups.map(renderAmenityGroup).join("");
  return `<article class="content-block amenity-card"><header><small>Destaques da Hospedagem</small><h3>${escapeHtml(data.title)}</h3></header><div class="amenity-groups">${groups}</div></article>`;
}

function renderAmenityGroup(group) {
  const items = group.items.map((item) => `<li><span class="amenity-icon">${renderIcon(item.iconKey)}</span><span>${escapeHtml(item.label)}</span></li>`).join("");
  return `<section class="amenity-group"><h4>${escapeHtml(group.label)}</h4><ul>${items}</ul></section>`;
}

function renderDistances(data) {
  const items = sortDistanceItems(data.items).map(renderDistanceItem).join("");
  return `<article class="content-block distance-card"><header><small>A partir da Casa do Sol</small><h3>${escapeHtml(data.title)}</h3></header><div class="distance-list">${items}</div></article>`;
}

function renderDistanceItem(item) {
  const image = renderEntryImage(item);
  const links = renderEntryLinks({ mapUrl: landmarkMapUrl(item.address) }, item.name);
  return `<section class="distance-landmark"><div class="distance-landmark-heading"><span class="distance-landmark-media"><span>${escapeHtml(initials(item.name))}</span>${image}</span><div class="distance-landmark-copy"><h4>${escapeHtml(item.name)}</h4></div>${links}</div><div class="distance-modes">${renderDistanceMode(item, "driving")}${renderDistanceMode(item, "walking")}${renderDistanceMode(item, "cycling")}</div></section>`;
}

function renderDistanceMode(item, mode) {
  const details = {
    driving: { label: "De carro", distance: item.drivingDistance, time: item.drivingTime, url: item.drivingUrl, icon: "car" },
    walking: { label: "A pé", distance: item.walkingDistance, time: item.walkingTime, url: item.walkingUrl, icon: "walking" },
    cycling: { label: "De bicicleta", distance: item.cyclingDistance, time: item.cyclingTime, url: item.cyclingUrl, icon: "bike" },
  }[mode];
  const href = safeUrl(details.url);
  const contents = `<span class="distance-mode-icon" aria-hidden="true">${renderIcon(details.icon)}</span><span><small>${details.label}</small><strong>${escapeHtml(details.distance)}<span class="distance-time">· ${escapeHtml(details.time)}</span></strong></span>`;
  if (!href) return `<span class="distance-mode">${contents}</span>`;
  const ariaLabel = `${details.label} directions to ${item.name}: ${details.distance}, ${details.time}`;
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
  if (block.type === "stay-summary") return renderSummaryEditor(block.data);
  if (block.type === "stay-amenities") return renderAmenitiesEditor(block.data);
  if (block.type === "stay-distances") return renderDistancesEditor(block.data);
  if (block.type === "stay-anatomy") return renderAnatomyEditor(block.data);
  if (block.type === "essentials") return renderEssentialsEditor(block.data);
  return `<div class="content-block edit-form">${editField("Título", "title", block.data.title)}${editField("Descrição", "description", block.data.description)}${editField("URL", "url", block.data.url, { type: "url" })}</div>`;
}

function renderSummaryEditor(data) {
  return `<div class="content-block edit-form two-column">${editField("Nome da Hospedagem", "name", data.name)}${editField("Subtítulo", "subtitle", data.subtitle)}${editField("Data de Entrada", "checkin", data.checkin, { type: "date" })}${editField("Horário de Entrada", "checkinTime", data.checkinTime ?? "", { type: "time" })}${editField("Data de Saída", "checkout", data.checkout, { type: "date" })}${editField("Horário de Saída", "checkoutTime", data.checkoutTime ?? "", { type: "time" })}${editField("Duração", "nights", data.nights)}${editField("URL do Google Maps", "mapUrl", data.mapUrl ?? "", { type: "url" })}${editField("URL do site", "websiteUrl", data.websiteUrl || data.link || "", { type: "url" })}</div>`;
}

function renderAmenitiesEditor(data) {
  const groups = data.groups.map(renderAmenityGroupEditor).join("");
  return `<div class="content-block edit-form amenity-editor">${editField("Título", "title", data.title)}${groups}<button class="inline-add" type="button" data-amenity-action="add-group">+ Adicionar Categoria</button></div>`;
}

function renderAmenityGroupEditor(group) {
  const selected = group.items.map((item) => `<span data-amenity-item="${escapeHtml(item.id)}">${renderIcon(item.iconKey)} ${escapeHtml(item.label)} <button type="button" data-amenity-action="delete-item" aria-label="Remover ${escapeHtml(item.label)}">×</button></span>`).join("");
  return `<section class="amenity-group-editor" data-amenity-group="${escapeHtml(group.id)}"><div class="collection-title"><input value="${escapeHtml(group.label)}" data-amenity-group-label aria-label="Nome do grupo"><button type="button" data-amenity-action="delete-group">Excluir Grupo</button></div><div class="amenity-selected">${selected}</div><label>Buscar Comodidades<input type="search" data-amenity-search placeholder="Buscar cozinha, vistas, estacionamento..."></label><div class="amenity-results" role="listbox"></div>${renderCustomAmenity()}</section>`;
}

function renderCustomAmenity() {
  const options = TRUSTED_ICON_KEYS.map((key) => `<option value="${escapeHtml(key)}" ${key === "home" ? "selected" : ""}>${escapeHtml(iconLabel(key))}</option>`).join("");
  return `<details class="custom-amenity"><summary>Adicionar Destaque Personalizado</summary><div><label>Texto do Destaque<input data-custom-amenity-label maxlength="500" placeholder="ex.: saída mais tarde"></label><label>Ícone<span class="custom-icon-choice"><span class="custom-icon-preview" aria-hidden="true">${renderIcon("home")}</span><select data-custom-amenity-icon aria-label="Ícone do destaque">${options}</select></span></label><button type="button" data-amenity-action="add-custom">Adicionar Destaque</button></div></details>`;
}

function iconLabel(key) {
  return key.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
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
  const spaces = data.spaces.map((space) => `<section class="space-editor" data-space-id="${escapeHtml(space.id)}"><div class="collection-title"><input value="${escapeHtml(space.label)}" data-space-field="label" aria-label="Nome do espaço"><button type="button" data-anatomy-action="delete-space">Excluir Espaço</button></div>${space.beds.map((bed) => `<div class="bed-editor" data-bed-id="${escapeHtml(bed.id)}"><input value="${escapeHtml(bed.label)}" data-bed-field="label" aria-label="Tipo de cama"><input type="number" min="1" max="20" value="${bed.quantity}" data-bed-field="quantity" aria-label="Quantidade de camas"><button type="button" data-anatomy-action="delete-bed">×</button></div>`).join("")}<button class="inline-add" type="button" data-anatomy-action="add-bed">+ Adicionar Cama</button></section>`).join("");
  return `<div class="content-block edit-form anatomy-editor">${editField("Título", "title", data.title)}${editField("Área", "area", data.area)}${spaces}<button class="inline-add" type="button" data-anatomy-action="add-space">+ Adicionar Quarto</button></div>`;
}

function renderEssentialsEditor(data) {
  const rows = data.items.map((item, index) => `<div class="list-edit-row two-fields" data-item-index="${index}"><input value="${escapeHtml(item.label)}" data-list-property="label" aria-label="Rótulo"><input value="${escapeHtml(item.value)}" data-list-property="value" aria-label="Valor"><button class="mini-action" type="button" data-list-action="delete" aria-label="Excluir item">×</button></div>`).join("");
  return `<div class="content-block edit-form"><label>Título<input value="${escapeHtml(data.title)}" data-block-field="title"></label><div class="list-editor">${rows}</div><button class="inline-add" type="button" data-list-action="add">+ Adicionar Item</button></div>`;
}

function newAmenityGroup() { return { id: `group-${crypto.randomUUID()}`, label: "Nova Categoria", items: [] }; }
function newSpace() { return { id: `space-${crypto.randomUUID()}`, label: "Novo Quarto", beds: [] }; }
