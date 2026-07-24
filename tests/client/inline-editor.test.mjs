import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildBilingualInlineTextUpdates } from "../../src/client/editor/inline-editor.js";

test("restores editing as an in-place text, icon, image and structure layer", async () => {
  const [main, inlineEditor, inlineImageEditor, blockEditor, styles, index] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/editor/inline-editor.js", "utf8"),
    readFile("src/client/editor/inline-image-editor.js", "utf8"),
    readFile("src/client/editor/block-editor.js", "utf8"),
    readFile("src/client/styles/inline-edit.css", "utf8"),
    readFile("src/client/styles/index.css", "utf8"),
  ]);

  assert.match(main, /createInlineEditor\(\{ store, language, showToast \}\)/);
  assert.match(main, /createImagePicker\(api, auth, showToast, \(value\) => language\.translate\(value\)\)/);
  assert.match(main, /createInlineImageEditor\(\{ store, imagePicker, language, render \}\)/);
  assert.match(main, /store\.beginEdit\(\)[\s\S]+render\(\)[\s\S]+elements\.destination\.focus\(\)/);
  assert.match(main, /const itineraryLabel = language\.translate\("Itinerary"\)[\s\S]+elements\.brandName\.contentEditable = "false"[\s\S]+delete elements\.brandName\.dataset\.metaField/);
  assert.match(main, /api\.saveDocument\([\s\S]+store\.commit\(saved\.document, saved\.revision\)/);
  assert.match(main, /imagePicker\.commit\(saved\.document\)/);
  assert.match(main, /renderBlockEditor\([^;]+\{ renderEditing: false \}\)/);
  assert.match(main, /inlineEditor\.apply\(\)/);
  assert.match(main, /inlineImageEditor\.apply\(\)/);
  assert.match(main, /inlineStructureEditor\.apply\(\)/);
  assert.doesNotMatch(main, /bindBlockEditor/);
  assert.match(main, /document\.body\.classList\.toggle\("is-inline-editing", state\.editing\)/);
  assert.match(blockEditor, /options\.renderEditing !== false/);
  assert.match(inlineEditor, /contentEditable = String\(editing\)/);
  assert.match(inlineEditor, /meta\.inlineText/);
  assert.match(inlineEditor, /meta\.inlineIcons/);
  assert.match(inlineEditor, /key: element\.dataset\.inlineIconKey \|\|/);
  assert.match(inlineEditor, /\$\{scopeKey\}:icon:\$\{index\}/);
  assert.match(inlineEditor, /svg\.dataset\.inlineIconName/);
  assert.match(inlineEditor, /mirrorNavigationIcon/);
  assert.match(inlineImageEditor, /data-inline-image-action/);
  assert.match(inlineImageEditor, /imagePicker\.open\(current\)/);
  assert.match(inlineImageEditor, /setPlaceCover/);
  assert.match(inlineImageEditor, /setFoodCover/);
  assert.match(inlineImageEditor, /renderActionIcon\("plus"\)/);
  assert.match(inlineEditor, /closest\("\[data-inline-static\]"\)/);
  assert.match(inlineEditor, /function lockStaticText\(\)/);
  assert.doesNotMatch(inlineEditor, /add\("brand", "#brandName"/);
  assert.match(styles, /body\.is-inline-editing \[data-inline-text-key\]/);
  assert.match(styles, /outline-offset:\s*-2px/);
  assert.match(styles, /box-decoration-break:\s*clone/);
  assert.match(styles, /body\.is-inline-editing \[data-inline-icon-key\]/);
  assert.match(styles, /body\.is-inline-editing \.inline-image-button/);
  assert.match(styles, /width:\s*42px;[\s\S]+height:\s*42px;[\s\S]+border-radius:\s*50%/);
  assert.match(styles, /top:\s*50%[\s\S]+left:\s*50%[\s\S]+translate\(-50%,-50%\)/);
  assert.match(index, /@import url\("\.\/inline-edit\.css"\)/);
});

test("keeps the browser title synchronized with the editable trip title", async () => {
  const [main, inlineEditor, i18n] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/editor/inline-editor.js", "utf8"),
    readFile("src/client/app/i18n.js", "utf8"),
  ]);

  assert.match(main, /inlineEditor\.apply\(\);\s+synchronizeBrowserTitle\(\);/);
  assert.match(main, /document\.title = elements\.destination\.textContent\.trim\(\) \|\| "Travel Plan"/);
  assert.match(inlineEditor, /target\.closest\?\.\("#destination"\)/);
  assert.match(inlineEditor, /root\.title = value \|\| "Travel Plan"/);
  assert.match(i18n, /root\.querySelector\("#destination"\)\?\.textContent\.trim\(\) \|\| "Travel Plan"/);
});

test("leaves display controls outside the editable icon surface", async () => {
  const inlineEditor = await readFile("src/client/editor/inline-editor.js", "utf8");
  assert.match(inlineEditor, /const ICON_EXCLUSIONS = \[[\s\S]+"\.workspace-actions"[\s\S]+"\.mobile-actions-toggle"[\s\S]+"\.scroll-top"/);
  assert.match(inlineEditor, /ICON_PICKER_CATEGORIES/);
  assert.match(inlineEditor, /class="inline-icon-grid"/);
  assert.match(inlineEditor, /class="inline-icon-category"/);
  assert.match(inlineEditor, /filterIconChoices/);
  assert.match(inlineEditor, /updateStayAmenityIcon/);
  assert.match(inlineEditor, /amenity-item:\$\{target\.dataset\.amenityItemId\}/);
});

test("mirrors inline edits into the other language and keeps the brand shared", () => {
  assert.deepEqual(buildBilingualInlineTextUpdates("en-GB:hero:text:0", "Our Next Adventure"), [
    ["en-GB:hero:text:0", "Our Next Adventure"],
    ["pt-BR:hero:text:0", "Nossa próxima aventura"],
  ]);
  assert.deepEqual(buildBilingualInlineTextUpdates("pt-BR:hero:text:0", "Nossa próxima aventura"), [
    ["pt-BR:hero:text:0", "Nossa próxima aventura"],
    ["en-GB:hero:text:0", "Our Next Adventure"],
  ]);
  assert.deepEqual(buildBilingualInlineTextUpdates("shared:brand:text:0", "Dudu & Ale"), [
    ["shared:brand:text:0", "Dudu & Ale"],
  ]);
});

test("adds structured in-place choices to transport cards", async () => {
  const [main, controller, styles] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/editor/inline-transport-editor.js", "utf8"),
    readFile("src/client/styles/inline-edit.css", "utf8"),
  ]);
  assert.match(main, /createInlineTransportEditor\(\{ store, render \}\)/);
  assert.match(main, /inlineTransportEditor\.apply\(\)/);
  assert.match(controller, /directionMode/);
  assert.match(controller, /serviceType/);
  assert.match(controller, /stopCount/);
  assert.match(controller, /seatCount/);
  assert.match(controller, /data\.notesVisible = visible/);
  assert.match(controller, /restore-notes/);
  assert.match(styles, /body\.is-inline-editing \.transport-inline-control/);
});
