import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { updateThemedFavicon } from "../../src/client/app/favicon.js";

test("uses the supplied artwork as the site favicon", async () => {
  const [html, favicon] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("public/assets/brand/favicon.png"),
  ]);
  assert.match(html, /<link rel="icon" id="siteFavicon" href="\/assets\/brand\/favicon\.png" type="image\/png">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/assets\/brand\/favicon\.png">/);
  assert.deepEqual([...favicon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const image = sharp(favicon).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.hasAlpha, true);
  const cornerAlpha = [
    data[3],
    data[(info.width - 1) * 4 + 3],
    data[(info.height - 1) * info.width * 4 + 3],
    data[(info.width * info.height - 1) * 4 + 3],
  ];
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0]);

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assert.ok(maxX - minX + 1 >= 350, "favicon artwork should remain legible across the canvas width");
  assert.ok(maxY - minY + 1 >= 480, "favicon artwork should fill nearly the entire canvas height");

  const link = {};
  updateThemedFavicon({ querySelector: (selector) => selector === "#siteFavicon" ? link : null });
  assert.deepEqual(link, { type: "image/png", href: "/assets/brand/favicon.png" });
});