import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { stayConfig } from "../../src/client/sections/stay.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("section titles match the linked pill labels", () => {
  assert.equal(transportConfig.title, "Itinerary");
  assert.equal(stayConfig.title, "Accommodation");
  assert.equal(agendaConfig.title, "Agenda");
});

test("Stay summary renders editable times and Agenda-style safe links", () => {
  const block = createDefaultDocument().sections.stay.find((entry) => entry.type === "stay-summary");
  block.data.checkinTime = "15:00";
  block.data.checkoutTime = "11:00";

  const view = stayConfig.render(block, false);
  const editor = stayConfig.render(block, true);
  assert.match(view, /class="map-link"/);
  assert.match(view, /class="website-link"/);
  assert.match(view, /class="transport-attachment-button"[^>]+data-section="stay"[^>]+aria-label="Download accommodation attachment"/);
  assert.equal((view.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(view, /class="stay-title-row"[^]+class="entry-links"/);
  assert.match(view, /class="content-block stay-summary stay-summary-clean"/);
  assert.doesNotMatch(view, /class="stay-art"|<svg viewBox="0 0 300 220"|8 noites/);
  assert.match(view, /class="stay-title-copy"><h3>[^<]+<\/h3><p>[^<]+<\/p><\/div>/);
  assert.doesNotMatch(view, /Casa de Férias Inteira|Entire Holiday Home/);
  assert.match(view, /class="stay-date-details"><strong data-inline-date-action="block" data-inline-date-field="checkin"[^>]*>24\/10\/2026<\/strong><span class="stay-date-separator"[^>]*>·<\/span><span class="stay-time" data-inline-time-field="checkinTime"[^>]*>15:00<\/span>/);
  assert.match(view, /class="stay-date-details"><strong data-inline-date-action="block" data-inline-date-field="checkout"[^>]*>01\/11\/2026<\/strong><span class="stay-date-separator"[^>]*>·<\/span><span class="stay-time" data-inline-time-field="checkoutTime"[^>]*>11:00<\/span>/);
  assert.match(view, /class="stay-time" data-inline-time-field="checkinTime"[^>]*>15:00</);
  assert.match(view, /class="stay-time" data-inline-time-field="checkoutTime"[^>]*>11:00</);
  assert.equal((view.match(/class="stay-date-card/g) ?? []).length, 2);
  assert.equal((view.match(/class="stay-date-icon"/g) ?? []).length, 2);
  assert.equal((view.match(/<div class="property-pills">[\s\S]*?<span>/g) ?? []).length, 1);
  const propertyPills = view.match(/<div class="property-pills">([\s\S]*?)<\/div><div class="stay-dates">/)?.[1] ?? "";
  assert.equal((propertyPills.match(/<span>/g) ?? []).length, 4);
  assert.doesNotMatch(propertyPills, /8 noites/);
  assert.match(propertyPills, /2 banheiros/);
  assert.doesNotMatch(view, /stay-link/);
  assert.match(editor, /type="time" value="15:00" data-block-field="checkinTime"/);
  assert.match(editor, /type="time" value="11:00" data-block-field="checkoutTime"/);
  assert.match(editor, /data-block-field="mapUrl"/);
  assert.match(editor, /data-block-field="websiteUrl"/);
  assert.match(editor, /data-stay-cover/);
  assert.match(editor, /class="stay-cover-preview"><img src="\/assets\/casa-sol-da-serra\.webp"/);
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
  assert.equal((view.match(/>-</g) ?? []).length, 2);
});

test("Transport hero uses a bottom information deck while continuous section headings retain their spacing", async () => {
  const [layout, responsive, editor] = await Promise.all([
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/responsive.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
  ]);
  assert.match(layout, /\.hero\s*\{[^}]+grid-template-rows:\s*minmax\(0,1fr\) auto[^}]+align-items:\s*end/);
  assert.match(layout, /\.hero\s*\{[^}]+padding:\s*38px clamp\(24px,4vw,48px\)/);
  assert.doesNotMatch(layout, /url\("\/client\/assets\/gramado-hero-cnn\.jpg"\)/);
  assert.match(layout, /linear-gradient\(120deg,[^)]+\)/);
  assert.match(layout, /\.hero \+ \.content-section\s*\{\s*padding-top:\s*30px/);
  assert.match(layout, /\.content-section\s*\{[^}]+scroll-margin-top:\s*84px/);
  assert.match(responsive, /\.hero\s*\{[^}]+padding:\s*30px 20px/);
  assert.doesNotMatch(editor, /\.content-section\s*\{[^}]*padding-top/);
});

test("Casa do Sol uses a 35/65 image and information split with the hero outline", async () => {
  const [media, polish] = await Promise.all([
    readFile("src/client/styles/media.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover[^}]+grid-template-columns:\s*minmax\(0,7fr\) minmax\(0,13fr\)/);
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover > \.block-cover[^}]+grid-column:\s*1/);
  assert.match(media, /\.block-type-stay-summary \.block-frame\.has-cover > \.stay-summary[^}]+grid-column:\s*2/);
  assert.doesNotMatch(media, /uses its cover like the page hero|rgba\(5,16,36/);
  assert.match(polish, /\.block-type-stay-summary \.stay-summary\s*\{[^}]+radial-gradient[^}]+var\(--card-wash-gradient\)/);
  assert.match(polish, /\.block-type-stay-summary \.block-frame\.has-cover\s*\{[^}]+border:\s*3px solid transparent[^}]+var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /\.stay-date-card\s*\{[^}]+grid-template-columns:\s*36px minmax\(0,1fr\)[^}]+border-radius:\s*15px/);
  assert.match(polish, /\/\* Check-in and check-out share the same page-wide content-icon scale\. \*\/[\s\S]+\.stay-date-card\s*\{\s*grid-template-columns:\s*var\(--content-icon-size\) minmax\(0,1fr\)/);
  assert.match(polish, /\.stay-date-icon\s*\{[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+flex-basis:\s*var\(--content-icon-size\)/);
  assert.match(polish, /\.stay-date-icon svg\s*\{\s*width:\s*var\(--content-icon-glyph-size\);\s*height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(polish, /\.stay-date-card\s*\{[^}]+border:\s*3px solid transparent[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /\.stay-date-card small,\s*\.stay-date-card strong,\s*\.stay-date-card \.stay-time\s*\{\s*color:\s*#303030/);
  assert.match(polish, /\.stay-checkin \.stay-date-icon,\s*\.stay-checkout \.stay-date-icon\s*\{[^}]+--icon-surface-background:\s*var\(--icon-yellow-background\)[^}]+--icon-surface-colour:\s*var\(--icon-yellow-colour\)[^}]+border-color:\s*var\(--icon-yellow-colour\)[^}]+background:\s*var\(--icon-yellow-background\)[^}]+color:\s*var\(--icon-yellow-colour\)/);
  assert.match(polish, /\.stay-copy h3\s*\{[^}]+background:\s*var\(--destination-gradient\)[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /\.stay-title-row\s*\{[^}]+align-items:\s*center/);
  assert.match(polish, /\.stay-title-row \.entry-links\s*\{[^}]+align-self:\s*center/);
  assert.match(polish, /\.stay-date-details\s*\{[^}]+display:\s*flex[^}]+align-items:\s*baseline/);
  assert.match(polish, /\.property-pills i svg\s*\{[^}]+width:\s*15px/);
  assert.match(polish, /\.property-pills\s*\{[^}]+display:\s*grid[^}]+grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)[^}]+gap:\s*10px/);
  assert.match(polish, /\.property-pills > span\s*\{[^}]+width:\s*100%[^}]+min-height:\s*calc\(var\(--content-icon-size\) \+ 14px\)[^}]+white-space:\s*nowrap/);
  assert.match(polish, /@container \(max-width:620px\)\s*\{[\s\S]+?\.property-pills\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(polish, /@container \(max-width:360px\)\s*\{\s*\.property-pills\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
});

test("Amenities use structured category headers and a consistent list layout", () => {
  const block = createDefaultDocument().sections.stay.find((entry) => entry.type === "stay-amenities");
  const view = stayConfig.render(block, false);
  assert.match(view, /class="amenity-card-header"/);
  assert.doesNotMatch(view, /<small>Amenities<\/small>/);
  assert.match(view, /<h3>Listing Highlights<\/h3>/);
  assert.equal((view.match(/class="amenity-group-heading"/g) ?? []).length, block.data.groups.length);
  assert.equal((view.match(/class="amenity-group-icon"/g) ?? []).length, block.data.groups.length);
  for (const icon of ["cookware", "bed", "amenity-bathtub", "amenity-sofa", "amenity-laptop", "amenity-tree"]) {
    assert.match(view, new RegExp(`class="amenity-group-icon" data-icon="${icon}"`));
  }
  const editor = stayConfig.render(block, true);
  assert.match(editor, /<option value="toilet"\s*>Toilet<\/option>/);
  assert.doesNotMatch(view, /Streaming services/);
  assert.match(view, /Dedicated workspace/);
  assert.match(view, /Video games/);
  assert.match(view, /Cable and satellite TV/);
  assert.ok(block.data.groups.every((group) => group.items.length === 4));
  assert.equal((view.match(/class="amenity-dot"/g) ?? []).length, block.data.groups.flatMap((group) => group.items).length);
  assert.doesNotMatch(view, /amenity-card-emblem|class="amenity-icon"/);
});
