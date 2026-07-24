import assert from "node:assert/strict";
import test from "node:test";
import {
  mutateStayBlock,
  propertyPills,
  updateStayNestedText,
} from "../../src/client/editor/inline-stay-editor.js";
import { stayConfig } from "../../src/client/sections/stay.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("stay summary property pills are editable, removable, and addable", () => {
  const document = createDefaultDocument();
  const summary = document.sections.stay.find((block) => block.type === "stay-summary");
  const firstPill = propertyPills(summary.data)[0];

  assert.equal(mutateStayBlock(document, summary.id, control("remove-pill", { stayPillId: firstPill.id })), true);
  assert.equal(summary.data.propertyPills.length, 3);
  assert.equal(mutateStayBlock(document, summary.id, control("add-pill")), true);
  assert.equal(summary.data.propertyPills.length, 4);

  const added = summary.data.propertyPills.at(-1);
  assert.equal(updateStayNestedText(document, summary.id, {
    dataset: { inlineStayField: "pill-label", stayPillId: added.id },
  }, "Late checkout"), true);
  assert.equal(added.label, "Late checkout");

  const view = stayConfig.render(summary, false);
  assert.match(view, /data-inline-stay-action="remove-pill"/);
  assert.match(view, /data-inline-stay-action="add-pill"/);
  assert.match(view, /data-inline-stay-field="pill-label"/);
  assert.equal(validateDocument(document), true);
});

test("Listing Highlights groups and entries are editable, removable, and addable", () => {
  const document = createDefaultDocument();
  const highlights = document.sections.stay.find((block) => block.type === "stay-amenities");
  const firstGroup = highlights.data.groups[0];
  const firstItem = firstGroup.items[0];

  assert.equal(mutateStayBlock(document, highlights.id, control("remove-item", {
    amenityGroupId: firstGroup.id,
    amenityItemId: firstItem.id,
  })), true);
  assert.equal(firstGroup.items.length, 3);
  assert.equal(mutateStayBlock(document, highlights.id, control("add-item", { amenityGroupId: firstGroup.id })), true);
  assert.equal(firstGroup.items.length, 4);

  assert.equal(updateStayNestedText(document, highlights.id, {
    dataset: { inlineStayField: "group-label", amenityGroupId: firstGroup.id },
  }, "Kitchen favourites"), true);
  assert.equal(updateStayNestedText(document, highlights.id, {
    dataset: {
      inlineStayField: "item-label",
      amenityGroupId: firstGroup.id,
      amenityItemId: firstGroup.items.at(-1).id,
    },
  }, "Espresso machine"), true);

  const groupCount = highlights.data.groups.length;
  assert.equal(mutateStayBlock(document, highlights.id, control("remove-group", { amenityGroupId: firstGroup.id })), true);
  assert.equal(highlights.data.groups.length, groupCount - 1);
  assert.equal(mutateStayBlock(document, highlights.id, control("add-group")), true);
  assert.equal(highlights.data.groups.length, groupCount);

  const view = stayConfig.render(highlights, false);
  assert.match(view, /data-inline-stay-action="remove-group"/);
  assert.match(view, /data-inline-stay-action="add-group"/);
  assert.match(view, /data-inline-stay-action="remove-item"/);
  assert.match(view, /data-inline-stay-action="add-item"/);
  assert.equal(validateDocument(document), true);
});

function control(inlineStayAction, data = {}) {
  return { dataset: { inlineStayAction, ...data } };
}
