import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  changeAmenities,
  changeAnatomy,
  changeGenericList,
  changeTable,
  duplicateBlock,
  setBlockCover,
  setBlockSpan,
  toggleBlockColorHeader,
  setPlaceCover,
  updateTable,
} from "../../src/client/editor/commands.js";
import {
  editorCardTitle,
  renderBlockEditor,
  resolveDropPosition,
  scoreDirectionalTarget,
} from "../../src/client/editor/block-editor.js";
import { BUILTIN_TEMPLATES } from "../../src/client/editor/builtin-templates.js";
import { createGenericBlock } from "../../src/client/sections/generic.js";
import { instantiateTemplate, renderTemplatePrototype } from "../../src/client/editor/template-pool.js";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("edits table shape while preserving cell alignment", () => {
  const document = createDefaultDocument();
  const block = createGenericBlock("table", "transport");
  document.sections.transport.push(block);
  const base = { section: "transport", blockId: block.id };
  changeTable(document, { ...base, action: "add-column" });
  changeTable(document, { ...base, action: "add-row" });
  updateTable(document, { ...base, kind: "cell", row: 1, column: 2 }, "Value");
  assert.equal(block.data.columns.length, 3);
  assert.equal(block.data.rows[1].cells[2], "Value");
  changeTable(document, { ...base, action: "delete-column" });
  assert.equal(block.data.rows.every((row) => row.cells.length === 2), true);
});

test("names every editing card by its content type with section fallbacks", () => {
  assert.equal(editorCardTitle("flight", "transport"), "Flight");
  assert.equal(editorCardTitle("transfer", "transport"), "Ground Transfer");
  assert.equal(editorCardTitle("stay-summary", "stay"), "Accommodation Summary");
  assert.equal(editorCardTitle("stay-amenities", "stay"), "Listing Highlights");
  assert.equal(editorCardTitle("day", "agenda"), "Day Plan");
  assert.equal(editorCardTitle("saved-places", "agenda"), "Other Places");
  assert.equal(editorCardTitle("unknown", "agenda"), "Agenda");
  assert.equal(editorCardTitle("unknown", "unknown"), "Content");
});

