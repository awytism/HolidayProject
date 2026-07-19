import assert from "node:assert/strict";
import test from "node:test";
import { shouldRenderAttachments } from "../../src/client/editor/block-editor.js";

test("hides attachments for cards that should stay focused on their content", () => {
  assert.equal(shouldRenderAttachments("stay-amenities"), false);
  assert.equal(shouldRenderAttachments("stay-distances"), false);
  assert.equal(shouldRenderAttachments("saved-places"), false);
  assert.equal(shouldRenderAttachments("stay-summary"), false);
  assert.equal(shouldRenderAttachments("flight"), false);
  assert.equal(shouldRenderAttachments("transfer"), false);
  assert.equal(shouldRenderAttachments("day"), false);
  assert.equal(shouldRenderAttachments("flight", true), true);
  assert.equal(shouldRenderAttachments("transfer", true), true);
  assert.equal(shouldRenderAttachments("stay-summary", true), true);
  assert.equal(shouldRenderAttachments("day", true), true);
});
