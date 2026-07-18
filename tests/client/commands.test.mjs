import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  addBlock,
  addPlace,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  movePlace,
  setBlockField,
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
  assert.equal(block.data.places.at(-1).name, "New Place");
});
