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
} from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon } from "../ui/icon-registry.js";

const MEAL_LABELS = Object.freeze({ breakfast: "Café da Manhã", lunch: "Almoço", dinner: "Jantar" });

export const agendaConfig = {
  eyebrow: "Roteiro de Nove Dias",
  title: "Roteiro de Nove Dias",
  addTypes: [
    { type: "day", label: "Plano do Dia" },
    { type: "saved-places", label: "Lugares Salvos" },
    { type: "note", label: "Nota" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "agenda");
    if (type === "note") return newNote("agenda");
    if (type === "saved-places") return baseBlock(type, { title: "Outros Lugares para Conhecer", places: [] });
    return baseBlock(type, {
      date: "", title: "Novo Plano", places: [],
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
  const places = data.places.length ? data.places.map(renderPlace).join("") : '<p class="day-note">Nenhum lugar planejado.</p>';
  const calendar = formatAgendaDate(data.date);
  return `<article class="content-block day-card"><header class="day-header"><div class="day-date"><div><span>${escapeHtml(calendar.month)}</span><strong>${escapeHtml(calendar.day)}</strong></div></div><div><small>${escapeHtml(calendar.weekday)}</small><h3>${escapeHtml(data.title)}</h3></div></header><div class="day-body"><p class="block-label">Atividade(s) Principal(is)</p><div class="place-list">${places}</div><p class="block-label">Alimentação</p><div class="meal-grid">${renderMeals(data.meals)}</div><p class="day-note"><strong>Observações:</strong> ${escapeHtml(data.notes || "Nenhuma observação adicional.")}</p></div></article>`;
}

function renderMeals(meals) {
  return ["breakfast", "lunch", "dinner"].map((name) => {
    const options = meals[name];
    const content = options.length ? options.map(renderFoodOption).join("") : '<span class="open">Em aberto</span>';
    return `<section class="meal-group"><h4>${mealLabel(name)}</h4><div class="food-list">${content}</div></section>`;
  }).join("");
}

function renderFoodOption(option) {
  const image = renderEntryImage(option);
  return `<article class="food-row"><span class="place-media"><span>${escapeHtml(initials(option.name))}</span>${image}</span><span class="place-copy"><strong>${escapeHtml(option.name)}</strong></span>${renderEntryLinks(option, option.name)}</article>`;
}

function renderDayEditor(block) {
  const data = block.data;
  const places = data.places.map(renderPlaceEditor).join("");
  return `<div class="content-block edit-form two-column">${editField("Data", "date", data.date, { type: "date" })}${editField("Título do Dia", "title", data.title)}<div class="full-field list-editor"><span class="block-label">Lugares</span>${places}<button class="inline-add" type="button" data-place-action="add">+ Adicionar Lugar</button></div><div class="full-field food-editor-groups">${renderFoodEditors(data.meals)}</div>${editField("Observações", "notes", data.notes, { multiline: true, full: true })}</div>`;
}

function renderFoodEditors(meals) {
  return ["breakfast", "lunch", "dinner"].map((meal) => {
    const options = meals[meal].map((option) => renderFoodEditor(option, meal)).join("");
    return `<section class="food-meal-editor" data-meal="${meal}"><h4>${mealLabel(meal)}</h4><div class="food-option-editors">${options}</div><button class="inline-add" type="button" data-food-action="add">+ Adicionar Opção de ${mealLabel(meal)}</button></section>`;
  }).join("");
}

function renderFoodEditor(option, meal) {
  const fields = `<div class="food-editor-fields"><input value="${escapeHtml(option.name)}" data-food-field="name" placeholder="Opção de Refeição" aria-label="${mealLabel(meal)} Opção de Refeição"><input type="url" value="${escapeHtml(option.mapUrl)}" data-food-field="mapUrl" placeholder="URL do Google Maps" aria-label="URL do Google Maps"><input type="url" value="${escapeHtml(option.websiteUrl)}" data-food-field="websiteUrl" placeholder="URL do site" aria-label="URL do site"></div>`;
  const toolbar = `<div class="nested-toolbar" aria-label="Controles da Opção de Refeição">${foodActionButton("cover", "Imagem de capa", "image")}${foodActionButton("up", "Mover para cima", "arrow-up")}${foodActionButton("down", "Mover para baixo", "arrow-down")}${foodActionButton("delete", "Excluir Opção de Refeição", "trash")}</div>`;
  return `<div class="food-option-editor" data-food-id="${escapeHtml(option.id)}">${fields}${toolbar}</div>`;
}

function foodActionButton(action, label, icon) {
  return `<button class="toolbar-icon" type="button" data-food-action="${action}" data-tooltip="${label}" aria-label="${label}">${renderActionIcon(icon)}</button>`;
}

function renderSaved(block) {
  const places = block.data.places.length ? block.data.places.map(renderPlace).join("") : '<p class="day-note">Nenhum lugar salvo.</p>';
  return `<article class="content-block saved-places"><h3>${escapeHtml(block.data.title)}</h3><div class="saved-grid">${places}</div></article>`;
}

function renderSavedEditor(block) {
  return `<div class="content-block edit-form"><label>Título<input value="${escapeHtml(block.data.title)}" data-block-field="title"></label><div class="list-editor">${block.data.places.map(renderPlaceEditor).join("")}</div><button class="inline-add" type="button" data-place-action="add">+ Adicionar Lugar</button></div>`;
}

function mealLabel(value) {
  return MEAL_LABELS[value] ?? value;
}
