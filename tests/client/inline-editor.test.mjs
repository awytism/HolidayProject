import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildBilingualInlineTextUpdates } from "../../src/client/editor/inline-editor.js";

test("restores editing as an in-place text, icon and image layer", async () => {
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
  assert.match(main, /store\.beginEdit\(\)[\s\S]+render\(\)[\s\S]+elements\.brandName\.focus\(\)/);
  assert.match(main, /api\.saveDocument\([\s\S]+store\.commit\(saved\.document, saved\.revision\)/);
  assert.match(main, /imagePicker\.commit\(saved\.document\)/);
  assert.match(main, /renderBlockEditor\([^;]+\{ renderEditing: false \}\)/);
  assert.match(main, /inlineEditor\.apply\(\)/);
  assert.match(main, /inlineImageEditor\.apply\(\)/);
  assert.doesNotMatch(main, /bindBlockEditor/);
  assert.match(blockEditor, /options\.renderEditing !== false/);
  assert.match(inlineEditor, /contentEditable = String\(editing\)/);
  assert.match(inlineEditor, /meta\.inlineText/);
  assert.match(inlineEditor, /meta\.inlineIcons/);
  assert.match(inlineEditor, /\.main-nav \[data-view\]/);
  assert.match(inlineImageEditor, /data-inline-image-action/);
  assert.match(inlineImageEditor, /imagePicker\.open\(current\)/);
  assert.match(inlineImageEditor, /setPlaceCover/);
  assert.match(inlineImageEditor, /setFoodCover/);
  assert.match(inlineImageEditor, /renderActionIcon\("plus"\)/);
  assert.match(inlineEditor, /closest\("\[data-inline-static\]"\)/);
  assert.match(inlineEditor, /function lockStaticText\(\)/);
  assert.match(styles, /body\.is-inline-editing \[data-inline-text-key\]/);
  assert.match(styles, /body\.is-inline-editing \[data-inline-icon-key\]/);
  assert.match(styles, /body\.is-inline-editing \.inline-image-button/);
  assert.match(styles, /width:\s*42px;[\s\S]+height:\s*42px;[\s\S]+border-radius:\s*50%/);
  assert.match(styles, /top:\s*50%[\s\S]+left:\s*50%[\s\S]+translate\(-50%,-50%\)/);
  assert.match(index, /@import url\("\.\/inline-edit\.css"\)/);
});

test("leaves display controls outside the editable icon surface", async () => {
  const inlineEditor = await readFile("src/client/editor/inline-editor.js", "utf8");
  assert.match(inlineEditor, /const ICON_EXCLUSIONS = \[[\s\S]+"\.workspace-actions"[\s\S]+"\.mobile-actions-toggle"[\s\S]+"\.scroll-top"/);
  assert.match(inlineEditor, /TRUSTED_ICON_KEYS/);
  assert.match(inlineEditor, /class="inline-icon-grid"/);
});

test("mirrors inline edits into the other language and keeps the brand shared", () => {
  assert.deepEqual(buildBilingualInlineTextUpdates("en-GB:hero:text:0", "Our Next Adventure"), [
    ["en-GB:hero:text:0", "Our Next Adventure"],
    ["pt-BR:hero:text:0", "Nossa Próxima Aventura"],
  ]);
  assert.deepEqual(buildBilingualInlineTextUpdates("pt-BR:hero:text:0", "Nossa Próxima Aventura"), [
    ["pt-BR:hero:text:0", "Nossa Próxima Aventura"],
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
  assert.match(main, /createInlineTransportEditor\(\{ store \}\)/);
  assert.match(main, /inlineTransportEditor\.apply\(\)/);
  assert.match(controller, /directionMode/);
  assert.match(controller, /serviceType/);
  assert.match(controller, /stopCount/);
  assert.match(controller, /seatCount/);
  assert.match(styles, /body\.is-inline-editing \.transport-inline-control/);
});
