import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PALETTES = new Map([
  ["periwinkle-dream", ["#6C7EE1", "#92B9E3", "#FFCAA4", "#F8A2D0", "#C688EB"]],
  ["custom-palette", ["#C73866", "#FE676E", "#FD8F52", "#FFBD71", "#FFDCA2"]],
]);
const PICKER_PALETTES = new Map([
  ["coral-olive-teal", ["#EC6E45", "#FFF5C2", "#849E32", "#D3E398", "#8DCCC1"]],
  ...PALETTES,
]);

test("picker exposes every reference palette with all five source colours", async () => {
  const [html, preferences, polish] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/app/preferences.js", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.equal((html.match(/class="[^\"]*palette-choice[^\"]*"[^>]+role="menuitemradio"/g) ?? []).length, 3);
  assert.equal((html.match(/data-custom-palette-input/g) ?? []).length, 5);
  assert.match(html, /id="customPaletteEditor"[^>]+data-inline-ignore[^>]+aria-label="Edit custom palette"/);
  assert.match(polish, /body\.is-inline-editing \.custom-palette-editor\s*\{[^}]+display:\s*grid/);
  assert.equal((polish.match(/body\.is-inline-editing \.custom-palette-editor\s*\{/g) ?? []).length, 1);
  assert.match(polish, /\.palette-choice\.is-selected \.palette-choice-check\s*\{\s*opacity:\s*1/);
  assert.match(preferences, /CUSTOM_PALETTE_KEY = "gramado-trip-custom-palette"[\s\S]+JSON\.stringify\(palette\)/);
  assert.doesNotMatch(`${html}\n${preferences}\n${polish}`, /fresh-lagoon|sunset-glow|green-blue|vivid-journey|gramado-garden|retro-arches/);
  assert.doesNotMatch(html, /palette-choice-name|--swatch:/);
  for (const [id, colours] of PICKER_PALETTES) {
    const option = html.match(new RegExp(`<button class="[^"]*palette-choice[^"]*"[^>]+data-palette="${id}"[\\s\\S]*?<\\/button>`))?.[0] ?? "";
    assert.ok(option, `${id} should be present in the picker`);
    assert.equal(option.split("<i></i>").length - 1, 5);
    colours.forEach((colour, index) => {
      const background = id === "custom-palette" ? `var(--custom-theme-${index + 1},${colour})` : colour;
      const rule = '.palette-choice[data-palette="' + id + '"] .palette-choice-swatch i:nth-child(' + (index + 1) + ') { background: ' + background + '; }';
      assert.ok(polish.includes(rule), rule);
    });
    assert.match(preferences, new RegExp('"' + id + '"'));
  }
});

test("reference palettes drive page-wide light and dark design tokens", async () => {
  const [themes, index, polish] = await Promise.all([
    readFile("src/client/styles/palette-themes.css", "utf8"),
    readFile("src/client/styles/index.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.ok(index.trimEnd().endsWith('@import url("./palette-themes.css");'));
  assert.doesNotMatch(themes, /fresh-lagoon|sunset-glow|green-blue|vivid-journey|gramado-garden|retro-arches/);
  for (const [id, colours] of PALETTES) {
    const block = themes.match(new RegExp(`:root\\[data-palette="${id}"\\] \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
    assert.ok(block, `${id} should define a theme block`);
    for (const colour of colours) assert.match(block, new RegExp(colour, "i"));
  }

  const light = themes.match(/Light themes[\s\S]*?\/\* Dark themes/)?.[0] ?? "";
  const dark = themes.match(/Dark themes[\s\S]*/)?.[0] ?? "";
  for (const token of [
    "--bg", "--surface", "--surface-soft", "--text", "--line", "--primary",
    "--accent", "--sage", "--brand-gradient", "--section-outline-gradient",
    "--card-wash-gradient", "--page-background-gradient", "--editor-accent",
    "--icon-fourth-background", "--icon-fourth-colour",
  ]) {
    assert.match(light, new RegExp(`${token}:`), `${token} should be themed in light mode`);
    assert.match(dark, new RegExp(`${token}:`), `${token} should be themed in dark mode`);
  }
  assert.match(light, /var\(--theme-1\)[\s\S]+var\(--theme-2\)[\s\S]+var\(--theme-3\)[\s\S]+var\(--theme-4\)[\s\S]+var\(--theme-5\)/);
  assert.match(dark, /\[data-theme="dark"\]\[data-palette\]/);
  assert.match(polish, /grid-template-columns:\s*72px 18px/);
  assert.match(polish, /\.palette-choice-swatch i:nth-child\(5\)/);
  assert.match(themes, /--font-control-highlight:\s*color-mix\(in srgb,var\(--gradient-olive\) 36%,var\(--surface\)\)/);
  assert.match(themes, /:root \.day-note:not\(\.place-empty-banner\):not\(\.meal-empty-banner\)\s*\{[^}]+border-left-color:\s*var\(--accent\)[^}]+background:\s*var\(--card-wash-gradient\)/);
  assert.match(themes, /:root \.language-button > span,[\s\S]+:root \.font-button > span\s*\{[^}]+background:\s*none[^}]+color:\s*#303030[^}]+-webkit-text-fill-color:\s*#303030/);
  assert.match(themes, /:root\[data-theme="dark"\] \.language-button > span,[\s\S]+:root\[data-theme="dark"\] \.font-button > span\s*\{[^}]+color:\s*#FFFFFF[^}]+-webkit-text-fill-color:\s*#FFFFFF/);
  assert.doesNotMatch(themes, /--icon-yellow-(?:background|colour):/);
  assert.match(polish, /\.nav-item\[data-view="places"\][^{]+\{[^}]+var\(--icon-fourth-colour\)[^}]+var\(--icon-fourth-background\)/);
});
