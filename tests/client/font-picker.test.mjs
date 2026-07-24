import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("offers five alphabetized font choices in a compact picker", async () => {
  const [html, tokens, base, editor, attachments, polish, preferences] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/base.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
    readFile("src/client/styles/attachments.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/app/preferences.js", "utf8"),
  ]);

  assert.match(html, /family=ABeeZee:ital@0;1&amp;family=Cause:wght@100\.\.900&amp;family=Google\+Sans\+Flex:wght@300\.\.900&amp;family=Inter:wght@300\.\.900&amp;family=Life\+Savers:wght@400;700;800&amp;display=swap/);
  assert.match(html, /id="fontFamilyToggle"[^>]+aria-label="Open font options"[^>]+aria-controls="fontFamilyMenu"/);
  const fontOrder = [...html.matchAll(/class="font-family-choice(?: is-selected)?"[^>]+data-font="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(fontOrder, ["abeezee", "cause", "google-sans", "inter", "life-savers"]);
  assert.match(html, /data-font="google-sans"[^>]+aria-label="Google Sans"[^>]+aria-checked="true"/);
  assert.match(tokens, /--font-family:\s*"Google Sans Flex",\s*sans-serif/);
  assert.match(tokens, /:root\[data-font="abeezee"\]\s*\{\s*--font-family:\s*"ABeeZee",\s*sans-serif/);
  assert.match(tokens, /:root\[data-font="cause"\]\s*\{\s*--font-family:\s*"Cause",\s*cursive/);
  assert.match(tokens, /:root\[data-font="inter"\]\s*\{\s*--font-family:\s*"Inter",\s*sans-serif/);
  assert.match(tokens, /:root\[data-font="life-savers"\]\s*\{\s*--font-family:\s*var\(--custom-font-family,"Life Savers"\),\s*cursive/);
  assert.doesNotMatch(`${html}\n${tokens}\n${polish}\n${preferences}`, /Patrick Hand|patrick-hand/);
  assert.match(polish, /\.font-family-popover\s*\{[^}]+width:\s*164px[^}]+padding:\s*6px/);
  assert.match(polish, /\.font-family-choice\s*\{[^}]+min-height:\s*34px[^}]+font-size:\s*var\(--text-caption\)/);
  assert.match(polish, /body\.is-inline-editing \.custom-font-editor\s*\{[^}]+display:\s*grid/);
  assert.match(preferences, /document\.body\?\.classList\.contains\("is-inline-editing"\) \? 244 : 164/);
  assert.match(html, /id="customFontInput"[^>]+accept="\.ttf,\.otf,\.woff,\.woff2,font\/ttf,font\/otf,font\/woff,font\/woff2"/);
  assert.match(html, /id="customFontStatus"[^>]*hidden[^>]*><\/small>/);
  assert.doesNotMatch(html, /Life Savers is used until you upload a font/);
  assert.match(preferences, /filter\(\(choice\) => choice !== customChoice\)[\s\S]+insertBefore\(customChoice, anchor\)/);
  assert.match(base, /body\s*\{[^}]+font-family:\s*var\(--font-family\)/);
  assert.match(editor, /font-family:\s*var\(--font-family\)/);
  assert.match(attachments, /font-family:\s*var\(--font-family\)/);
  assert.match(tokens, /--font-weight-regular:\s*400/);
  assert.match(tokens, /--font-weight-pill-title:\s*500/);
  assert.match(tokens, /--font-weight-title:\s*600/);
  assert.match(polish, /body \*:not\(#destination\):not\(\.brand-name\):not\(h1\)\s*\{\s*font-weight:\s*var\(--font-weight-regular\)/);
  assert.match(polish, /\.provider strong,[\s\S]+\.place-copy strong,[\s\S]+\.attachment-summary-copy strong,[\s\S]+font-weight:\s*var\(--font-weight-title\)/);
  assert.doesNotMatch(polish, /body :is\([^)]*h1/);
  assert.doesNotMatch(`${html}\n${tokens}\n${base}\n${editor}\n${attachments}`, /Roboto/);
});
