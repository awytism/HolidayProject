import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("page shell exposes one continuous trip page and accessible global controls", async () => {
  const html = await readFile("public/index.html", "utf8");
  assert.doesNotMatch(html, /<footer/i);
  assert.match(html, /id="scrollTop"[^>]+aria-label="Scroll to top"/);
  assert.match(html, /id="fontDecrease"/);
  assert.match(html, /id="fontIncrease"/);
  assert.match(html, /<header class="workspace-bar">/);
  assert.equal((html.match(/data-section-root=/g) ?? []).length, 3);
  assert.match(html, /id="transportRoot"/);
  assert.match(html, /id="stayRoot"/);
  assert.match(html, /id="agendaRoot"/);
});

test("single blue menu removes the L&A icon and palette chooser", async () => {
  const [html, tokens, layout, preferences] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/app/preferences.js", "utf8"),
  ]);
  assert.doesNotMatch(html, /brand-mark|brand-mark-plane|rel="icon"|data-palette|palette-picker/);
  assert.match(html, /class="brand-wordmark"[^>]*><strong>L&amp;A/);
  assert.match(html, /class="workspace-actions"/);
  assert.doesNotMatch(tokens, /data-palette|#f6dc82|#fffaf0/);
  assert.doesNotMatch(layout, /topbar|palette-picker|brand-mark/);
  assert.doesNotMatch(preferences, /PALETTE_KEY|setPalette|palettes/);
});

test("toolbar tooltips reset icon typography and keep the leading drag label on-screen", async () => {
  const [editor, blockEditor] = await Promise.all([
    readFile("src/client/styles/editor.css", "utf8"),
    readFile("src/client/editor/block-editor.js", "utf8"),
  ]);
  assert.match(editor, /\.toolbar-icon\[data-tooltip\]::after[^}]+letter-spacing:\s*normal/);
  assert.match(editor, /\.toolbar-icon\[data-tooltip\]::after[^}]+text-transform:\s*none/);
  assert.match(editor, /data-tooltip-align="start"[^}]+left:\s*0/);
  assert.match(blockEditor, /className:\s*"drag-handle"[^}]+align:\s*"start"/);
});
test("groups section navigation beside the brand and uses non-link pill headings", async () => {
  const [html, layout, main] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/main.js", "utf8"),
  ]);

  assert.equal((html.match(/<h2 class="section-pill"/g) ?? []).length, 3);
  assert.match(html, /id="transportTitle">Full Itinerary<\/h2>/);
  assert.match(html, /id="stayTitle">Home Base<\/h2>/);
  assert.match(html, /id="agendaTitle">Nine-Day Plan<\/h2>/);
  assert.doesNotMatch(html, /data-section-link|<a class="section-pill"/);
  assert.doesNotMatch(html, /Route at a Glance|Stay in Gramado|Week in Gramado/);
  assert.match(layout, /\.main-nav[^}]+justify-self:\s*start[^}]+border-left:/);
  assert.match(layout, /\.section-pill[^}]+text-transform:\s*uppercase/);
  assert.match(main, /transport:\s*document\.querySelector\("#transportTitle"\)/);
  assert.match(main, /switchSection\("transport", elements\.hero\)/);
  assert.doesNotMatch(main, /sectionLinks|data-section-link/);
});

test("renders three equal translucent hero cards with blue labels and distinct icons", async () => {
  const [html, layout] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
  ]);

  assert.equal((html.match(/<div class="stat">/g) ?? []).length, 3);
  assert.equal((html.match(/class="stat-icon"/g) ?? []).length, 3);
  assert.match(html, /<small>Date<\/small>/);
  assert.doesNotMatch(html, /Travel Dates/);
  assert.match(layout, /\.hero-stats[^}]+repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(layout, /\.stat[^}]+background:\s*color-mix\([^}]+68%/);
  assert.match(layout, /\.stat small[^}]+color:\s*var\(--blue\)/);
});
