import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { documentImageReferences, stripDocumentImages } from "../../src/shared/document-images.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("removes every document image without mutating the source", () => {
  const source = createDefaultDocument();
  source.meta.heroCover = {
    url: "/assets/brand/gramado-logo.svg",
    alt: "Hero",
    position: "center",
  };
  const referenceCount = documentImageReferences(source).length;

  const result = stripDocumentImages(source);

  assert.ok(referenceCount > 0);
  assert.equal(validateDocument(result), true);
  assert.equal(documentImageReferences(result).length, 0);
  assert.equal(documentImageReferences(source).length, referenceCount);
  assert.equal(result.meta.heroCover, null);
  assert.equal(result.sections.stay[0].cover, null);
  assert.equal(result.sections.agenda[0].data.places[0].image, "");
});

test("image removal is idempotent", () => {
  const once = stripDocumentImages(createDefaultDocument());
  assert.deepEqual(stripDocumentImages(once), once);
});
