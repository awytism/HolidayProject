import { escapeHtml, initials } from "../utils/html.js";
import { formatAgendaDate } from "../../shared/date-utils.mjs";
import {
  editField,
  newNote,
  renderEntryImage,
  renderEntryLinks,
  renderDistanceEditor,
  renderMealRouteToggle,
  renderNote,
  renderPlace,
  renderPlaceEditor,
  renderPriorityBadge,
  renderPriorityControl,
} from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const MEAL_LABELS = Object.freeze({ breakfast: "Café da Manhã", lunch: "Almoço", dinner: "Jantar" });
const SAVED_PLACES_TITLE = "Other Places";
const MEAL_ICON_CLASSES = Object.freeze({
  breakfast: "meal-heading-icon-breakfast",
  lunch: "meal-heading-icon-lunch",
  dinner: "meal-heading-icon-dinner",
});
const MEAL_ICON_KEYS = Object.freeze({
  breakfast: "coffee",
  lunch: "utensils",
  dinner: "soda",
});
export const agendaConfig = {
  eyebrow: "Agenda",
  title: "Agenda",
  addTypes: [
    { type: "day", label: "Plano do Dia" },
    { type: "saved-places", label: "Lugares Salvos" },
    { type: "note", label: "Nota" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "agenda");
    if (type === "note") return newNote("agenda");
    if (type === "saved-places") return baseBlock(type, { title: SAVED_PLACES_TITLE, places: [] });
    return baseBlock(type, {
      date: "", title: "Novo Plano", places: [],
      meals: { breakfast: [], lunch: [], dinner: [] }, notes: "",
    });
  },
  render(block, editing, context = {}) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (block.type === "note") return renderNote(block, editing);
    if (block.type === "saved-places") return editing ? renderSavedEditor(block) : renderSaved(block, context);
    return editing ? renderDayEditor(block) : renderDay(block, context);
  },
};

function baseBlock(type, data) {
  return { id: `agenda-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderDay(block, context) {
  const data = block.data;
  const places = data.places.length
    ? data.places.map((place) => renderAgendaPlace(place, block, context)).join("")
    : '<p class="day-note">Nenhum lugar planejado.</p>';
  const headingDate = formatAgendaDate(data.date);
  const calendarMonth = headingDate.month.replace(/\.$/, "");
  const calendarLabel = `${headingDate.weekday}, ${calendarMonth} ${headingDate.day}`;
  const heading = `<h3 class="day-heading"><span class="day-heading-calendar" role="img" aria-label="${escapeHtml(calendarLabel)}" data-inline-date-action="block" data-inline-date-field="date" data-inline-date-label="Agenda Date"><span class="day-heading-month">${escapeHtml(calendarMonth)}</span><strong class="day-heading-number">${escapeHtml(headingDate.day)}</strong></span><span class="day-heading-copy"><span class="day-heading-weekday" data-inline-static>${escapeHtml(headingDate.weekday)}</span><span class="day-heading-separator" aria-hidden="true">•</span><span class="day-heading-title">${escapeHtml(data.title)}</span></span></h3>`;
  return `<article class="content-block day-card"><header class="day-header">${heading}</header><div class="day-body"><p class="block-label">Lugar(es)</p><div class="place-list">${places}</div><p class="block-label">Refeições</p><div class="meal-grid">${renderMeals(data.meals, block, context)}</div><p class="day-note"><strong data-inline-static>Observações:</strong> ${escapeHtml(data.notes || "Nenhuma observação adicional.")}</p></div></article>`;
}

function renderAgendaPlace(place, block, context) {
  const attachment = renderAgendaAttachmentButton(block, context);
  return renderPlace(place, { extraLink: attachment, showMissingLinks: true });
}

function renderAgendaAttachmentButton(block, context) {
  const section = context.section ?? "agenda";
  const label = "Download agenda attachment";
  return context.attachments?.renderDownloadButton(block.id, section, label)
    ?? `<button class="transport-attachment-button is-unavailable" type="button" data-transport-attachment data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(block.id)}" aria-label="${label}" title="${label}" aria-haspopup="dialog">${renderActionIcon("file")}</button>`;
}

