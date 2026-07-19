import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dropdown controls share polished chevrons, focus states and motion", async () => {
  const [index, controls] = await Promise.all([
    readFile("src/client/styles/index.css", "utf8"),
    readFile("src/client/styles/dropdown-controls.css", "utf8"),
  ]);

  assert.match(index, /@import url\("\.\/dropdown-controls\.css"\);/);
  assert.match(controls, /select:not\(\[multiple\]\)\s*\{[^}]+appearance:\s*none[^}]+background-image:/);
  assert.match(controls, /select:not\(\[multiple\]\):focus-visible\s*\{[^}]+box-shadow:/);
  assert.match(controls, /:is\(\.priority-picker,\.custom-amenity\) > summary::after/);
  assert.match(controls, /\[open\] > summary::after\s*\{[^}]+rotate\(225deg\)/);
  assert.match(controls, /@keyframes dropdown-panel-in/);
  assert.match(controls, /@media \(prefers-reduced-motion: reduce\)/);
});
