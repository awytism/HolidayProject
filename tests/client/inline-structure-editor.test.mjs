import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inlineCardTypes } from "../../src/client/editor/inline-structure-editor.js";

test("the modern inline editor offers every current card type in every section", () => {
  const expected = [
    { type: "travel-essentials", label: "Information" },
    { type: "flight", label: "Transport" },
    { type: "stay-summary", label: "Accommodation Summary" },
    { type: "stay-amenities", label: "Listing Highlights" },
    { type: "day", label: "Day Plan" },
    { type: "saved-places", label: "Places" },
    { type: "link", label: "Link" },
    { type: "note", label: "Note" },
  ];
  for (const section of ["transport", "stay", "agenda", "places"]) {
    assert.deepEqual(inlineCardTypes(section), expected);
  }
});

test("the page uses inline structure controls without enabling the legacy form editor", async () => {
  const [main, styles, html, structureEditor] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/styles/inline-edit.css", "utf8"),
    readFile("public/index.html", "utf8"),
    readFile("src/client/editor/inline-structure-editor.js", "utf8"),
  ]);
  assert.match(main, /classList\.toggle\("is-inline-editing", state\.editing\)/);
  assert.match(main, /renderBlockEditor\([^;]+\{ renderEditing: false \}\)/);
  assert.match(main, /inlineStructureEditor\.apply\(\)/);
  assert.doesNotMatch(main, /bindBlockEditor/);
  assert.match(styles, /body\.is-inline-editing \.inline-card-remove/);
  assert.match(styles, /body\.is-inline-editing \.inline-card-add/);
  assert.match(styles, /body\.is-inline-editing \.inline-card-size/);
  assert.match(structureEditor, /select\.dataset\.inlineCardSpan/);
  assert.match(structureEditor, /controls\.className = "inline-card-controls"/);
  assert.match(styles, /\.inline-card-controls \{[\s\S]+top:\s*-44px/);
  assert.match(styles, /\.block-grid > \.editor-block \{ margin-top:\s*48px/);
  assert.match(structureEditor, /\[\[4, "1\/3"\], \[6, "1\/2"\], \[12, "Full"\]\]/);
  assert.match(html, /<section class="hero[^>]+>\s*<div>/);
});
