import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  addBlock,
  addFoodOption,
  addPlace,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  movePlace,
  setBlockField,
  setFoodCover,
  setPlaceCover,
  updatePlace,
  updateFoodOption,
} from "../../src/client/editor/commands.js";

test("adds, duplicates, moves, and deletes section blocks with stable IDs", () => {
  const document = createDefaultDocument();
  const original = document.sections.transport[0].id;
  const note = { id: "transport-test-note", type: "note", data: { title: "Test", text: "Note" } };
  addBlock(document, "transport", note);
  moveBlock(document, "transport", note.id, -1);
  assert.equal(document.sections.transport.at(-2).id, note.id);

  duplicateBlock(document, "transport", original, () => "duplicate-id");
  assert.equal(document.sections.transport[1].id, "transport-duplicate-id");
  deleteBlock(document, "transport", "transport-duplicate-id");
  assert.equal(document.sections.transport.some((block) => block.id === original), true);
});

test("updates nested meal fields and reorders nested places", () => {
  const document = createDefaultDocument();
  const block = document.sections.agenda[2];
  setBlockField(document, "agenda", block.id, "meals.breakfast", "Hotel");
  assert.equal(block.data.meals.breakfast, "Hotel");

  const firstPlace = block.data.places[0].id;
  movePlace(document, { section: "agenda", blockId: block.id, placeId: firstPlace }, 1);
  assert.equal(block.data.places[1].id, firstPlace);
  addPlace(document, "agenda", block.id);
  assert.equal(block.data.places.at(-1).name, "Novo Lugar");
});

test("updates every editable agenda travel distance and time field", () => {
  const document = createDefaultDocument();
  const block = document.sections.agenda.find((entry) => entry.type === "day" && entry.data.places.length);
  const place = block.data.places[0];
  const values = {
    drivingDistance: "12.4 km",
    drivingTime: "22 m",
    cyclingDistance: "9.8 km",
    cyclingTime: "41 m",
    walkingDistance: "8.6 km",
    walkingTime: "1 h 48 m",
  };

  for (const [property, value] of Object.entries(values)) {
    updatePlace(document, {
      section: "agenda",
      blockId: block.id,
      placeId: place.id,
      property,
    }, value);
  }

  for (const [property, value] of Object.entries(values)) assert.equal(place[property], value);
});

test("adds and updates editable meal travel times", () => {
  const document = createDefaultDocument();
  const block = document.sections.agenda.find((entry) => entry.type === "day");
  const context = { section: "agenda", blockId: block.id, meal: "breakfast" };
  addFoodOption(document, context);
  const option = block.data.meals.breakfast.at(-1);

  assert.deepEqual([
    option.drivingTime,
    option.cyclingTime,
    option.walkingTime,
  ], ["", "", ""]);

  for (const [property, value] of Object.entries({
    drivingTime: "6 m",
    cyclingTime: "12 m",
    walkingTime: "18 m",
  })) {
    updateFoodOption(document, { ...context, foodId: option.id, property }, value);
    assert.equal(option[property], value);
  }
});

test("syncs matching meal and Other Places cards while keeping their descriptions separate", () => {
  const document = createDefaultDocument();
  const day = document.sections.agenda.find((block) => (
    block.type === "day" && Object.values(block.data.meals).some((options) => options.length)
  ));
  const [meal, options] = Object.entries(day.data.meals).find(([, entries]) => entries.length);
  const food = options[0];
  const saved = document.sections.places.find((block) => block.type === "saved-places");
  const place = saved.data.places[0];
  place.name = food.name;
  place.comment = "A fuller place description";
  const foodContext = { section: "agenda", blockId: day.id, meal, foodId: food.id };
  const placeContext = { section: "places", blockId: saved.id, placeId: place.id };

  updateFoodOption(document, { ...foodContext, property: "comment" }, "A shared description");
  assert.equal(place.comment, "A fuller place description");
  updatePlace(document, { ...placeContext, property: "websiteUrl" }, "https://example.com/shared");
  assert.equal(food.websiteUrl, "https://example.com/shared");
  updateFoodOption(document, { ...foodContext, property: "name" }, "A Shared Favourite");
  assert.equal(place.name, "A Shared Favourite");

  const cover = { url: "https://example.com/shared.jpg", alt: "Shared", position: "center" };
  setPlaceCover(document, placeContext, cover);
  assert.deepEqual(food.cover, cover);
  setFoodCover(document, foodContext, null);
  assert.equal(place.cover, null);
});
