import {
  addFoodOption,
  addPlace,
  deleteFoodOption,
  deletePlace,
} from "./commands.js";

const ACTION_SELECTOR = "[data-inline-agenda-action]";
const MEALS = new Set(["breakfast", "lunch", "dinner"]);

const ACTIONS = Object.freeze({
  "remove-title": (_document, block) => setTitleVisibility(block, false),
  "restore-title": (_document, block) => setTitleVisibility(block, true),
  "remove-places-label": (_document, block) => setDayLabelVisibility(block, "placesLabelVisible", false),
  "restore-places-label": (_document, block) => setDayLabelVisibility(block, "placesLabelVisible", true),
  "remove-meals-label": (_document, block) => setDayLabelVisibility(block, "mealsLabelVisible", false),
  "restore-meals-label": (_document, block) => setDayLabelVisibility(block, "mealsLabelVisible", true),

  "add-place": addNestedPlace,
  "remove-place": removeNestedPlace,
  "add-food": addNestedFood,
  "remove-food": removeNestedFood,
});

export function createInlineAgendaEditor({ store, render, root = document }) {
  root.addEventListener("click", handleClick, true);

  return { apply() {} };

  function handleClick(event) {
    const button = event.target.closest?.(ACTION_SELECTOR);
    if (!button || !store.getState().editing) return;
    const blockElement = button.closest(".editor-block[data-block-id]");
    const section = blockElement?.closest("[data-section-root]")?.dataset.sectionRoot;
    if (!blockElement || !section) return;
    event.preventDefault();
    event.stopPropagation();

    store.setActive(section);
    store.mutate((tripDocument) => mutateAgendaBlock(tripDocument, blockElement.dataset.blockId, button, section));
    render();
  }
}

export function mutateAgendaBlock(tripDocument, blockId, control, section = "agenda") {
  const block = tripDocument.sections[section]?.find((entry) => entry.id === blockId);
  const action = ACTIONS[control.dataset.inlineAgendaAction];
  if (!block || !action) return false;
  return action(tripDocument, block, control, section);
}

function setTitleVisibility(block, visible) {
  if (block.type !== "saved-places") return false;
  block.data.titleVisible = visible;
  return true;
}

function setDayLabelVisibility(block, field, visible) {
  if (block.type !== "day") return false;
  block.data[field] = visible;
  return true;
}

function addNestedPlace(tripDocument, block, _control, section) {
  addPlace(tripDocument, section, block.id);
  return true;
}

function removeNestedPlace(tripDocument, block, control, section) {
  const placeId = control.closest("[data-place-id]")?.dataset.placeId;
  if (!placeId) return false;
  deletePlace(tripDocument, { section, blockId: block.id, placeId });
  return true;
}

function addNestedFood(tripDocument, block, control, section) {
  const meal = agendaMeal(control);
  if (block.type !== "day" || !meal) return false;
  addFoodOption(tripDocument, { section, blockId: block.id, meal });
  return true;
}

function removeNestedFood(tripDocument, block, control, section) {
  const meal = agendaMeal(control);
  const foodId = control.closest("[data-food-id]")?.dataset.foodId;
  if (block.type !== "day" || !meal || !foodId) return false;
  deleteFoodOption(tripDocument, { section, blockId: block.id, meal, foodId });
  return true;
}

function agendaMeal(control) {
  const meal = control.dataset.meal || control.closest("[data-meal]")?.dataset.meal;
  return MEALS.has(meal) ? meal : null;
}