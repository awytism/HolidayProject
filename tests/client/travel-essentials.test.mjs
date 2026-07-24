import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addTravelEssentialFact,
  removeTravelEssentialFact,
  updateTravelEssentialFact,
  updateTravelEssentialField,
} from "../../src/client/editor/inline-travel-essentials-editor.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import {
  ICON_PICKER_CATEGORIES,
  iconPickerLabel,
  renderIcon,
} from "../../src/client/ui/icon-registry.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { migrateDocument } from "../../src/shared/document-migrations.mjs";
import { DOCUMENT_SCHEMA_VERSION, validateDocument } from "../../src/shared/document-schema.mjs";

test("seeds one full-width Information card before the transport itinerary", () => {
  const document = createDefaultDocument();
  const essentials = document.sections.transport[0];

  assert.equal(essentials.type, "travel-essentials");
  assert.equal(essentials.data.title, "INFORMATION");
  assert.equal(Object.hasOwn(essentials.data, "areaUnit"), false);
  assert.equal(Object.hasOwn(essentials.data, "emergencyNumbers"), false);
  assert.deepEqual(essentials.data.additionalFacts, []);
  assert.deepEqual(essentials.layout, { span: 12 });
  assert.equal(document.sections.transport.filter((block) => block.type === "travel-essentials").length, 1);
  assert.equal(validateDocument(document), true);
});

test("renders themed facts, structured choices, and two editable health lines", () => {
  const block = createDefaultDocument().sections.transport[0];
  const view = transportConfig.render(block, false);

  assert.equal((view.match(/class="travel-essential-pill"/g) ?? []).length, 8);
  const labels = [...view.matchAll(/travel-essential-copy"><small data-inline-static>([^<]+)/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Visa", "Language", "Currency", "Time Zone", "Driving Side", "Plug", "Voltage", "Frequency"]);
  assert.doesNotMatch(view, /Inboundge/);
  assert.match(view, /^<article class="content-block travel-essentials-card">/);
  assert.match(view, /<header class="feature-card-header information-card-header"><h3>/);
  assert.match(view, /class="feature-title-icon information-title-icon"[^>]+data-inline-ignore[^>]+aria-hidden="true"/);
  assert.ok(view.indexOf(renderIcon("information-circle")) < view.indexOf("INFORMATION"));
  assert.match(view, /data-inline-essential-field="title" data-inline-ignore>INFORMATION<\/span>/);

  assert.doesNotMatch(view, /travel-essentials-section-title|Good to Know|travel-essentials-heading-icon|Area Unit|Emergency/);
  assert.match(view, /data-inline-essential-choice="visa"/);
  assert.match(view, /data-inline-essential-choice="drivingSide"/);
  assert.match(view, /data-inline-essential-field="currency"/);
  assert.match(view, /data-inline-essential-field="healthPrecautions"/);
  assert.match(view, /data-inline-essential-field="vaccines"/);
  assert.match(view, /class="inline-entry-add travel-essential-add"[^>]+data-inline-essential-action="add-fact"/);
  assert.equal((view.match(/class="travel-health-line"/g) ?? []).length, 2);
  assert.ok(view.indexOf(renderIcon("shield")) < view.indexOf("SAFETY"));
  assert.ok(view.indexOf(renderIcon("syringe")) < view.indexOf("VACCINES"));
  assert.ok(view.indexOf("SAFETY") < view.indexOf("VACCINES"));
});

test("persists editable values and rejects invalid structured choices", () => {
  const document = createDefaultDocument();
  const essentials = document.sections.transport[0];

  assert.equal(updateTravelEssentialField(document, essentials.id, "currency", "Euro (EUR)"), true);
  assert.equal(updateTravelEssentialField(document, essentials.id, "visa", "required"), true);
  assert.equal(updateTravelEssentialField(document, essentials.id, "drivingSide", "left"), true);
  assert.equal(essentials.data.currency, "Euro (EUR)");
  assert.equal(validateDocument(document), true);

  essentials.data.visa = "maybe";
  assert.throws(() => validateDocument(document), /visa requirement/);
  essentials.data.visa = "required";
  essentials.data.drivingSide = "middle";
  assert.throws(() => validateDocument(document), /driving side/);
});