function renderMeals(meals, block, context) {
  const plannedMeals = ["breakfast", "lunch", "dinner"].filter((name) => meals[name].length);
  if (!plannedMeals.length) return '<p class="day-note meal-empty-banner">Nenhuma refeição planejada.</p>';
  return ["breakfast", "lunch", "dinner"].map((name) => {
    const options = meals[name];
    const content = options.length
      ? options.map((option) => renderFoodOption(option, block, context, name)).join("")
      : renderOpenMeal(name, block, context);
    return `<section class="meal-group"><h4>${renderMealHeading(name)}</h4><div class="food-list">${content}</div></section>`;
  }).join("");
}

function renderFoodOption(option, block, context, meal) {
  const links = renderEntryLinks(option, option.name, renderAgendaAttachmentButton(block, context), { showMissing: true });
  return renderCompactPlaceCard(option, links, "", { showDetails: true, imageKind: "food", meal });
}

function renderCompactPlaceCard(entry, links, extraClass = "", options = {}) {
  const image = renderEntryImage(entry);
  const routeToggle = renderMealRouteToggle(entry);
  const routeClass = routeToggle ? " has-route" : "";
  const className = extraClass ? ` ${extraClass}` : "";
  const showDetails = options.showDetails === true;
  const description = showDetails && String(entry.comment ?? "").trim()
    ? `<small class="meal-card-description">${escapeHtml(entry.comment)}</small>`
    : "";
  const priority = renderMealPriority(entry, showDetails);
  const imageKind = options.imageKind ? ` data-inline-image-entry="${escapeHtml(options.imageKind)}" data-inline-image-id="${escapeHtml(entry.id)}"` : "";
  const meal = options.meal ? ` data-inline-image-meal="${escapeHtml(options.meal)}"` : "";
  return `<article class="food-row${className}"${imageKind}${meal}><div class="meal-card-main"><span class="meal-card-heading"><span class="place-media"><span>${escapeHtml(initials(entry.name))}</span>${image}</span><span class="food-card-copy"><span class="place-copy"><strong>${escapeHtml(entry.name)}</strong></span>${priority}</span></span>${description}</div><div class="meal-card-footer${routeClass}">${links}${routeToggle}</div></article>`;
}

function renderMealPriority(entry, showDetails) {
  if (!showDetails || !String(entry.name ?? "").trim()) return "";
  return renderPriorityBadge(entry.priority);
}

function renderOpenMeal(meal, block, context) {
  const label = mealLabel(meal);
  const links = renderEntryLinks({}, label, renderAgendaAttachmentButton(block, context), { showMissing: true, editable: false });
  return `<article class="food-row food-row-open"><div class="meal-card-main"><span class="meal-card-heading"><span class="place-media"><span>${escapeHtml(initials(label))}</span></span><span class="food-card-copy"><span class="open">Em aberto</span></span></span></div><div class="meal-card-footer">${links}</div></article>`;
}

function renderDayEditor(block) {
  const data = block.data;
  const places = data.places.map(renderPlaceEditor).join("");
  return `<div class="content-block edit-form two-column">${editField("Data", "date", data.date, { type: "date" })}${editField("Título do Dia", "title", data.title)}<div class="full-field list-editor"><span class="block-label">Lugares</span>${places}<button class="inline-add" type="button" data-place-action="add">+ Adicionar Lugar</button></div><div class="full-field food-editor-groups">${renderFoodEditors(data.meals)}</div>${editField("Observações", "notes", data.notes, { multiline: true, full: true })}</div>`;
}

function renderFoodEditors(meals) {
  return ["breakfast", "lunch", "dinner"].map((meal) => {
    const options = meals[meal].map((option) => renderFoodEditor(option, meal)).join("");
    return `<section class="food-meal-editor" data-meal="${meal}"><h4>${renderMealHeading(meal)}</h4><div class="food-option-editors">${options}</div><button class="inline-add" type="button" data-food-action="add">+ Add Meal</button></section>`;
  }).join("");
}

