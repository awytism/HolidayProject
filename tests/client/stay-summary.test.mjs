import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { stayConfig } from "../../src/client/sections/stay.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("section titles match the linked pill labels", () => {
  assert.equal(transportConfig.title, "Full Itinerary");
  assert.equal(stayConfig.title, "Home Base");
  assert.equal(agendaConfig.title, "Nine-Day Plan");
});

test("Stay summary renders editable times and Agenda-style safe links", () => {
  const block = createDefaultDocument().sections.stay.find((entry) => entry.type === "stay-summary");
  block.data.checkinTime = "15:00";
  block.data.checkoutTime = "11:00";

  const view = stayConfig.render(block, false);
  const editor = stayConfig.render(block, true);
  assert.match(view, /class="map-link"/);
  assert.match(view, /class="website-link"/);
  assert.equal((view.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(view, /class="stay-title-row"[^]+class="entry-links"/);
  assert.match(view, /class="stay-time">15:00</);
  assert.match(view, /class="stay-time">11:00</);
  assert.doesNotMatch(view, /stay-link/);
  assert.match(editor, /type="time" value="15:00" data-block-field="checkinTime"/);
  assert.match(editor, /type="time" value="11:00" data-block-field="checkoutTime"/);
  assert.match(editor, /data-block-field="mapUrl"/);
  assert.match(editor, /data-block-field="websiteUrl"/);
});

test("legacy Stay links remain valid and render as Website links", () => {
  const document = createDefaultDocument();
  const block = document.sections.stay.find((entry) => entry.type === "stay-summary");
  block.data.link = block.data.websiteUrl;
  delete block.data.checkinTime;
  delete block.data.checkoutTime;
  delete block.data.mapUrl;
  delete block.data.websiteUrl;

  assert.equal(validateDocument(document), true);
  const view = stayConfig.render(block, false);
  assert.match(view, /class="website-link"/);
  assert.equal((view.match(/Time to confirm/g) ?? []).length, 2);
});

test("Transport hero gains breathing room while continuous section headings retain their spacing", async () => {
  const [layout, responsive, editor] = await Promise.all([
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/responsive.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
  ]);
  assert.match(layout, /\.hero\s*\{[^}]+align-items:\s*center/);
  assert.match(layout, /\.hero\s*\{[^}]+padding:\s*58px/);
  assert.match(layout, /url\("\/client\/assets\/gramado-hero\.webp"\)/);
  assert.match(layout, /linear-gradient\(90deg,[^)]+\)/);
  assert.match(layout, /\.hero \+ \.content-section\s*\{\s*padding-top:\s*30px/);
  assert.match(layout, /\.content-section\s*\{[^}]+scroll-margin-top:\s*84px/);
  assert.match(responsive, /\.hero\s*\{[^}]+padding:\s*40px 20px/);
  assert.doesNotMatch(editor, /\.content-section\s*\{[^}]*padding-top/);
});

test("Casa do Sol uses equal image and information columns instead of a background overlay", async () => {
  const media = await readFile("src/client/styles/media.css", "utf8");
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover > \.block-cover[^}]+grid-column:\s*1/);
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover > \.stay-summary[^}]+grid-column:\s*2/);
  assert.doesNotMatch(media, /uses its cover like the page hero|rgba\(5,16,36/);
});