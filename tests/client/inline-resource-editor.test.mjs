import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { translateText } from "../../src/client/app/i18n.js";
import { describeInlineLink } from "../../src/client/editor/inline-resource-editor.js";

function linkTarget({ field = "mapUrl", kind, id = "entry-1", meal = "lunch", index = 0 } = {}) {
  const block = { dataset: { blockId: "block-1" } };
  const section = { dataset: { sectionRoot: "agenda" } };
  const entry = kind ? { dataset: {
    inlineImageEntry: kind,
    inlineImageId: id,
    inlineImageMeal: meal,
    inlineImageIndex: String(index),
  } } : null;
  return {
    dataset: { inlineLinkField: field },
    closest(selector) {
      if (selector === ".editor-block[data-block-id]") return block;
      if (selector === "[data-section-root]") return section;
      if (selector === "[data-inline-image-entry]") return entry;
      return null;
    },
  };
}

test("describes block, place, meal and list links for in-place editing", () => {
  assert.deepEqual(describeInlineLink(linkTarget()), {
    kind: "block", section: "agenda", blockId: "block-1", field: "mapUrl",
  });
  assert.deepEqual(describeInlineLink(linkTarget({ field: "websiteUrl", kind: "place" })), {
    kind: "place", section: "agenda", blockId: "block-1", field: "websiteUrl", placeId: "entry-1",
  });
  assert.deepEqual(describeInlineLink(linkTarget({ kind: "food" })), {
    kind: "food", section: "agenda", blockId: "block-1", field: "mapUrl", foodId: "entry-1", meal: "lunch",
  });
  assert.deepEqual(describeInlineLink(linkTarget({ kind: "list", index: 3 })), {
    kind: "list", section: "agenda", blockId: "block-1", field: "mapUrl", index: 3,
  });
});

test("wires link and document popups into the in-place editor", async () => {
  const [main, shared, links, attachments, styles] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/sections/shared.js", "utf8"),
    readFile("src/client/editor/inline-resource-editor.js", "utf8"),
    readFile("src/client/attachments/attachment-controller.js", "utf8"),
    readFile("src/client/styles/inline-edit.css", "utf8"),
  ]);
  assert.match(main, /createInlineResourceEditor\(\{ store, language, showToast, render \}\)/);
  assert.match(main, /inlineResourceEditor\.apply\(\)/);
  assert.match(shared, /data-inline-link-field/);
  assert.match(links, /className = "resource-link-dialog media-dialog"/);
  assert.match(links, /setBlockField[\s\S]+updateFoodOption[\s\S]+updatePlace/);
  assert.match(attachments, /class="attachment-editor-dialog"/);
  assert.match(attachments, /document\.body\.classList\.contains\("is-inline-editing"\)/);
  assert.match(attachments, /openAttachmentEditor\(section, blockId, trigger\)/);
  assert.match(styles, /body\.is-inline-editing \[data-inline-link-field\]/);
  assert.equal(translateText("Edit Website link", "pt-BR"), "Editar link do site");
  assert.equal(translateText("Add or manage documents", "pt-BR"), "Adicionar ou gerenciar documentos");
});
