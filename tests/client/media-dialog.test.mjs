import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("image picker uses a compact top-right close control", async () => {
  const [picker, media] = await Promise.all([
    readFile("src/client/editor/image-picker.js", "utf8"),
    readFile("src/client/styles/media.css", "utf8"),
  ]);
  assert.match(picker, /class="dialog-close" data-media-cancel aria-label="\$\{label\("Close"\)\}">×<\/button>/);
  assert.match(picker, /createImagePicker\(api, auth, showToast, translate/);
  assert.match(picker, /positionOptions\(current\?\.position, translate\)/);
  assert.match(media, /\.media-form > \.dialog-close\s*\{[^}]+position:\s*absolute[^}]+top:\s*32px[^}]+right:\s*32px[^}]+width:\s*38px[^}]+height:\s*38px/);
  assert.match(media, /\.media-form > :is\(small,h2\)\s*\{\s*padding-right:\s*52px/);
  assert.match(media, /@media\(max-width:600px\)[\s\S]+\.media-form > \.dialog-close\{top:20px;right:20px\}/);
});