function renderMealHeading(meal) {
  const iconClass = MEAL_ICON_CLASSES[meal] ?? MEAL_ICON_CLASSES.lunch;
  const iconKey = MEAL_ICON_KEYS[meal] ?? MEAL_ICON_KEYS.lunch;
  return `<span class="meal-heading-icon ${iconClass}" aria-hidden="true"><span class="meal-heading-glyph" data-icon="${iconKey}">${renderIcon(iconKey)}</span></span><span class="meal-heading-label meal-heading-label-${meal}">${mealLabel(meal)}</span>`;
}

function renderFoodEditor(option, meal) {
  const fields = `<div class="food-editor-fields"><input value="${escapeHtml(option.name)}" data-food-field="name" placeholder="Opção de Refeição" aria-label="${mealLabel(meal)} Opção de Refeição"><input type="url" value="${escapeHtml(option.mapUrl)}" data-food-field="mapUrl" placeholder="URL do Google Maps" aria-label="URL do Google Maps"><input type="url" value="${escapeHtml(option.websiteUrl)}" data-food-field="websiteUrl" placeholder="URL do site" aria-label="URL do site"><textarea data-food-field="comment" placeholder="Descrição" aria-label="Descrição">${escapeHtml(option.comment ?? "")}</textarea>${renderDistanceEditor(option, "food")}</div>`;
  const toolbar = `<div class="nested-toolbar" aria-label="Controles da Opção de Refeição">${foodActionButton("cover", "Imagem de capa", "image")}${foodActionButton("up", "Mover para cima", "arrow-up")}${foodActionButton("down", "Mover para baixo", "arrow-down")}${foodActionButton("delete", "Excluir Opção de Refeição", "trash")}</div>`;
  return `<div class="food-option-editor" data-food-id="${escapeHtml(option.id)}">${fields}<div class="editor-entry-actions">${renderPriorityControl("food", option.priority)}<button class="editor-remove-button" type="button" data-food-action="delete">Remove Meal</button></div>${toolbar}</div>`;
}

function foodActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-food-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function renderSaved(block, context) {
  const attachment = renderAgendaAttachmentButton(block, context);
  const groups = [
    { category: "restaurant", label: "Restaurants" },
    { category: "landmark", label: "Landmarks" },
  ].map(({ category, label }) => {
    const places = block.data.places.filter((place) => savedPlaceCategory(place) === category);
    const content = places.length
      ? places.map((place) => renderSavedPlace(place, attachment)).join("")
      : '<p class="saved-place-empty">No saved places yet.</p>';
    return `<section class="saved-place-group saved-place-group-${category}"><header class="saved-place-group-header"><h4>${label}</h4></header><div class="saved-grid">${content}</div></section>`;
  }).join("");
  return `<article class="content-block saved-places"><header class="saved-places-header"><h3>${escapeHtml(savedPlacesTitle(block.data.title))}</h3></header><div class="saved-place-groups">${groups}</div></article>`;
}

function renderSavedPlace(place, attachment) {
  const links = renderEntryLinks(place, place.name, attachment, { showMissing: true });
  return renderCompactPlaceCard(place, links, "saved-place-card", { showDetails: true, imageKind: "place" });
}

function renderSavedEditor(block) {
  return `<div class="content-block edit-form saved-places-editor"><label>Title<input value="${escapeHtml(savedPlacesTitle(block.data.title))}" data-block-field="title"></label><div class="list-editor">${block.data.places.map((place) => renderPlaceEditor(place, { showCategory: true })).join("")}</div><button class="inline-add" type="button" data-place-action="add">+ Add Place</button></div>`;
}

function savedPlacesTitle(value) {
  const legacyTitles = [
    "Gramado Gems", "Joias de Gramado", "Other Places of Interest", "Outros Lugares de Interesse",
    "More to Explore", "Mais para Explorar",
  ];
  return legacyTitles.includes(value) ? SAVED_PLACES_TITLE : value;
}

function savedPlaceCategory(place) {
  return place.category === "landmark" ? "landmark" : "restaurant";
}

function mealLabel(value) {
  return MEAL_LABELS[value] ?? value;
}
