import {
  addFoodOption,
  addPlace,
  deleteFoodOption,
  deletePlace,
  moveFoodOption,
  movePlace,
  setFoodCover,
  setPlaceCover,
  updateFoodOption,
  updatePlace,
} from "./commands.js";

export function runPlaceAction(button, context) {
  const data = entryContext(button, context, "place");
  const action = button.dataset.placeAction;
  if (action === "cover") return chooseEntryCover(context, data, "places", setPlaceCover);
  mutate(context, (document) => {
    if (action === "add") addPlace(document, data.section, data.blockId);
    if (action === "up") movePlace(document, data, -1);
    if (action === "down") movePlace(document, data, 1);
    if (action === "delete") deletePlace(document, data);
    if (action === "priority") updatePlace(document, { ...data, property: "priority" }, button.dataset.priority);
  });
}

export function updatePlaceInput(target, block, context) {
  const place = target.closest("[data-place-id]");
  const data = makeContext(context, block, {
    placeId: place.dataset.placeId,
    property: target.dataset.placeField,
  });
  context.store.mutate((document) => updatePlace(document, data, target.value));
}

export function runFoodAction(button, context) {
  const data = entryContext(button, context, "food");
  const action = button.dataset.foodAction;
  if (action === "cover") return chooseEntryCover(context, data, "food", setFoodCover);
  mutate(context, (document) => {
    if (action === "add") addFoodOption(document, data);
    if (action === "up") moveFoodOption(document, data, -1);
    if (action === "down") moveFoodOption(document, data, 1);
    if (action === "delete") deleteFoodOption(document, data);
    if (action === "priority") updateFoodOption(document, { ...data, property: "priority" }, button.dataset.priority);
  });
}

export function updateFoodInput(target, block, context) {
  const food = target.closest("[data-food-id]");
  const data = makeContext(context, block, {
    meal: target.closest("[data-meal]").dataset.meal,
    foodId: food.dataset.foodId,
    property: target.dataset.foodField,
  });
  context.store.mutate((document) => updateFoodOption(document, data, target.value));
}

function entryContext(button, context, kind) {
  const block = button.closest(".editor-block");
  const meal = button.closest("[data-meal]")?.dataset.meal;
  const entry = button.closest(`[data-${kind}-id]`);
  return makeContext(context, block, {
    meal,
    [`${kind}Id`]: entry?.dataset[`${kind}Id`],
  });
}

async function chooseEntryCover(context, data, collection, setter) {
  const block = context.store.getDocument().sections[data.section].find((item) => item.id === data.blockId);
  const entries = collection === "places" ? block.data.places : block.data.meals[data.meal];
  const id = collection === "places" ? data.placeId : data.foodId;
  const current = entries.find((item) => item.id === id).cover;
  const cover = await context.imagePicker.open(current);
  if (cover === undefined) return;
  context.store.mutate((document) => setter(document, data, cover));
  context.render();
}

function makeContext(context, block, extras) {
  return {
    section: context.store.getState().activeSection,
    blockId: block.dataset.blockId,
    ...extras,
  };
}

function mutate(context, operation) {
  context.store.mutate(operation);
  context.render();
}
