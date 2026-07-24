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
  renderPlaceTitleIcon,
  renderPriorityBadge,
  renderPriorityControl,
} from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const MEAL_LABELS = Object.freeze({ breakfast: "Café da Manhã", lunch: "Almoço", dinner: "Jantar" });
const SAVED_PLACES_TITLE = "Places of Interest";
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
    { type: "day", label: "Day Plan" },
    { type: "note", label: "Note" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "agenda");
    if (type === "note") return newNote("agenda");
    if (type === "saved-places") return baseBlock(type, { title: SAVED_PLACES_TITLE, titleVisible: true, places: [] });
    return baseBlock(type, {
      date: "", title: "Novo Plano", places: [], placesLabelVisible: true, mealsLabelVisible: true,
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

export const placesConfig = Object.freeze({
  ...agendaConfig,
  eyebrow: "Other",
  title: "Other",
  addTypes: [
    { type: "saved-places", label: "Places" },
    { type: "note", label: "Note" },
  ],
});

function baseBlock(type, data) {
  return { id: `agenda-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderDay(block, context) {
  const data = block.data;
  const places = data.places.length
    ? data.places.map((place) => renderAgendaPlace(place, block, context)).join("")
    : '<p class="day-note place-empty-banner">No places planned.</p>';
  const addPlace = renderAgendaAddButton("add-place", "Add place");
  const headingDate = formatAgendaDate(data.date);
  const calendarMonth = headingDate.month.replace(/\.$/, "");
  const calendarLabel = `${headingDate.weekday}, ${calendarMonth} ${headingDate.day}`;
  const heading = `<h3 class="day-heading"><span class="day-heading-calendar" role="img" aria-label="${escapeHtml(calendarLabel)}" data-inline-date-action="block" data-inline-date-field="date" data-inline-date-label="Agenda Date"><span class="day-heading-month">${escapeHtml(calendarMonth)}</span><strong class="day-heading-number">${escapeHtml(headingDate.day)}</strong></span><span class="day-heading-copy"><span class="day-heading-weekday" data-inline-static>${escapeHtml(headingDate.weekday)}</span><span class="day-heading-separator" aria-hidden="true">•</span><span class="day-heading-title">${escapeHtml(data.title)}</span></span></h3>`;
  return `<article class="content-block day-card"><header class="day-header">${heading}</header><div class="day-body">${renderDayGroupLabel("Place(s)", "places", data.placesLabelVisible !== false)}<div class="place-list">${places}</div>${addPlace}${renderDayGroupLabel("Meal(s)", "meals", data.mealsLabelVisible !== false)}<div class="meal-grid">${renderMeals(data.meals, block, context)}</div><p class="day-note"><strong data-inline-static>Observações:</strong> ${escapeHtml(data.notes || "Nenhuma observação adicional.")}</p></div></article>`;
}

function renderDayGroupLabel(label, group, visible) {
  const action = visible
    ? renderAgendaRemoveButton(`remove-${group}-label`, `Remove ${label} label`, "day-group-label-remove")
    : renderAgendaAddButton(`restore-${group}-label`, `Add ${label} label`, { className: "day-group-label-restore" });
  const heading = visible ? `<p class="block-label">${escapeHtml(label)}</p>` : "";
  return `<div class="day-group-label${visible ? "" : " is-label-hidden"}" data-agenda-group-label="${group}">${heading}${action}</div>`;
}

function renderAgendaPlace(place, block, context) {
  const attachment = renderAgendaAttachmentButton(block, context);
  const iconKey = `place-title:${context.section ?? "agenda"}:${block.id}:${place.id}`;
  return renderPlace(place, { extraLink: attachment, showMissingLinks: true, controls: renderAgendaRemoveButton("remove-place", "Remove place"), placeIconKey: iconKey });
}

function renderAgendaAttachmentButton(block, context) {
  const section = context.section ?? "agenda";
  const label = "Download agenda attachment";
  return context.attachments?.renderDownloadButton(block.id, section, label)
    ?? `<button class="transport-attachment-button is-unavailable" type="button" data-transport-attachment data-section="${escapeHtml(section)}" data-block-id="${escapeHtml(block.id)}" aria-label="${label}" title="${label}" aria-haspopup="dialog">${renderActionIcon("file")}</button>`;
}

function renderMeals(meals, block, context) {
  const plannedMeals = ["breakfast", "lunch", "dinner"].filter((name) => meals[name].length);
  if (!plannedMeals.length) return `<p class="day-note meal-empty-banner">No meals planned.</p>${renderMealAddActions()}`;
  return ["breakfast", "lunch", "dinner"].map((name) => {
    const options = meals[name];
    const content = options.length
      ? options.map((option) => renderFoodOption(option, block, context, name)).join("")
      : renderOpenMeal(name, block, context);
    return `<section class="meal-group" data-meal="${name}"><h4>${renderMealHeading(name)}</h4><div class="food-list">${content}</div>${renderAgendaAddButton("add-food", "Add meal", { meal: name })}</section>`;
  }).join("");
}

function renderFoodOption(option, block, context, meal) {
  const links = renderEntryLinks(option, option.name, renderAgendaAttachmentButton(block, context), { showMissing: true });
  return renderCompactPlaceCard(option, links, "", { showDetails: true, imageKind: "food", entryKind: "food", meal });
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
  const nested = compactEntryMetadata(entry, options);
  const titleIcon = options.entryKind === "place" ? renderPlaceTitleIcon(entry, options.placeIconKey) : "";
  return `<article class="food-row${className}"${nested.attributes}>${nested.remove}<div class="meal-card-main"><span class="meal-card-heading"><span class="place-media"><span>${escapeHtml(initials(entry.name))}</span>${image}</span><span class="food-card-copy"><span class="place-copy"><span class="place-title-line">${titleIcon}<strong>${escapeHtml(entry.name)}</strong></span></span>${priority}</span></span>${description}</div><div class="meal-card-footer${routeClass}">${links}${routeToggle}</div></article>`;
}

function compactEntryMetadata(entry, options) {
  const attributes = [];
  if (options.imageKind) attributes.push(` data-inline-image-entry="${escapeHtml(options.imageKind)}" data-inline-image-id="${escapeHtml(entry.id)}"`);
  if (options.meal) attributes.push(` data-inline-image-meal="${escapeHtml(options.meal)}" data-meal="${escapeHtml(options.meal)}"`);
  if (options.entryKind === "food") attributes.push(` data-food-id="${escapeHtml(entry.id)}"`);
  if (options.entryKind === "place") attributes.push(` data-place-id="${escapeHtml(entry.id)}"`);
  const remove = options.entryKind
    ? renderAgendaRemoveButton(`remove-${options.entryKind}`, options.entryKind === "food" ? "Remove meal" : "Remove place")
    : "";
  return { attributes: attributes.join(""), remove };
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

function renderAgendaRemoveButton(action, label, className = "") {
  return `<button class="inline-entry-remove${className ? ` ${className}` : ""}" type="button" data-inline-agenda-action="${escapeHtml(action)}" data-inline-ignore aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${renderActionIcon("trash")}<span class="sr-only">${escapeHtml(label)}</span></button>`;
}

function renderAgendaAddButton(action, label, options = {}) {
  const meal = options.meal ? ` data-meal="${escapeHtml(options.meal)}"` : "";
  const className = options.className ? ` ${options.className}` : "";
  return `<button class="inline-entry-add${className}" type="button" data-inline-agenda-action="${escapeHtml(action)}"${meal} data-inline-ignore>${renderActionIcon("plus")}<span>${escapeHtml(label)}</span></button>`;
}

function renderMealAddActions() {
  return `<div class="inline-entry-add-group">${["breakfast", "lunch", "dinner"].map((meal) => renderAgendaAddButton("add-food", `Add ${meal}`, { meal })).join("")}</div>`;
}

function renderSaved(block, context) {
  const attachment = renderAgendaAttachmentButton(block, context);
  const titleVisible = block.data.titleVisible !== false;
  const titleAction = titleVisible
    ? renderAgendaRemoveButton("remove-title", "Remove card title", "saved-title-remove")
    : renderAgendaAddButton("restore-title", "Add card title", { className: "saved-title-restore" });
  const titleIconKey = escapeHtml(`saved-places-title:${block.id}`);
  const titleIconGlyph = renderIcon("compass-needle").replace("<svg ", `<svg data-inline-icon-key="${titleIconKey}" data-inline-icon-name="compass-needle" `);
  const titleIcon = `<span class="feature-title-icon saved-places-title-icon" aria-hidden="true">${titleIconGlyph}</span>`;
  const header = `<header class="saved-places-header feature-card-header${titleVisible ? "" : " is-title-hidden"}"><h3>${titleIcon}<span class="saved-places-title-copy">${escapeHtml(savedPlacesTitle(block.data.title))}</span></h3>${titleAction}</header>`;
  const places = block.data.places;
  const content = places.length
    ? places.map((place) => renderSavedPlace(place, attachment, block, context)).join("")
    : '<p class="day-note saved-place-empty">No places planned.</p>';
  const add = renderAgendaAddButton("add-place", "Add place");
  return `<article class="content-block saved-places">${header}<div class="saved-place-groups"><section class="saved-place-group saved-place-group-all"><div class="saved-grid">${content}</div>${add}</section></div></article>`;
}

function renderSavedPlace(place, attachment, block, context) {
  const links = renderEntryLinks(place, place.name, attachment, { showMissing: true });
  const iconKey = `place-title:${context.section ?? "places"}:${block.id}:${place.id}`;
  return renderCompactPlaceCard(place, links, "saved-place-card", { showDetails: true, imageKind: "place", entryKind: "place", placeIconKey: iconKey });
}

function renderSavedEditor(block) {
  return `<div class="content-block edit-form saved-places-editor"><label>Title<input value="${escapeHtml(savedPlacesTitle(block.data.title))}" data-block-field="title"></label><div class="list-editor">${block.data.places.map((place) => renderPlaceEditor(place)).join("")}</div><button class="inline-add" type="button" data-place-action="add">+ Add Place</button></div>`;
}

function savedPlacesTitle(value) {
  const legacyTitles = [
    "Gramado Gems", "Joias de Gramado", "Other Places of Interest", "Outros Lugares de Interesse",
    "More to Explore", "Mais para Explorar", "Other Places", "Outros lugares",
    "Restaurants and Landmarks", "Restaurantes e pontos turísticos", "Lorem ipsum",
  ];
  return legacyTitles.includes(value) ? SAVED_PLACES_TITLE : value;
}


function mealLabel(value) {
  return MEAL_LABELS[value] ?? value;
}
