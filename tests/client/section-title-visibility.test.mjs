import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  isHeroVisible,
  isSectionTitleVisible,
  setHeroVisible,
  setSectionTitleVisible,
} from "../../src/client/app/section-title-visibility.js";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("section title pills can be removed and restored without losing their text", () => {
  const document = createDefaultDocument();
  document.meta.transportTitle = "My itinerary";

  setSectionTitleVisible(document, "transport", false);
  assert.equal(isSectionTitleVisible(document.meta, "transport"), false);
  assert.equal(document.meta.transportTitle, "My itinerary");
  assert.deepEqual(document.meta.hiddenSectionTitles, ["transport"]);
  assert.equal(validateDocument(document), true);

  setSectionTitleVisible(document, "transport", true);
  assert.equal(isSectionTitleVisible(document.meta, "transport"), true);
  assert.equal(document.meta.transportTitle, "My itinerary");
  assert.equal(Object.hasOwn(document.meta, "hiddenSectionTitles"), false);
});

test("section title visibility stays ordered, unique, and rejects unknown sections", () => {
  const document = createDefaultDocument();
  setSectionTitleVisible(document, "agenda", false);
  setSectionTitleVisible(document, "places", false);
  setSectionTitleVisible(document, "transport", false);
  setSectionTitleVisible(document, "agenda", false);

  assert.deepEqual(document.meta.hiddenSectionTitles, ["transport", "agenda", "places"]);
  assert.throws(() => setSectionTitleVisible(document, "unknown", false), /Unknown section/);

  document.meta.hiddenSectionTitles = ["transport", "transport"];
  assert.throws(() => validateDocument(document), /Invalid hidden section titles/);
});

test("hero banner can be removed and restored without losing its content", () => {
  const document = createDefaultDocument();
  const destination = document.meta.destination;

  setHeroVisible(document, false);
  assert.equal(isHeroVisible(document.meta), false);
  assert.equal(document.meta.destination, destination);
  assert.equal(document.meta.hiddenHero, true);
  assert.equal(validateDocument(document), true);

  setHeroVisible(document, true);
  assert.equal(isHeroVisible(document.meta), true);
  assert.equal(document.meta.destination, destination);
  assert.equal(Object.hasOwn(document.meta, "hiddenHero"), false);
});

test("hero visibility only accepts a boolean document flag", () => {
  const document = createDefaultDocument();
  document.meta.hiddenHero = "yes";
  assert.throws(() => validateDocument(document), /Invalid hidden hero flag/);
});