test("renders one descriptive heading above every visible editing card", () => {
  const document = createDefaultDocument();
  const root = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  let activeSection = "transport";
  const store = { getState: () => ({ activeSection, editing: true }), getDocument: () => document };
  const visibleCounts = {
    transport: document.sections.transport.length,
    stay: document.sections.stay.filter(({ type }) => !["stay-anatomy", "essentials"].includes(type)).length,
    agenda: document.sections.agenda.length,
  };

  for (const section of ["transport", "stay", "agenda"]) {
    activeSection = section;
    renderBlockEditor(root, store, null, section);
    assert.equal((root.innerHTML.match(/class="editor-card-heading"/g) ?? []).length, visibleCounts[section]);
  }

  activeSection = "transport";
  renderBlockEditor(root, store, null, activeSection);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Flight<\/h3><button class="editor-card-delete/);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Ground Transfer<\/h3><button class="editor-card-delete/);
  assert.equal((root.innerHTML.match(/class="editor-card-delete/g) ?? []).length, document.sections.transport.length);

  activeSection = "stay";
  renderBlockEditor(root, store, null, activeSection);
  assert.doesNotMatch(root.innerHTML, /class="editor-card-delete/);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Accommodation Summary<\/h3><\/header>/);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Listing Highlights<\/h3><\/header>/);

  activeSection = "agenda";
  renderBlockEditor(root, store, null, activeSection);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Day Plan<\/h3><\/header>/);
  assert.match(root.innerHTML, /class="editor-card-heading"><h3>Other Places<\/h3><\/header>/);
});

test("regenerates nested IDs when duplicating and instantiating templates", () => {
  const document = createDefaultDocument();
  const source = document.sections.agenda[0];
  let duplicateCounter = 0;
  duplicateBlock(document, "agenda", source.id, () => `id-${++duplicateCounter}`);
  const duplicate = document.sections.agenda[1];
  assert.notEqual(duplicate.id, source.id);
  assert.notEqual(duplicate.data.places[0].id, source.data.places[0].id);

  let counter = 0;
  const instance = instantiateTemplate(source, "agenda", () => String(++counter));
  assert.notEqual(instance.id, source.id);
  assert.notEqual(instance.data.places[0].id, source.data.places[0].id);
});

test("updates covers, generic collections, amenities, and anatomy", () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport[0];
  const cover = { url: "https://example.com/cover.jpg", alt: "Cover", position: "center" };
  setBlockCover(document, "transport", transport.id, cover);
  assert.deepEqual(transport.cover, cover);

  const day = document.sections.agenda[0];
  setPlaceCover(document, { section: "agenda", blockId: day.id, placeId: day.data.places[0].id }, cover);
  assert.deepEqual(day.data.places[0].cover, cover);

  const checklist = createGenericBlock("checklist", "transport");
  document.sections.transport.push(checklist);
  changeGenericList(document, { section: "transport", blockId: checklist.id, action: "add" });
  assert.equal(checklist.data.items.length, 2);

  const amenities = document.sections.stay.find((block) => block.type === "stay-amenities");
  const group = amenities.data.groups[0];
  changeAmenities(document, { section: "stay", blockId: amenities.id, action: "add-item", groupId: group.id }, { id: "wifi", label: "Wi-Fi", iconKey: "wifi" });
  assert.equal(group.items.at(-1).presetId, "wifi");

  const anatomy = document.sections.stay.find((block) => block.type === "stay-anatomy");
  changeAnatomy(document, { section: "stay", blockId: anatomy.id, action: "add-space" });
  assert.equal(anatomy.data.spaces.at(-1).label, "Novo Quarto");
});

test("persists supported block widths", () => {
  const document = createDefaultDocument();
  const block = document.sections.transport[0];
  setBlockSpan(document, "transport", block.id, 6);
  assert.deepEqual(block.layout, { span: 6 });
  assert.equal(validateDocument(document), true);
});

test("resolves horizontal drops using the target midpoint", () => {
  const bounds = { left: 100, right: 300, top: 50, bottom: 250, width: 200, height: 200 };
  assert.equal(resolveDropPosition({ clientX: 299, clientY: 150 }, bounds), "after");
  assert.equal(resolveDropPosition({ clientX: 101, clientY: 150 }, bounds), "before");
});

test("does not mistake unequal blocks in the same visual row for vertical targets", () => {
  const source = { left: 100, right: 300, top: 50, bottom: 450 };
  const sameRow = { left: 320, right: 520, top: 50, bottom: 250 };
  const nextRow = { left: 100, right: 300, top: 480, bottom: 700 };
  assert.equal(scoreDirectionalTarget(source, sameRow, "up"), null);
  assert.equal(scoreDirectionalTarget(source, sameRow, "down"), null);
  assert.equal(typeof scoreDirectionalTarget(source, nextRow, "down"), "number");
});

test("toggles a schema-valid colorful block header", () => {
  const document = createDefaultDocument();
  const block = createGenericBlock("note", "agenda");
  document.sections.agenda.push(block);
  toggleBlockColorHeader(document, "agenda", block.id);
  assert.deepEqual(block.appearance, { colorHeader: true });
  assert.equal(validateDocument(document), true);
  toggleBlockColorHeader(document, "agenda", block.id);
  assert.deepEqual(block.appearance, { colorHeader: false });
});

test("adds custom highlights once with a trusted selected icon", () => {
  const document = createDefaultDocument();
  const amenities = document.sections.stay.find((block) => block.type === "stay-amenities");
  const [firstGroup, secondGroup] = amenities.data.groups;
  const firstContext = { section: "stay", blockId: amenities.id, action: "add-custom", groupId: firstGroup.id };
  const secondContext = { ...firstContext, groupId: secondGroup.id };

  changeAmenities(document, firstContext, { label: "  Café on arrival  ", iconKey: "coffee" });
  changeAmenities(document, secondContext, { label: "cafe  on arrival", iconKey: "home" });
  changeAmenities(document, firstContext, { label: "", iconKey: "coffee" });
  changeAmenities(document, firstContext, { label: "Unknown icon", iconKey: "not-registered" });

  const custom = amenities.data.groups.flatMap((group) => group.items)
    .filter((item) => item.presetId === "custom" && item.label === "Café on arrival");
  assert.equal(custom.length, 1);
  assert.equal(custom[0].iconKey, "home");
  assert.equal(validateDocument(document), true);
});

test("provides a decorative prototype for every built-in block", () => {
  assert.deepEqual(BUILTIN_TEMPLATES.map(({ id, type }) => [id, type]), [
    ["description", "note"], ["table", "table"], ["amenity-list", "icon-list"],
    ["image-card", "image-card"], ["checklist", "checklist"], ["facts", "facts"],
    ["link-card", "link-card"],
  ]);
  for (const template of BUILTIN_TEMPLATES) {
    const preview = renderTemplatePrototype(template.type);
    assert.match(preview, /class="template-prototype/);
    assert.match(preview, /aria-hidden="true"/);
    assert.doesNotMatch(preview, /<(a|button)\b/);
  }
});