test("adds, edits, renders, validates, and removes custom Information pills", () => {
  const document = createDefaultDocument();
  const essentials = document.sections.transport[0];

  assert.equal(addTravelEssentialFact(document, essentials.id), true);
  const fact = essentials.data.additionalFacts[0];
  assert.match(fact.id, /^information-/);
  assert.equal(updateTravelEssentialFact(document, { blockId: essentials.id, factId: fact.id, field: "label", value: "Emergency Number" }), true);
  assert.equal(updateTravelEssentialFact(document, { blockId: essentials.id, factId: fact.id, field: "value", value: "190" }), true);
  assert.equal(validateDocument(document), true);

  const view = transportConfig.render(essentials, false);
  assert.equal((view.match(/class="travel-essential-pill(?: |")/g) ?? []).length, 9);
  assert.match(view, /class="travel-essential-pill travel-essential-pill-custom"/);
  assert.match(view, /data-inline-essential-fact-field="label"[^>]*>Emergency Number</);
  assert.match(view, /data-inline-essential-fact-field="value"[^>]*>190</);
  assert.match(view, new RegExp(`data-inline-icon-key="information-fact:${essentials.id}:${fact.id}"`));
  assert.match(view, /data-inline-essential-action="remove-fact"[^>]+data-travel-essential-fact-id=/);

  document.meta.inlineIcons = { [`information-fact:${essentials.id}:${fact.id}`]: "star" };
  assert.equal(removeTravelEssentialFact(document, essentials.id, fact.id), true);
  assert.deepEqual(essentials.data.additionalFacts, []);
  assert.equal(Object.hasOwn(document.meta, "inlineIcons"), false);
  assert.equal(validateDocument(document), true);
});

test("rejects malformed and duplicate custom Information pills", () => {
  const document = createDefaultDocument();
  const essentials = document.sections.transport[0];
  essentials.data.additionalFacts = [
    { id: "custom-fact", label: "First", value: "One" },
    { id: "custom-fact", label: "Second", value: "Two" },
  ];
  assert.throws(() => validateDocument(document), /additional travel fact ID/);
  essentials.data.additionalFacts[1].id = "custom-fact-two";
  essentials.data.additionalFacts[1].value = 2;
  assert.throws(() => validateDocument(document), /additional travel fact value/);
});
test("migrates version 13 trips once and keeps a collision-free card ID", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 13;
  source.sections.transport = source.sections.transport.filter((block) => block.type !== "travel-essentials");
  source.sections.transport.push({
    id: "travel-essentials",
    type: "note",
    cover: null,
    data: { title: "Existing ID", text: "Keep me" },
  });

  const migrated = migrateDocument(source);
  assert.equal(migrated.schemaVersion, DOCUMENT_SCHEMA_VERSION);
  assert.equal(migrated.sections.transport[0].type, "travel-essentials");
  assert.equal(migrated.sections.transport[0].id, "travel-essentials-2");
  assert.equal(migrated.sections.transport.filter((block) => block.type === "travel-essentials").length, 1);
});

test("puts the new glyphs in Travel & Places and renders Coin as one coin", () => {
  const requested = [
    "plug", "voltage", "frequency", "square-metre", "medicine", "syringe", "money",
  ];
  const travel = ICON_PICKER_CATEGORIES.find((category) => category.id === "travel-places");

  for (const icon of requested) assert.equal(travel.keys.includes(icon), true, icon);
  assert.equal(iconPickerLabel("coins"), "Coin");
  assert.equal(iconPickerLabel("money"), "Money");
  assert.equal((renderIcon("coins").match(/<circle/g) ?? []).length, 1);
  assert.notEqual(renderIcon("coins"), renderIcon("money"));
});

test("keeps Information fact labels title-cased and safety labels explicitly capitalised", async () => {
  const styles = await readFile("src/client/styles/travel-essentials.css", "utf8");

  assert.match(styles, /\.travel-essential-copy small,[\s\S]+\.travel-health-copy small\s*\{[^}]+letter-spacing:\s*\.02em[^}]+text-transform:\s*none/);
});
test("empty place and meal messages share the Notes treatment", async () => {
  const [agenda, styles] = await Promise.all([
    readFile("src/client/sections/agenda.js", "utf8"),
    readFile("src/client/styles/palette-themes.css", "utf8"),
  ]);

  assert.match(agenda, /class="day-note place-empty-banner">No places planned\.<\/p>/);
  assert.match(agenda, /class="day-note meal-empty-banner">No meals planned\.<\/p>/);
  assert.match(agenda, /class="day-note saved-place-empty">No places planned\.<\/p>/);
  assert.match(styles, /\.day-note\.saved-place-empty[\s\S]+min-height:\s*42px[\s\S]+border-left:\s*4px solid var\(--accent\)[\s\S]+font-weight:\s*var\(--font-weight-regular\)/);
});
test("renders bare theme-aware Information and Places of Interest title icons", async () => {
  const [themes, polish] = await Promise.all([
    readFile("src/client/styles/palette-themes.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.match(themes, /\.feature-title-icon\s*\{[^}]+border:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(themes, /\.information-title-icon\s*\{\s*color:\s*var\(--icon-coral-colour\)/);
  assert.match(themes, /\.saved-places-title-icon\s*\{\s*color:\s*var\(--icon-fourth-colour\)/);
  assert.match(polish, /Bare Places of Interest heading icon[\s\S]+\.saved-places h3\s*\{[^}]+display:\s*inline-flex[^}]+background:\s*none[^}]+-webkit-text-fill-color:\s*currentColor/);
  assert.match(polish, /\.saved-places-title-copy\s*\{[^}]+background:\s*none[^}]+color:\s*var\(--text\)[^}]+-webkit-text-fill-color:\s*currentColor/);
});
