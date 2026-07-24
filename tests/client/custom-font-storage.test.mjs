import assert from "node:assert/strict";
import test from "node:test";
import { customFontLabelFromName, validateCustomFontFile } from "../../src/client/app/custom-font-storage.js";

test("accepts the four supported custom-font formats and derives friendly labels", () => {
  const formats = [
    ["My_Family.ttf", "font/ttf"],
    ["Holiday-Display.otf", "font/otf"],
    ["Compact Sans.woff", "font/woff"],
    ["Friendly Script.woff2", "font/woff2"],
  ];
  for (const [name, type] of formats) {
    const result = validateCustomFontFile({ name, type, size: 1024 });
    assert.equal(result.extension, name.split(".").at(-1));
  }
  assert.equal(customFontLabelFromName("C:\\fonts\\My_Family.ttf"), "My Family");
  assert.equal(customFontLabelFromName(""), "Life Savers");
});

test("rejects unsupported, empty, and oversized custom font uploads", () => {
  assert.throws(() => validateCustomFontFile({ name: "font.txt", type: "text/plain", size: 100 }), /\.ttf/);
  assert.throws(() => validateCustomFontFile({ name: "font.ttf", type: "font/ttf", size: 0 }), /empty/);
  assert.throws(() => validateCustomFontFile({ name: "font.woff2", type: "font/woff2", size: 5 * 1024 * 1024 + 1 }), /5 MB/);
});