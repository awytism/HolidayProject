import { escapeHtml, initials } from "../utils/html.js";
import { formatAgendaDate } from "../../shared/date-utils.mjs";
import {
  editField,
  newNote,
  renderEntryImage,
  renderEntryLinks,
  renderNote,
  renderPlace,
  renderPlaceEditor,
  renderPriorityBadge,
  renderPriorityControl,
} from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon } from "../ui/icon-registry.js";

export const agendaConfig = {
  eyebrow: "Nine-Day Plan",
  title: "Your Week in Gramado",
  addTypes: [
    { type: "day", label: "Day Plan" },
    { type: "saved-places", label: "Saved Places" },
    { type: "note", label: "Note" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "agenda");
    if (type === "note") return newNote("agenda");
    if (type === "saved-places") return baseBlock(type, { title: "Places to Try", places: [] });
    return baseBlock(type, {
      date: "", title: "New Plan", places: [],
      meals: { breakfast: [], lunch: [], dinner: [] }, notes: "",
    });
  },
  render(block, editing) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (block.type === "note") return renderNote(block, editing);
    if (block.type === "saved-places") return editing ? renderSavedEditor(block) : renderSaved(block);
    return editing ? renderDayEditor(block) : renderDay(block.data);
  },
};

function baseBlock(type, data) {
  return { id: `agenda-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderDay(data) {
  const places = data.places.length ? data.places.map(renderPlace).join("") : '<p class="day-note">No places allocated.</p>';
  const calendar = formatAgendaDate(data.date);
  return `<article class="content-block day-card"><header class="day-header"><div class="day-date"><div><span>${escapeHtml(calendar.month)}</span><strong>${escapeHtml(calendar.day)}</strong></div></div><div><small>${escapeHtml(calendar.weekday)}</small><h3>${escapeHtml(data.title)}</h3></div></header><div class="day-body"><p class="block-label">Main Event(s)</p><div class="place-list">${places}</div><p class="block-label">Food</p><div class="meal-grid">${renderMeals(data.meals)}</div><p class="day-note"><strong>Notes:</strong> ${escapeHtml(data.notes || "No extra notes yet.")}</p></div></article>`;
}

function renderMeals(meals) {
  return ["breakfast", "lunch", "dinner"].map((name) => {
    const options = meals[name];
    const content = options.length ? options.map(renderFoodOption).join("") : '<span class="open">Open</span>';
    return `<section class="meal-group"><h4>${titleCase(name)}</h4><div class="food-list">${content}</div></section>`;
  }).join("");
}

function renderFoodOption(option) {
  const image = renderEntryImage(option);
  return `<article class="food-row priority-${escapeHtml(option.priority)}"><span class="place-media"><span>${escapeHtml(initials(option.name))}</span>${image}</span><span class="place-copy"><strong>${escapeHtml(option.name)}</strong>${renderPriorityBadge(option.priority)}</span>${renderEntryLinks(option, option.name)}</article>`;
}

function renderDayEditor(block) {
  const data = block.data;
  const places = data.places.map(renderPlaceEditor).join("");
  return `<div class="content-block edit-form two-column">${editField("Date", "date", data.date, { type: "date" })}${editField("Day Title", "title", data.title)}<div class="full-field list-editor"><span class="block-label">Places</span>${places}<button class="inline-add" type="button" data-place-action="add">+ Add Place</button></div><div class="full-field food-editor-groups">${renderFoodEditors(data.meals)}</div>${editField("Notes", "notes", data.notes, { multiline: true, full: true })}</div>`;
}

function renderFoodEditors(meals) {
  return ["breakfast", "lunch", "dinner"].map((meal) => {
    const options = meals[meal].map((option) => renderFoodEditor(option, meal)).join("");
    return `<section class="food-meal-editor" data-meal="${meal}"><h4>${titleCase(meal)}</h4><div class="food-option-editors">${options}</div><button class="inline-add" type="button" data-food-action="add">+ Add ${titleCase(meal)} Option</button></section>`;
  }).join("");
}

function renderFoodEditor(option, meal) {
  const fields = `<div class="food-editor-fields"><input value="${escapeHtml(option.name)}" data-food-field="name" placeholder="Food Option" aria-label="${titleCase(meal)} Food Option"><input type="url" value="${escapeHtml(option.mapUrl)}" data-food-field="mapUrl" placeholder="Maps URL" aria-label="Maps URL"><input type="url" value="${escapeHtml(option.websiteUrl)}" data-food-field="websiteUrl" placeholder="Website URL" aria-label="Website URL"></div>`;
  const toolbar = `<div class="nested-toolbar" aria-label="Food Option Controls">${foodActionButton("cover", "Cover Image", "image")}${foodActionButton("up", "Move Up", "arrow-up")}${foodActionButton("down", "Move Down", "arrow-down")}${foodActionButton("delete", "Delete Food Option", "trash")}</div>`;
  return `<div class="food-option-editor" data-food-id="${escapeHtml(option.id)}">${fields}${renderPriorityControl("food", option.priority)}${toolbar}</div>`;
}

function foodActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-food-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function renderSaved(block) {
  const places = block.data.places.length ? block.data.places.map(renderPlace).join("") : '<p class="day-note">No saved places.</p>';
  return `<article class="content-block saved-places"><h3>${escapeHtml(block.data.title)}</h3><div class="saved-grid">${places}</div></article>`;
}

function renderSavedEditor(block) {
  return `<div class="content-block edit-form"><label>Title<input value="${escapeHtml(block.data.title)}" data-block-field="title"></label><div class="list-editor">${block.data.places.map(renderPlaceEditor).join("")}</div><button class="inline-add" type="button" data-place-action="add">+ Add Place</button></div>`;
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
