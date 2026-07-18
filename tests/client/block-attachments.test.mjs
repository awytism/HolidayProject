import assert from "node:assert/strict";
import test from "node:test";
import { shouldRenderAttachments } from "../../src/client/editor/block-editor.js";

test("hides attachments only for Listing Highlights and Landmarks Nearby", () => {
  assert.equal(shouldRenderAttachments("stay-amenities"), false);
  assert.equal(shouldRenderAttachments("stay-distances"), false);
  assert.equal(shouldRenderAttachments("stay-summary"), true);
  assert.equal(shouldRenderAttachments("flight"), true);
});
