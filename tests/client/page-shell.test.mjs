import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("page shell exposes one continuous trip page and accessible global controls", async () => {
  const html = await readFile("public/index.html", "utf8");
  assert.doesNotMatch(html, /<footer/i);
  assert.match(html, /id="scrollTop"[^>]+aria-label="Scroll to top"/);
  assert.match(html, /id="fontDecrease"/);
  assert.match(html, /id="fontIncrease"/);
  assert.match(html, /id="editButton"[^>]+aria-label="Edit"[^>]+aria-pressed="false"/);
  assert.match(html, /class="edit-icon"/);
  assert.match(html, /class="save-icon"/);
  assert.match(html, /id="editButtonLabel">Edit<\/span>/);
  assert.doesNotMatch(html, /cancelButton/);
  assert.doesNotMatch(html, /menuSettingsToggle|menuSettingsPanel/);
  assert.ok(html.indexOf('class="language-switch"') < html.indexOf('id="fontDecrease"'));
  assert.ok(html.indexOf('id="fontIncrease"') < html.indexOf('id="paletteToggle"'));
  assert.ok(html.indexOf('id="paletteToggle"') < html.indexOf('id="themeToggle"'));
  assert.ok(html.indexOf('id="themeToggle"') < html.indexOf('id="editButton"'));
  assert.ok(html.indexOf('id="editButton"') < html.indexOf('id="scrollTop"'));
  assert.doesNotMatch(html, /class="workspace-actions"[\s\S]+id="scrollTop"[\s\S]+<\/div>\s*<\/header>/);
  assert.match(html, /<\/header>\s*<div id="topSentinel"[^>]*><\/div>\s*<button class="scroll-top" id="scrollTop"/);
  assert.match(html, /<header class="workspace-bar">/);
  assert.equal((html.match(/data-section-root=/g) ?? []).length, 3);
  assert.match(html, /id="transportRoot"/);
  assert.match(html, /id="stayRoot"/);
  assert.match(html, /id="agendaRoot"/);
  assert.match(html, />Our Next Adventure<\/div>/);
  assert.match(html, /id="heroCoverButton"[^>]+hidden/);
  assert.match(html, /<path d="M12 5v14M5 12h14"\/><\/svg><span class="sr-only" id="heroCoverButtonLabel">Add image<\/span>/);
});

test("menu removes the old brand icon and exposes the current palette picker", async () => {
  const [html, tokens, layout, preferences] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/app/preferences.js", "utf8"),
  ]);
  assert.doesNotMatch(html, /brand-mark|brand-mark-plane|palette-picker/);
  assert.match(html, /<link rel="icon" href="\/assets\/brand\/favicon\.png" type="image\/png">/);
  assert.doesNotMatch(html, /brand-plane-icon/);
  assert.match(html, /aria-label="Dudu &amp; Ale" data-no-translate/);
  assert.match(html, /class="brand-wordmark"[^>]*><span class="brand-name" id="brandName">Dudu &amp; Ale<\/span>/);
  assert.doesNotMatch(layout, /brand-plane-icon|brand-plane-gradient/);
  assert.doesNotMatch(html, /brand-heart|♥/);
  assert.match(html, /data-view="transport"[^>]+aria-label="Transport"[^>]+title="Transport"[^>]*><svg class="nav-line-icon nav-airplane-icon"/);
  assert.match(html, /data-view="stay"[^>]+aria-label="Accommodation"[^>]+title="Accommodation"[^>]*><svg class="nav-line-icon nav-accommodation-icon"/);
  assert.match(html, /data-view="agenda"[^>]+aria-label="Agenda"[^>]+title="Agenda"[^>]*><svg class="nav-line-icon nav-agenda-icon"/);
  assert.match(html, /id="paletteToggle"[^>]+aria-label="Open colour palette"[^>]+aria-haspopup="menu"[^>]+aria-controls="paletteMenu"[^>]+aria-expanded="false"/);
  assert.match(html, /id="paletteMenu"[^>]+role="menu"[^>]+aria-label="Palette options"[^>]+hidden/);
  assert.doesNotMatch(html, /palette-popover-heading|<strong>Colour palette<\/strong>|<small>Choose a palette<\/small>/);
  assert.equal((html.match(/role="menuitemradio"/g) ?? []).length, 1);
  assert.match(html, /data-palette="coral-olive-teal"[^>]+aria-label="Coral, Olive &amp; Teal — current palette"[^>]+aria-checked="true"/);
  assert.doesNotMatch(html, /palette-choice-copy|<strong>Coral, Olive &amp; Teal<\/strong>|<small>Current palette<\/small>/);
  assert.match(html, /<title>Travel Plan \| Gramado 2026<\/title>/);
  assert.match(html, /data-locale="en-GB"[^>]+aria-pressed="true"/);
  assert.match(html, /data-locale="pt-BR"/);
  assert.match(html, /class="workspace-actions"/);
  assert.match(tokens, /:root\[data-palette="coral-olive-teal"\]/);
  assert.doesNotMatch(tokens, /#f6dc82|#fffaf0/);
  assert.doesNotMatch(layout, /topbar|palette-picker|brand-mark/);
  assert.match(preferences, /PALETTE_KEY = "gramado-trip-palette"/);
  assert.match(preferences, /DEFAULT_PALETTE = "coral-olive-teal"/);
  assert.match(preferences, /function setPalette\(/);
  assert.match(preferences, /const menuWidth = Math\.min\(132, window\.innerWidth - edgeGap \* 2\)/);
  assert.match(preferences, /aria-expanded/);
});

test("uses Google Sans Flex throughout the interface", async () => {
  const [html, tokens, base, editor, attachments, polish] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/base.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
    readFile("src/client/styles/attachments.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Google\+Sans\+Flex:wght@300\.\.900&amp;display=swap/);
  assert.match(tokens, /--font-family:\s*"Google Sans Flex",\s*sans-serif/);
  assert.match(base, /body\s*\{[^}]+font-family:\s*var\(--font-family\)/);
  assert.match(editor, /font-family:\s*var\(--font-family\)/);
  assert.match(attachments, /font-family:\s*var\(--font-family\)/);
  assert.match(tokens, /--font-weight-regular:\s*400/);
  assert.match(tokens, /--font-weight-pill-title:\s*500/);
  assert.match(tokens, /--font-weight-title:\s*600/);
  assert.match(polish, /body \*:not\(#destination\):not\(\.brand-name\):not\(h1\)\s*\{\s*font-weight:\s*var\(--font-weight-regular\)/);
  assert.match(polish, /\.provider strong,[\s\S]+\.place-copy strong,[\s\S]+\.attachment-summary-copy strong,[\s\S]+font-weight:\s*var\(--font-weight-title\)/);
  assert.doesNotMatch(polish, /body :is\([^)]*h1/);
  assert.doesNotMatch(`${html}\n${tokens}\n${base}\n${editor}\n${attachments}`, /ABeeZee|Roboto/);
});

test("uses one thin line weight for every interface icon", async () => {
  const [tokens, base, blocks, polish, iconRegistry, accommodationIcon, priorityStar, staySection] = await Promise.all([
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/base.css", "utf8"),
    readFile("src/client/styles/blocks.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/ui/icon-registry.js", "utf8"),
    readFile("public/assets/nav-icons/accommodation-house.svg", "utf8"),
    readFile("public/assets/place-icons/priority-star-outline.svg", "utf8"),
    readFile("src/client/sections/stay.js", "utf8"),
  ]);

  assert.match(tokens, /--icon-stroke-width:\s*1\.5px/);
  assert.match(tokens, /--icon-outline-width:\s*1\.5px/);
  assert.match(base, /svg\s*\{[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.match(base, /svg :where\(path,rect,circle,ellipse,line,polyline,polygon\)\s*\{[^}]+vector-effect:\s*non-scaling-stroke[^}]+stroke-width:\s*inherit/);
  assert.match(iconRegistry, /stroke-width="1\.5"/);
  assert.match(iconRegistry, /airplane:\s*'<path/);
  assert.match(accommodationIcon, /stroke-width="1\.5"/);
  assert.match(priorityStar, /stroke-width="1\.5"/);
  for (const [, geometry] of accommodationIcon.matchAll(/<path d="([^"]+)"/g)) {
    assert.ok(iconRegistry.includes(`d="${geometry}"`));
  }
  assert.doesNotMatch(staySection, /AMENITY_GROUP_ICONS/);
  assert.match(staySection, /class="amenity-dot"/);
  assert.match(staySection, /\["bed",\s*"4 camas"\]/);
  assert.match(staySection, /\["amenity-bathtub",\s*"2 banheiros"\]/);
  assert.match(blocks, /\.stay-art svg\s*\{[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.match(polish, /\.scroll-top svg\s*\{[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.match(polish, /One physical line weight[\s\S]+\.hero-location-icon,[\s\S]+\.meal-heading-icon,[\s\S]+\.toolbar-icon,[\s\S]+border-width:\s*var\(--icon-outline-width\)/);
  assert.match(polish, /canonical icon treatment[\s\S]+border-color:\s*currentColor[\s\S]+stroke-width:\s*var\(--icon-stroke-width\) !important/);
  assert.match(polish, /--date-icon-background:\s*#FFF1EC[\s\S]+--duration-icon-background:\s*#F3F8DC[\s\S]+--transport-icon-background:\s*#E8F6F3/);
});

test("uses one intermediate content-icon scale while preserving menu and hero exceptions", async () => {
  const [layout, polish] = await Promise.all([
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.match(polish, /--content-icon-size:\s*34px/);
  assert.match(polish, /--content-icon-glyph-size:\s*17px/);
  assert.match(polish, /\.hero\s*\{[^}]+--content-icon-size:\s*30px[^}]+--content-icon-glyph-size:\s*14px/);
  assert.match(polish, /\.transport-card \.provider-icon,\s*\.property-pills i,\s*\.stay-date-icon,[\s\S]+\.day-card \.place-route-mode \.place-route-icon,[\s\S]+\.attachment-viewer nav button,[\s\S]+width:\s*var\(--content-icon-size\)/);
  assert.match(polish, /\.transport-card \.provider-icon svg,\s*\.property-pills i svg,[\s\S]+\.transport-seats svg\s*\{[^}]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(polish, /\.transport-card \.route-line\s*\{[^}]+--route-centre-icon-size:\s*var\(--content-icon-size\)/);
  assert.match(layout, /\.stat-icon\s*\{[^}]+width:\s*38px[^}]+height:\s*38px/);
  const unifiedScaleStart = polish.indexOf("/*\n * One content-icon scale");
  const unifiedScaleEnd = polish.indexOf("/*\n * A single Google Sans", unifiedScaleStart);
  const unifiedScale = polish.slice(unifiedScaleStart, unifiedScaleEnd);
  assert.doesNotMatch(unifiedScale, /\.workspace-bar|\.hero/);
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
  const [html, layout, polish, main] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/main.js", "utf8"),
  ]);

  assert.equal((html.match(/<h2 class="section-pill"/g) ?? []).length, 3);
  assert.match(html, /id="transportTitle"><span><span class="section-pill-icon section-pill-icon-transport"[^>]+><svg class="nav-line-icon nav-airplane-icon"[\s\S]+?<\/svg><\/span><span class="section-pill-label" id="transportTitleLabel">Itinerary/);
  assert.match(html, /id="stayTitle"><span><span class="section-pill-icon section-pill-icon-stay"[^>]+><svg class="nav-line-icon nav-accommodation-icon"[\s\S]+?<\/svg><\/span><span class="section-pill-label" id="stayTitleLabel">Accommodation/);
  assert.match(html, /id="agendaTitle"><span><span class="section-pill-icon section-pill-icon-agenda"[^>]+><svg class="nav-line-icon nav-agenda-icon"[\s\S]+?<\/svg><\/span><span class="section-pill-label" id="agendaTitleLabel">Agenda/);
  assert.equal((html.match(/class="section-pill-icon section-pill-icon-spacer"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-section-link|<a class="section-pill"/);
  assert.doesNotMatch(html, /Route at a Glance|Stay in Gramado|Week in Gramado/);
  assert.match(html, /data-view="transport"[^>]+aria-label="Transport"[^>]+title="Transport"[^>]*><svg class="nav-line-icon nav-airplane-icon"/);
  assert.doesNotMatch(html, /data-view="transport"[^>]+aria-haspopup="menu"/);
  assert.match(html, /id="itineraryNavButton"[^>]+data-view="agenda"[^>]+aria-label="Agenda"[^>]+title="Agenda"[^>]*><svg class="nav-line-icon nav-agenda-icon"/);
  assert.doesNotMatch(html, /itineraryDateMenu|aria-haspopup="menu"[^>]+aria-controls="itineraryDateMenu"/);
  assert.match(layout, /\.workspace-bar[^}]+border:\s*0/);
  assert.match(layout, /\.workspace-bar[^}]+--brand-nav-gap:\s*28px[^}]+--menu-control-gap:\s*10px[^}]+column-gap:\s*var\(--brand-nav-gap\)/);
  assert.match(layout, /\.workspace-bar[^}]+grid-template-columns:\s*auto auto minmax\(0,1fr\)/);
  assert.match(layout, /\.brand[^}]+width:\s*auto[^}]+height:\s*44px[^}]+justify-self:\s*start/);
  assert.match(layout, /\.main-nav[^}]+--menu-tab-size:\s*42px[^}]+width:\s*calc\(var\(--menu-tab-size\) \* 3 \+ var\(--menu-control-gap\) \* 2\)[^}]+grid-template-columns:\s*repeat\(3,var\(--menu-tab-size\)\)[^}]+justify-self:\s*start[^}]+gap:\s*var\(--menu-control-gap\)[^}]+border:\s*0[^}]+background:\s*transparent/);
  assert.match(layout, /\.workspace-actions[^}]+gap:\s*var\(--menu-control-gap\)/);
  assert.doesNotMatch(layout, /\.main-nav::before/);
  assert.match(layout, /\.nav-item[^}]+width:\s*var\(--menu-tab-size\)[^}]+place-items:\s*center[^}]+border:\s*var\(--icon-outline-width\) solid currentColor[^}]+border-radius:\s*50%[^}]+outline:\s*0/);
  assert.match(layout, /\.nav-item:focus-visible[^}]+outline:\s*var\(--icon-outline-width\) solid currentColor[^}]+outline-offset:\s*2px/);
  assert.match(layout, /\.nav-line-icon\s*\{[^}]+width:\s*20px[^}]+height:\s*20px[^}]+fill:\s*none[^}]+stroke:\s*currentColor[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.doesNotMatch(layout, /nav-custom-icon|mask-size|agenda-clipboard\.png|accommodation-house\.svg/);
  assert.doesNotMatch(layout, /\.nav-item::after/);
  assert.match(layout, /\.section-pill[^}]+text-transform:\s*uppercase/);
  assert.match(polish, /\.main-nav \.nav-airplane-icon\s*\{[^}]+transform:\s*scale\(\.88\)[^}]+transform-origin:\s*center/);
  assert.match(main, /transport:\s*document\.querySelector\("#transportTitle"\)/);
  assert.match(main, /brandName:\s*document\.querySelector\("#brandName"\)/);
  assert.doesNotMatch(main, /elements\.brandName[^\n]+addEventListener|unlockEditing|saveEditing|cancelEditing/);
  assert.match(main, /renderMeta\(tripDocument, false\)/);
  assert.match(main, /brandName:\s*elements\.brandName/);
  assert.match(main, /field === "brandName" \? \(meta\.brandName \?\? "Dudu & Ale"\)/);
  assert.match(main, /switchSection\("transport", elements\.hero\)/);
  assert.match(main, /function bindEvents\(\)[\s\S]+elements\.nav\.forEach[\s\S]+button\.addEventListener\("click", \(\) => switchSection\(button\.dataset\.view\)\)/);
  assert.doesNotMatch(main, /initializeItineraryDateMenu|renderItineraryDateMenu|data-agenda-block-id/);
  assert.match(main, /stickyViewportBottom:[^}]+gap:\s*24/);
  assert.doesNotMatch(main, /sectionLinks|data-section-link/);
});

test("renders the three hero facts in one readable full-width information deck", async () => {
  const [html, layout] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
  ]);

  assert.equal((html.match(/<div class="stat stat-(?:date|duration|transport)">/g) ?? []).length, 3);
  assert.equal((html.match(/class="stat-icon"/g) ?? []).length, 3);
  assert.match(html, /<small data-inline-static>Date<\/small>/);
  assert.match(html, /<strong class="travel-dates" id="travelDates" data-inline-date-action="hero" data-inline-date-label="Trip Dates">24\/10 - 01\/11 2026<\/strong>/);
  assert.doesNotMatch(html, /Travel Dates/);
  assert.match(layout, /\.hero\s*\{[^}]+min-height:\s*420px[^}]+grid-template-columns:\s*1fr[^}]+grid-template-rows:\s*minmax\(0,1fr\) auto/);
  assert.match(layout, /\.hero-stats[^}]+width:\s*100%[^}]+grid-template-columns:\s*minmax\(0,1\.4fr\) minmax\(0,\.8fr\) minmax\(0,\.8fr\)[^}]+justify-self:\s*stretch/);
  assert.match(layout, /\.stat[^}]+border-radius:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(layout, /\.stat small[^}]+color:\s*var\(--blue\)/);
  assert.match(layout, /\.stat-copy[^}]+display:\s*flex[^}]+align-items:\s*flex-start[^}]+flex-direction:\s*column[^}]+gap:\s*3px/);
  assert.match(layout, /\.stat strong[^}]+white-space:\s*nowrap/);
});

test("uses a one-pixel-smaller page type scale while preserving Gramado's own larger scale", async () => {
  const [base, layout, polish] = await Promise.all([
    readFile("src/client/styles/base.css", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.match(base, /html\s*\{[^}]*font-size:\s*100\.85%/);
  assert.match(layout, /\.hero h1\s*\{[^}]*font-size:\s*clamp\(48px,\s*7vw,\s*78px\)/);
  assert.doesNotMatch(layout, /gramado-hero-cnn\.jpg/i);
  assert.doesNotMatch(layout.match(/\.hero\s*\{[^}]+\}/)?.[0] ?? "", /url\(/i); assert.match(polish, /\.nav-item svg,\.nav-line-icon\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/);
  assert.match(polish, /\.stat small\s*\{[^}]*font-size:\s*9\.45px/);
  assert.match(polish, /\.hero-stats\s*\{[^}]+--hero-stats-inline-padding:\s*clamp\(38px,4\.5vw,54px\)[^}]+--hero-stat-width-breathing-room:\s*24px[^}]+width:\s*min\(100%,calc\(var\(--hero-stat-inline-size,360px\) \+ var\(--hero-stat-width-breathing-room\) \+ \(2 \* var\(--hero-stats-inline-padding\)\)\)\)[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+justify-self:\s*end/);
  assert.match(polish, /@media \(max-width:820px\)[\s\S]+\.hero-stats\s*\{[^}]+grid-template-columns:\s*minmax\(0,1\.35fr\) minmax\(0,\.825fr\) minmax\(0,\.825fr\)/);
  assert.match(polish, /\.hero h1\s*\{[^}]*font-size:\s*var\(--hero-title-size\)/);
});

test("loads the visual polish layer for richer page-wide hierarchy", async () => {
  const [index, polish, tokens, main, typography] = await Promise.all([
    readFile("src/client/styles/index.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/styles/typography.css", "utf8"),
  ]);

  assert.match(index, /@import url\("\.\/polish\.css"\);/);
  for (const colour of ["#ec6e45", "#fff5c2", "#d3e398", "#8dccc1", "#7c796a"]) {
    assert.match(tokens, new RegExp(colour));
  }
  assert.match(polish, /--page-background-gradient:\s*linear-gradient\(145deg,[^;]+var\(--gradient-coral\)[^;]+var\(--gradient-olive\)[^;]+var\(--gradient-teal\)/);
  assert.match(polish, /body\s*\{[^}]+background:\s*var\(--page-background-gradient\)[^}]+background-attachment:\s*fixed/);
  assert.match(polish, /\.hero\s*\{[^}]+--hero-outline-width:\s*3px[^}]+grid-template-columns:\s*minmax\(0,1fr\) minmax\(0,1fr\)[^}]+grid-template-rows:\s*1fr[^}]+border:\s*var\(--hero-outline-width\) solid transparent[^}]+background:\s*var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /\.hero::before\s*\{[^}]+inset:\s*var\(--hero-outline-width\)[^}]+border-radius:\s*calc\(34px - var\(--hero-outline-width\)\)/);
  assert.match(polish, /\.hero > div:first-child\s*\{[^}]+width:\s*100%[^}]+min-height:\s*100%[^}]+max-width:\s*none[^}]+background:\s*transparent[^}]+color:\s*#303030[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /\.hero-stats\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+gap:\s*18px[^}]+padding:\s*var\(--hero-stats-inline-padding\)[^}]+background:\s*transparent[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /--section-transport-color:\s*color-mix\(in srgb,var\(--primary\) 72%,var\(--text\)\)/);
  assert.match(polish, /--section-stay-color:\s*color-mix\(in srgb,var\(--accent\) 48%,var\(--text\)\)/);
  assert.match(polish, /--section-agenda-color:\s*color-mix\(in srgb,var\(--sage\) 54%,var\(--text\)\)/);
  assert.match(polish, /\.stat:nth-child\(1\) small\s*\{[^}]+#b45133/);
  assert.match(polish, /\.stat:nth-child\(2\) small\s*\{[^}]+#68772f/);
  assert.match(polish, /\.stat:nth-child\(3\) small\s*\{[^}]+#39776e/);
  assert.match(polish, /\.hero::before\s*\{[^}]+inset:\s*var\(--hero-outline-width\)[^}]+border-radius:\s*calc\(34px - var\(--hero-outline-width\)\)[^}]+linear-gradient\(120deg,rgba\(247,131,97,\.28\) 0%,rgba\(168,198,78,\.16\) 50%,rgba\(78,185,174,\.24\) 100%\)/); assert.doesNotMatch(polish, /gramado-hero-cnn\.jpg/);
  assert.doesNotMatch(polish, /\.hero\s*\{[^}]+border:\s*3px solid rgba\(255,255,255,\.96\)/);
  assert.match(polish, /\.hero::after\s*\{[^}]+background-image:\s*var\(--hero-image,none\)[^}]+background-position:\s*var\(--hero-image-position,center\)[^}]+background-size:\s*cover[^}]+opacity:\s*0/);
  assert.match(polish, /\.hero\.has-hero-image::after\s*\{\s*opacity:\s*1/);
  assert.match(polish, /\.hero \.eyebrow\s*\{[^}]+border:\s*0[^}]+outline:\s*0[^}]+background:\s*none[^}]+box-shadow:\s*none[^}]+color:\s*#FFFFFF[^}]+-webkit-text-fill-color:\s*#FFFFFF[^}]+filter:\s*none[^}]+text-shadow:\s*none/);
  assert.match(polish, /\.hero > div:first-child \.eyebrow\s*\{\s*color:\s*#FFFFFF;\s*-webkit-text-fill-color:\s*#FFFFFF/);
  assert.match(polish, /\.hero \.eyebrow::before\s*\{[^}]+content:\s*none/);
  assert.match(polish, /\.hero \.eyebrow::after\s*\{\s*content:\s*none/);
  assert.match(polish, /\.hero \.location-line\s*\{[^}]+border:\s*3px solid transparent[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /\.hero-location-icon\s*\{[^}]+border:\s*var\(--icon-outline-width\) solid var\(--icon-yellow-colour\)[^}]+border-radius:\s*50%[^}]+background:\s*var\(--icon-yellow-background\)[^}]+color:\s*var\(--icon-yellow-colour\)/);
  assert.match(polish, /\.hero > div:first-child \.location-line \.hero-location-pin\s*\{[^}]+width:\s*var\(--content-icon-glyph-size\)[^}]+color:\s*var\(--icon-yellow-colour\)[^}]+stroke:\s*currentColor/);
  assert.match(polish, /\.hero \.stat:not\(:last-child\)::after\s*\{\s*content:\s*none/);
  assert.match(polish, /\.hero \.stat strong\s*\{\s*color:\s*#303030/);
  assert.match(polish, /--dark-glass-gradient:\s*linear-gradient\(135deg,rgba\(55,42,37,\.62\)[^;]+rgba\(43,50,36,\.58\)[^;]+rgba\(32,54,51,\.62\)/);
  assert.match(polish, /--gradient-coral:\s*#F78361/);
  assert.match(polish, /--gradient-olive:\s*#A8C64E/);
  assert.match(polish, /--gradient-teal:\s*#4EB9AE/);
  assert.match(polish, /--brand-gradient:\s*linear-gradient\(120deg,var\(--gradient-coral\) 0%,var\(--gradient-olive\) 50%,var\(--gradient-teal\) 100%\)/);
  assert.match(polish, /--transport-detail-gradient:\s*var\(--card-wash-gradient\)/);
  assert.match(polish, /--destination-gradient:\s*linear-gradient\(120deg,#F58D6C 0%,#ACC65A 50%,#61BDB2 100%\)/);
  assert.match(polish, /--hero-title-gradient:\s*linear-gradient\(120deg,#F3A081 0%,#B5C678 50%,#7CB9B1 100%\)/);
  assert.match(polish, /--hero-title-size:\s*clamp\(52px,7\.2vw,82px\)/);
  assert.match(polish, /--stay-title-size:\s*clamp\(34px,3\.4vw,42px\)/);
  assert.match(polish, /\.hero h1\s*\{[^}]+font-size:\s*var\(--hero-title-size\)[^}]+line-height:\s*\.94/);
  assert.match(polish, /\.stay-copy h3\s*\{[^}]+font-size:\s*var\(--stay-title-size\)[^}]+line-height:\s*1\.02/);
  assert.match(polish, /#destination\s*\{\s*font-size:\s*inherit/);
  assert.match(polish, /\.hero h1\s*\{[^}]+max-width:\s*none[^}]+overflow:\s*visible/);
  assert.match(polish, /#destination\s*\{[^}]+padding-right:\s*\.1em[^}]+background:\s*var\(--hero-title-gradient\)[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /--section-pill-gradient:\s*linear-gradient\(120deg,var\(--gradient-coral-soft\) 0%,var\(--gradient-olive-soft\) 50%,var\(--gradient-teal-soft\) 100%\)/);
  assert.match(polish, /\.workspace-bar\s*\{[^}]+background:\s*#FFFFFF[^}]+color:\s*#303030[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /\.detail-strip\s*\{[^}]+background:\s*var\(--transport-detail-gradient\)/);
  assert.doesNotMatch(polish, /brand-plane-icon|brand-plane-gradient/);
  assert.doesNotMatch(polish, /airplane-outline-icon|airplane-outline-transport\.png/);
  assert.doesNotMatch(polish, /brand-name-gradient/);
  assert.match(polish, /\.main-nav\s*\{[^}]+width:\s*calc\(42px \* 3 \+ var\(--menu-control-gap\) \* 2\)[^}]+grid-template-columns:\s*repeat\(3,42px\)[^}]+gap:\s*var\(--menu-control-gap\)[^}]+padding:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(polish, /\.workspace-actions\s*\{\s*gap:\s*var\(--menu-control-gap\)/);
  assert.match(polish, /\.nav-item\s*\{[^}]+border:\s*var\(--icon-outline-width\) solid currentColor[^}]+border-radius:\s*50%/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.nav-item\s*\{[^}]+border-radius:\s*50%/); assert.match(polish, /\.stat-icon\s*\{[^}]+border-radius:\s*50%/);
  assert.doesNotMatch(polish, /\.nav-item::before/);
  assert.match(polish, /\.nav-airplane-icon\s*\{[^}]+width:\s*20px[^}]+height:\s*20px/);
  assert.doesNotMatch(polish, /\.nav-item svg,\.nav-airplane-icon[^}]+drop-shadow/);
  assert.match(polish, /\.nav-item\.is-active\s*\{[^}]+border-color:\s*currentColor[^}]+box-shadow:\s*0 7px 16px/);
  assert.match(polish, /\.nav-item\[data-view="transport"\][^{]+\{\s*background:\s*var\(--date-icon-background\);\s*color:\s*var\(--date-icon-colour\)/);
  assert.match(polish, /\.nav-item\[data-view="stay"\][^{]+\{\s*background:\s*var\(--duration-icon-background\);\s*color:\s*var\(--duration-icon-colour\)/);
  assert.match(polish, /\.nav-item\[data-view="agenda"\][^{]+\{\s*background:\s*var\(--transport-icon-background\);\s*color:\s*var\(--transport-icon-colour\)/);
  assert.match(polish, /--section-outline-coral:\s*#F7A187/);
  assert.match(polish, /--section-outline-olive:\s*#C8D96F/);
  assert.match(polish, /--section-outline-teal:\s*#75CFC4/);
  assert.match(polish, /--section-outline-gradient:\s*linear-gradient\(120deg,var\(--section-outline-coral\) 0%,var\(--section-outline-olive\) 50%,var\(--section-outline-teal\) 100%\)/);
  assert.match(polish, /\.section-pill\s*\{[^}]+border:\s*3px solid transparent[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box !important[^}]+box-shadow:\s*0 8px 18px rgba\(48,48,48,\.16\)/);
  assert.match(polish, /\.section-heading\s*\{[^}]+margin-bottom:\s*28px/);
  assert.match(polish, /\.block-grid\s*\{\s*gap:\s*20px/);
  assert.match(polish, /\.content-block,\.block-frame\.has-cover,\.block-frame\.has-color-header:not\(\.has-cover\)\s*\{[^}]+border:\s*0/);
  assert.match(polish, /\.stat\s*\{[^}]+border:\s*0/);
  assert.match(polish, /\.amenity-group,\.distance-landmark,\.meal-group,\.place-row,\.food-row,\.day-note\s*\{[^}]+border:\s*0/);
  assert.doesNotMatch(polish, /\.block-type-stay-summary \.stay-summary::before/);
  assert.match(polish, /--section-title-gradient:\s*linear-gradient\(120deg,#F27957 0%,#9FBD3F 50%,#38A99E 100%\)/);
  assert.match(polish, /\.section-pill > span\s*\{[^}]+display:\s*inline-flex[^}]+gap:\s*10px[^}]+font-size:\s*calc\(1rem \* var\(--font-scale\)\)[^}]+font-weight:\s*var\(--font-weight-pill-title\)[^}]+background:\s*none[^}]+color:\s*#303030[^}]+-webkit-text-fill-color:\s*#303030/);
  assert.match(polish, /\.stay-dates\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)[^}]+gap:\s*18px/);
  assert.match(polish, /\.section-pill > span::before\s*\{\s*content:\s*none/);
  assert.match(polish, /\.section-pill-icon\s*\{[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+border-radius:\s*50%/);
  assert.match(polish, /\.section-pill-icon svg\s*\{[^}]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(polish, /\.section-pill-icon-transport\s*\{[^}]+--section-pill-icon-background:\s*var\(--icon-coral-background\)[^}]+--section-pill-icon-colour:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /\.section-pill-icon-stay\s*\{[^}]+--section-pill-icon-background:\s*var\(--icon-olive-background\)[^}]+--section-pill-icon-colour:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.section-pill-icon-agenda\s*\{[^}]+--section-pill-icon-background:\s*var\(--icon-teal-background\)[^}]+--section-pill-icon-colour:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.section-pill-measure\s*\{[^}]+visibility:\s*hidden[^}]+pointer-events:\s*none/);
  assert.match(polish, /\.section-pill::before\s*\{\s*content:\s*none/);
  assert.match(polish, /--itinerary-pill-gradient:\s*linear-gradient\(120deg,color-mix\(in srgb,var\(--gradient-coral\) 64%,#FFFFFF\) 0%,color-mix\(in srgb,var\(--gradient-olive\) 64%,#FFFFFF\) 50%,color-mix\(in srgb,var\(--gradient-teal\) 64%,#FFFFFF\) 100%\)/);
  assert.doesNotMatch(polish, /#transportTitle\.section-pill(?:\s|\{|>)/);
  assert.match(polish, /\.transport-card \.route-location-name\s*\{[^}]+background:\s*var\(--section-title-gradient\)[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /\.workspace-actions > \.language-switch,[\s\S]+\.workspace-actions > \.edit-button\s*\{[^}]+border:\s*var\(--icon-outline-width\) solid transparent[^}]+border-radius:\s*14px[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box[^}]+color:\s*#303030/);
  assert.doesNotMatch(polish, /menu-settings-panel|menu-settings-toggle/);
  assert.match(polish, /\.language-button\.is-active\s*\{[^}]+background:\s*var\(--editor-save-gradient\)[^}]+color:\s*#303030/);
  assert.match(polish, /\.workspace-actions button,[\s\S]+\.workspace-actions button svg\s*\{\s*color:\s*#303030;\s*stroke:\s*#303030/);
  assert.match(polish, /\.edit-button\s*\{[^}]+display:\s*grid[^}]+border:\s*var\(--icon-outline-width\) solid transparent[^}]+border-radius:\s*14px[^}]+var\(--section-outline-gradient\) border-box[^}]+color:\s*#303030/);
  assert.match(polish, /\.edit-button \.save-icon\s*\{\s*display:\s*none/);
  assert.match(polish, /--editor-save-gradient:\s*linear-gradient\(120deg,#FFF7F3 0%,#FAFCEB 50%,#EEF9F7 100%\)/);
  assert.match(polish, /--editor-save-outline-gradient:\s*linear-gradient\(120deg,#F7AD94 0%,#CCDD7B 50%,#7BCFC4 100%\)/);
  assert.match(polish, /\.edit-button\.is-saving\s*\{[^}]+var\(--editor-save-gradient\) padding-box[^}]+var\(--editor-save-outline-gradient\) border-box[^}]+color:\s*#303030/);
  assert.match(polish, /\.edit-button\.is-saving \.edit-icon\s*\{\s*display:\s*none/);
  assert.match(polish, /\.edit-button\.is-saving \.save-icon\s*\{\s*display:\s*block/);
  assert.match(polish, /body\.is-editing \.block-toolbar\s*\{[^}]+border:\s*1px solid var\(--editor-control-border\)[^}]+background:\s*var\(--editor-panel\)[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /body\.is-editing \.add-block\s*\{[^}]+background:\s*var\(--editor-panel\)/);
  assert.match(polish, /body\.is-editing \.edit-form input:focus,[\s\S]+border-color:\s*var\(--editor-accent\)[^}]+color-mix\(in srgb,var\(--editor-accent\) 15%,transparent\)/);
  assert.match(polish, /body\.is-editing \.hero-date-editor input,[\s\S]+background:\s*var\(--editor-panel-muted\)/);
  assert.match(polish, /body\.is-editing \.hero-date-editor label > span\s*\{\s*color:\s*var\(--editor-accent-strong\)/);
  assert.match(tokens, /\[data-theme="dark"\][^}]+--bg:\s*#171c1a[^}]+--surface:\s*#232b28[^}]+--text:\s*#f7f4ec/);
  assert.match(polish, /\[data-theme="dark"\] \.workspace-bar\s*\{[^}]+background:\s*rgba\(23,29,26,\.94\)[^}]+backdrop-filter:\s*blur\(20px\) saturate\(1\.14\)/);
  assert.match(polish, /\[data-theme="dark"\] \.content-block,[\s\S]+background-color:\s*var\(--surface\)[^}]+background-image:\s*var\(--card-wash-gradient\)/);
  assert.match(polish, /\[data-theme="dark"\] \.edit-button\.is-saving\s*\{[^}]+var\(--editor-save-gradient\) padding-box[^}]+var\(--editor-save-outline-gradient\) border-box[^}]+color:\s*var\(--text\)/);
  assert.match(tokens, /--surface:\s*#fffefc/);
  assert.match(polish, /\.workspace-bar button:focus-visible\s*\{[^}]+outline:\s*var\(--icon-outline-width\) solid #69A79F/);
  assert.match(polish, /\.language-switch\s*\{\s*width:\s*76px/);
  assert.match(polish, /\.font-controls\s*\{\s*width:\s*80px;\s*height:\s*44px/);
  assert.match(typography, /\.font-button:hover:not\(:disabled\)\s*\{\s*background:\s*#fff7c9;\s*color:\s*#303030/);
  assert.match(polish, /\[data-theme="dark"\] \.font-button:hover:not\(:disabled\)\s*\{\s*background:\s*#fff7c9/);
  assert.match(polish, /\.edit-button\s*\{[^}]+width:\s*44px[^}]+height:\s*44px/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.workspace-actions > \.language-switch,[\s\S]+height:\s*36px[^}]+border-radius:\s*12px/);
  assert.match(polish, /@media \(max-width:400px\)[\s\S]+\.workspace-actions > \.language-switch,[\s\S]+height:\s*32px[^}]+border-radius:\s*11px/);
  assert.match(polish, /\.workspace-bar \.brand\s*\{[^}]+padding:\s*0 14px[^}]+border:\s*3px solid transparent[^}]+border-radius:\s*999px[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box[^}]+box-shadow:\s*0 8px 18px rgba\(48,48,48,\.16\)/);
  assert.match(polish, /\.brand-wordmark > span\s*\{[^}]+background:\s*none[^}]+color:\s*#303030[^}]+font-size:\s*var\(--text-body\)[^}]+font-weight:\s*var\(--font-weight-pill-title\)[^}]+letter-spacing:\s*normal[^}]+-webkit-text-fill-color:\s*#303030/);
  assert.equal((polish.match(/\.brand-wordmark > span\s*\{\s*font-size:\s*var\(--text-body\);\s*\}/g) ?? []).length, 2);
  assert.match(polish, /\.brand-wordmark > span\s*\{[^}]+display:\s*inline-block[^}]+padding:\s*\.12em \.16em[^}]+overflow:\s*visible[^}]+line-height:\s*1\.2/);
  assert.doesNotMatch(polish, /data-brand-copy|\.brand-wordmark > span::before/);
  assert.match(polish, /--icon-coral-background:\s*var\(--date-icon-background\)/);
  assert.match(polish, /--icon-olive-background:\s*var\(--duration-icon-background\)/);
  assert.match(polish, /--icon-teal-background:\s*var\(--transport-icon-background\)/);
  assert.match(polish, /\.amenity-dot\s*\{[^}]+width:\s*4px[^}]+height:\s*4px[^}]+flex:\s*0 0 4px[^}]+background:\s*var\(--amenity-accent-colour\)/);
  assert.match(polish, /\.property-pills i,[\s\S]+width:\s*26px[^}]+height:\s*26px[^}]+border-radius:\s*50%/);
  assert.match(polish, /\.property-pills span:nth-child\(4\) i\s*\{[^}]+--icon-surface-background:\s*var\(--icon-yellow-background\)[^}]+--icon-surface-colour:\s*var\(--icon-yellow-colour\)/);
  assert.match(polish, /\.transport-card\.transfer \.route-line i\s*\{[^}]+--icon-surface-background:\s*var\(--icon-olive-background\)[^}]+--icon-surface-colour:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.transport-seats svg\s*\{[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.entry-links\s*\{[^}]+flex-wrap:\s*nowrap[^}]+gap:\s*10px/);
  assert.match(polish, /\.place-row > \.entry-links\s*,[\s\S]+grid-area:\s*actions[^}]+justify-self:\s*end[^}]+gap:\s*10px/);
  assert.match(polish, /\.entry-links \.map-link\s*\{[^}]+background:\s*var\(--icon-coral-background\)[^}]+color:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /\.entry-links \.website-link\s*\{[^}]+background:\s*var\(--icon-olive-background\)[^}]+color:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.entry-links \.map-link,\s*\.entry-links \.website-link,\s*\.transport-attachment-button\s*\{[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+flex:\s*0 0 var\(--content-icon-size\)[^}]+border-radius:\s*9px/);
  assert.match(polish, /\.entry-links \.map-link svg,\.entry-links \.website-link svg,\.transport-attachment-button svg\s*\{\s*width:\s*var\(--content-icon-glyph-size\);\s*height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(polish, /\.place-row > \.entry-links \.transport-attachment-button,[\s\S]+\.saved-grid \.place-row > \.entry-links \.transport-attachment-button\s*\{[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+flex-basis:\s*var\(--content-icon-size\)[^}]+border-radius:\s*9px/);
  assert.match(polish, /\.place-row > \.entry-links \.transport-attachment-button svg,[\s\S]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.doesNotMatch(polish, /entry-links[^{}]*[\s\S]{0,320}\{[^}]*border-radius:\s*50%/);
  assert.match(polish, /\.entry-links \.is-unavailable\s*\{[^}]+cursor:\s*not-allowed[^}]+opacity:\s*\.58/);
  assert.match(polish, /\.transport-attachment-button\s*\{[^}]+background:\s*var\(--icon-teal-background\)[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.transport-card \.detail-strip\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\) auto/);
  assert.match(polish, /\.transport-card \.block-topline > \.entry-links\s*\{[^}]+align-self:\s*center/);
  assert.match(polish, /\.transport-card \.route-grid\s*\{[^}]+padding:\s*36px 0 38px/);
  assert.match(polish, /\.transport-card \.route-line\s*\{[^}]+--route-centre-icon-size:\s*var\(--content-icon-size\)[^}]+grid-template-columns:\s*minmax\(0,1fr\) var\(--route-centre-icon-size\) minmax\(0,1fr\)[^}]+column-gap:\s*20px[^}]+align-items:\s*start/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.transport-card \.route-line\s*\{[^}]+--route-centre-icon-size:\s*var\(--content-icon-size\)[^}]+column-gap:\s*10px/);
  assert.match(polish, /\.transport-card \.route-line > span\s*\{[^}]+margin-top:\s*calc\(\(var\(--route-centre-icon-size\) \/ 2\) - \.5px\)/);
  assert.match(polish, /\.transport-card \.route-line \.route-duration\s*\{[^}]+position:\s*absolute[^}]+top:\s*calc\(100% \+ 6px\)/);
  assert.match(polish, /@media \(min-width:601px\)\s*\{\s*\.transport-card \.route-line \.route-duration\s*\{[^}]+width:\s*max-content[^}]+max-width:\s*none[^}]+min-width:\s*max-content !important[^}]+overflow-wrap:\s*normal[^}]+text-align:\s*center[^}]+white-space:\s*nowrap/);
  assert.match(polish, /\.transport-card \.provider-icon\s*\{[^}]+width:\s*46px[^}]+height:\s*46px[^}]+flex-basis:\s*46px/);
  assert.match(polish, /\.transport-card \.route-location-media\s*\{[^}]+width:\s*84px[^}]+height:\s*84px[^}]+border-radius:\s*20px/);
  assert.match(polish, /\.transport-card\s*\{\s*--transport-media-text-gap:\s*14px/);
  assert.match(polish, /\.transport-card \.provider,\s*\.transport-card \.route-endpoint\s*\{\s*gap:\s*var\(--transport-media-text-gap\)/);
  assert.match(polish, /\.transport-card \.route-endpoint\s*\{\s*grid-template-columns:\s*84px minmax\(0,1fr\)/);
  assert.match(polish, /\.transport-card \.provider small,\s*\.transport-card \.route-duration,\s*\.transport-card \.route-city,\s*\.transport-card \.transport-details,\s*\.transport-card \.transport-seats\s*\{[^}]+font-size:\s*calc\(\.875rem \* var\(--font-scale\)\)/);
  assert.match(polish, /@media \(max-width:\s*600px\)[\s\S]+\.transport-card \.route-location-media\s*\{[^}]+width:\s*52px[^}]+height:\s*52px[^}]+border-radius:\s*14px/);
  assert.match(polish, /@media \(max-width:\s*600px\)[\s\S]+\.transport-card \.route-duration\s*\{\s*font-size:\s*calc\(\.6875rem \* var\(--font-scale\)\)/);
  assert.match(polish, /@media \(max-width:\s*600px\)[\s\S]+\.transport-card \.route-city\s*\{\s*font-size:\s*calc\(\.75rem \* var\(--font-scale\)\)/);
  assert.match(polish, /\.provider-icon\.has-provider-image,[\s\S]+\.place-media:has\(img\)\s*\{[^}]+border:\s*0 !important[^}]+box-shadow:\s*0 9px 22px rgba\(48,48,48,\.18\),0 3px 8px rgba\(78,185,174,\.10\)/);
  assert.match(polish, /\.transport-card \.provider-icon\.has-provider-image\s*\{[^}]+width:\s*46px[^}]+min-width:\s*46px[^}]+height:\s*46px[^}]+flex-basis:\s*46px/);
  assert.match(polish, /\.transport-card \.provider-icon\.has-provider-image\s*\{[^}]+background:\s*#fdfbf7/);
  assert.match(polish, /\[data-theme="dark"\] \.transport-card \.provider-icon\.has-provider-image\s*\{[^}]+background:\s*var\(--surface-soft\)/);
  assert.match(polish, /\.scroll-top\s*\{[^}]+background-color:\s*color-mix\(in srgb,var\(--transport-icon-background\) 76%,transparent\)[^}]+background-image:\s*none[^}]+color:\s*var\(--transport-icon-colour\)/);
  assert.match(polish, /\[data-theme="dark"\] \.scroll-top\s*\{[^}]+background-color:\s*color-mix\(in srgb,var\(--transport-icon-background\) 72%,transparent\)/);
  assert.match(polish, /\.scroll-top\s*\{[^}]+--scroll-top-fade-duration:\s*260ms[^}]+position:\s*fixed[^}]+right:\s*max\(22px,env\(safe-area-inset-right\)\)[^}]+bottom:\s*max\(22px,env\(safe-area-inset-bottom\)\)[^}]+visibility:\s*hidden[^}]+pointer-events:\s*none[^}]+transition:[^}]+opacity var\(--scroll-top-fade-duration\)[^}]+visibility 0s linear var\(--scroll-top-fade-duration\)/);
  assert.match(polish, /\.scroll-top\.is-visible\s*\{[^}]+opacity:\s*1[^}]+visibility:\s*visible[^}]+pointer-events:\s*auto/);
  assert.doesNotMatch(polish, /\.workspace-actions > \.scroll-top/);
  assert.match(polish, /\[data-theme="dark"\][^}]+--date-icon-colour:\s*#FFAD8D[^}]+--duration-icon-colour:\s*#DCEA87[^}]+--transport-icon-colour:\s*#7DD5CB/);
  assert.match(polish, /\.section-heading::after/);
  assert.match(polish, /\.amenity-card::before\s*\{[^}]+background:\s*var\(--brand-gradient-vertical\)/);
  assert.match(polish, /\.amenity-card-header\s*\{[^}]+background:\s*var\(--transport-detail-gradient\)/);
  assert.match(polish, /\.amenity-card-header h3\s*\{[^}]+min-height:\s*44px[^}]+border:\s*3px solid transparent[^}]+border-radius:\s*999px[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box[^}]+font-size:\s*var\(--text-body\)[^}]+letter-spacing:\s*\.12em[^}]+text-transform:\s*uppercase/);
  assert.match(polish, /\.amenity-group-heading\s*\{[^}]+display:\s*flex[^}]+align-items:\s*center[^}]+gap:\s*10px/);
  assert.match(polish, /\.amenity-group-icon\s*\{[^}]+display:\s*grid[^}]+place-items:\s*center[^}]+border-color:\s*var\(--amenity-accent-colour\)[^}]+border-radius:\s*50%[^}]+background:\s*var\(--amenity-accent-background\)[^}]+color:\s*var\(--amenity-accent-colour\)/);
  assert.match(polish, /\.amenity-group h4\s*\{[^}]+background:\s*none[^}]+color:\s*#303030[^}]+-webkit-text-fill-color:\s*currentColor/);
  assert.match(polish, /\.amenity-groups\s*\{[^}]+grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)[^}]+gap:\s*14px/);
  assert.match(polish, /\.amenity-group\s*\{\s*--amenity-accent-background:\s*var\(--icon-coral-background\);\s*--amenity-accent-colour:\s*var\(--icon-coral-colour\);[^}]+display:\s*grid[^}]+grid-template-rows:\s*auto 1fr[^}]+padding:\s*0[^}]+border-radius:\s*17px[^}]+background:\s*#FFFFFF/);
  assert.match(polish, /\.amenity-group:nth-child\(3n\+2\)\s*\{[^}]+--amenity-accent-background:\s*var\(--icon-olive-background\)[^}]+--amenity-accent-colour:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.amenity-group:nth-child\(3n\+3\)\s*\{[^}]+--amenity-accent-background:\s*var\(--icon-teal-background\)[^}]+--amenity-accent-colour:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.amenity-group-heading\s*\{[^}]+padding:\s*16px 18px 15px 20px[^}]+background:\s*linear-gradient\(120deg,[^}]+#FFFFFF 28%,var\(--amenity-accent-background\)[^}]+#FFFFFF 72%,var\(--amenity-accent-background\)[^}]+box-shadow:\s*none/);
  assert.match(polish, /\.amenity-group ul\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+grid-auto-rows:\s*var\(--amenity-row-block-size\)[^}]+background:\s*#FFFCF0[^}]+list-style:\s*none/);
  assert.match(polish, /\.amenity-group ul::before\s*\{[^}]+width:\s*4px[^}]+background:\s*var\(--amenity-accent-colour\)/);
  assert.match(polish, /\.amenity-group li\s*\{[^}]+display:\s*flex[^}]+block-size:\s*100%[^}]+min-block-size:\s*var\(--amenity-row-block-size\)[^}]+align-items:\s*center[^}]+border-bottom:\s*1px solid[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(polish, /\.day-header\s*\{[^}]+display:\s*block[^}]+border-bottom:\s*0[^}]+background:\s*var\(--transport-detail-gradient\)/);
  assert.match(polish, /\.day-header \.day-heading\s*\{[^}]+display:\s*grid[^}]+grid-template-columns:\s*56px minmax\(0,1fr\)[^}]+font-size:\s*calc\(1\.25rem \* var\(--font-scale\)\)/);
  assert.match(polish, /\.day-heading-calendar\s*\{[^}]+width:\s*56px[^}]+height:\s*60px[^}]+grid-template-rows:\s*21px minmax\(0,1fr\)[^}]+border:\s*var\(--icon-outline-width\) solid transparent[^}]+border-radius:\s*15px[^}]+var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /\.day-heading-month\s*\{[^}]+background:\s*var\(--transport-icon-background\)[^}]+color:\s*var\(--transport-icon-colour\)[^}]+text-transform:\s*uppercase/);
  assert.match(polish, /\.day-heading-number\s*\{[^}]+font-size:\s*calc\(1\.375rem \* var\(--font-scale\)\)[^}]+font-weight:\s*700/);
  assert.match(polish, /\.day-heading-copy\s*\{[^}]+display:\s*flex[^}]+align-items:\s*baseline[^}]+flex-wrap:\s*wrap[^}]+gap:\s*0 8px/);
  assert.match(polish, /\.day-heading-weekday\s*\{[^}]+display:\s*inline[^}]+margin:\s*0[^}]+padding:\s*0[^}]+border:\s*0[^}]+background:\s*none[^}]+box-shadow:\s*none[^}]+color:\s*var\(--text\)[^}]+font-size:\s*calc\(1\.125rem \* var\(--font-scale\)\)[^}]+-webkit-text-fill-color:\s*currentColor/);
  assert.match(polish, /\.day-heading-weekday\s*\{[^}]+font-weight:\s*var\(--font-weight-pill-title\)/);
  assert.match(polish, /body \.brand-wordmark > span,\s*body \.hero \.location-line,\s*body \.section-pill > span,\s*body \.day-heading-weekday,\s*body \.amenity-card-header h3,\s*body \.saved-places h3\s*\{\s*font-weight:\s*var\(--font-weight-pill-title\) !important/);
  assert.match(polish, /--reference-dot-size:\s*5px[^}]+--reference-dot-gap:\s*52px[^}]+--reference-dot-side-space:\s*calc\(\(var\(--reference-dot-gap\) - var\(--reference-dot-size\)\) \/ 2\)/);
  assert.match(polish, /\.day-heading-title\s*\{[^}]+color:\s*var\(--text\)[^}]+-webkit-text-fill-color:\s*currentColor/);
  assert.doesNotMatch(polish, /\.day-heading-date\s*\{/);
  assert.match(polish, /\.day-heading-separator\s*\{[^}]+color:\s*var\(--text\)[^}]+font-size:\s*\.5em[^}]+font-weight:\s*var\(--font-weight-regular\)/);
  assert.match(polish, /\.day-heading-title\s*\{[^}]+min-width:\s*0[^}]+margin-left:\s*0[^}]+font-weight:\s*var\(--font-weight-regular\)/);
  assert.match(polish, /body \.day-heading-title\s*\{\s*font-weight:\s*var\(--font-weight-regular\) !important/);
  assert.match(polish, /\[data-theme="dark"\] \.day-header\s*\{[^}]+background:\s*var\(--transport-detail-gradient\)/);
  assert.match(polish, /\.day-card::before,\.saved-places::before\s*\{[^}]+width:\s*5px[^}]+background:\s*var\(--brand-gradient-vertical\)/);
  assert.doesNotMatch(polish, /\.day-card \.block-label::after/);
  assert.match(polish, /\.day-card \.block-label\s*\{[^}]+width:\s*max-content[^}]+background:\s*var\(--section-outline-gradient\)[^}]+font-size:\s*calc\(1rem \* var\(--font-scale\)\)[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /\.saved-places-header\s*\{[^}]+background:\s*var\(--transport-detail-gradient\)/);
  assert.match(polish, /\.saved-places h3\s*\{[^}]+min-height:\s*44px[^}]+border:\s*3px solid transparent[^}]+border-radius:\s*999px[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box[^}]+font-size:\s*var\(--text-body\)[^}]+font-weight:\s*var\(--font-weight-pill-title\)[^}]+letter-spacing:\s*\.12em[^}]+text-transform:\s*uppercase/);
  assert.match(polish, /\.saved-place-group-header h4\s*\{[^}]+background:\s*var\(--section-outline-gradient\)[^}]+text-transform:\s*uppercase[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /\.saved-place-group \.saved-grid\s*\{[^}]+grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(polish, /\.saved-place-group \.saved-place-card\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+grid-template-areas:\s*"main"\s*"footer"[^}]+row-gap:\s*15px[^}]+padding:\s*14px 16px[^}]+border-radius:\s*18px[^}]+background:\s*var\(--card-wash-gradient\)[^}]+box-shadow:\s*0 8px 22px/);
  assert.match(polish, /\[data-theme="dark"\] \.saved-place-group \.saved-place-card\s*\{[^}]+background:\s*var\(--card-wash-gradient\)/);
  assert.match(polish, /\.saved-place-group\s*\{[^}]+--meal-action-size:\s*26px[^}]+--meal-action-glyph-size:\s*13px/);
  assert.match(polish, /\.saved-place-card \.food-card-copy\s*\{[^}]+display:\s*flex[^}]+grid-area:\s*auto/);
  assert.match(polish, /\.day-card \.place-row,\s*\.saved-grid \.place-row\s*\{[^}]+border-radius:\s*17px/);
  assert.match(polish, /\.day-card \.place-row,\s*\.saved-grid \.place-row\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\) auto[^}]+grid-template-areas:\s*"overview actions"[^}]+gap:\s*20px/);
  assert.match(polish, /\.day-card \.place-overview,\s*\.saved-grid \.place-overview\s*\{[^}]+grid-area:\s*overview[^}]+grid-template-columns:\s*124px minmax\(0,1fr\)/);
  assert.match(polish, /\.day-card \.place-list\s*\{[^}]+grid-template-columns:\s*1fr/);
  assert.doesNotMatch(polish, /\.place-action-dot/);
  assert.match(polish, /\.day-card \.place-card-copy,\s*\.saved-grid \.place-card-copy\s*\{[^}]+grid-template-areas:\s*"title"/);
  assert.match(polish, /\.day-card \.place-row\.has-comment\.has-routes \.place-card-copy,\s*\.saved-grid \.place-row\.has-comment\.has-routes \.place-card-copy\s*\{[^}]+grid-template-areas:\s*\n\s*"title"\s*\n\s*"comment"\s*\n\s*"routes"/);
  assert.match(polish, /\.day-card \.place-copy,\s*\.saved-grid \.place-copy\s*\{[^}]+gap:\s*0/);
  assert.match(polish, /\.place-card-copy \.place-copy strong\s*,[\s\S]+background:\s*none[^}]+color:\s*#303030[^}]+font-size:\s*calc\(1\.125rem \* var\(--font-scale\)\)[^}]+-webkit-text-fill-color:\s*#303030/);
  assert.match(polish, /\.place-priority-star\s*\{[^}]+--priority-star-background:\s*var\(--icon-teal-background\)[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+place-items:\s*center start[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.place-priority-star-glyph\s*\{[^}]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)[^}]+place-items:\s*center/);
  assert.match(polish, /\.place-priority-star-glyph svg\s*\{[^}]+width:\s*100%[^}]+height:\s*100%[^}]+fill:\s*var\(--priority-star-background\)[^}]+stroke:\s*currentColor[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.match(polish, /\.place-priority-star\.priority-high\s*\{[^}]+--priority-star-background:\s*var\(--icon-coral-background\)[^}]+color:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /\.place-priority-star\.priority-medium\s*\{[^}]+--priority-star-background:\s*var\(--icon-olive-background\)[^}]+color:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.place-priority-star\.priority-low\s*\{[^}]+--priority-star-background:\s*var\(--icon-teal-background\)[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.place-comment \+ \.place-route-modes,[\s\S]+margin-top:\s*13px/);
  assert.match(polish, /\.day-card \.place-comment,[\s\S]+font-size:\s*var\(--text-minimum\)/);
  assert.match(polish, /\.hero \.location-line\s*\{[^}]+min-height:\s*46px[^}]+border:\s*3px solid transparent[^}]+box-shadow:\s*0 8px 18px rgba\(48,48,48,\.16\)/);
  assert.match(polish, /\.saved-place-groups\s*\{[^}]+grid-template-columns:\s*1fr/);
  assert.match(polish, /@container \(max-width:620px\)[\s\S]+\.saved-place-group \.saved-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(polish, /\.saved-place-group \.saved-grid \.place-row\s*\{/);
  assert.match(polish, /\.property-pills span,\.area-pill\s*\{[^}]+border:\s*0[^}]+background:\s*color-mix\(in srgb,var\(--surface\) 78%,var\(--surface-soft\)\)/);
  assert.match(polish, /\.place-route-mode\s*\{[^}]+border:\s*0[^}]+background:\s*#fffcf0/);
  assert.match(polish, /\.place-route-modes\s*,[\s\S]+display:\s*inline-grid[^}]+width:\s*max-content[^}]+grid-auto-columns:\s*var\(--place-route-column-size, minmax\(max-content,1fr\)\)[^}]+grid-auto-flow:\s*column[^}]+gap:\s*8px/);
  assert.match(main, /window\.addEventListener\("fontscalechange", schedulePlaceRouteWidths\)/);
  assert.match(main, /elements\.sectionsRoot\.style\.removeProperty\("--place-route-column-size"\)[\s\S]+Math\.max\(\.\.\.routes\.map\(\(route\) => route\.getBoundingClientRect\(\)\.width\)\)[\s\S]+setProperty\("--place-route-column-size", `\$\{Math\.ceil\(widest\)\}px`\)/);
  assert.match(polish, /\.place-route-mode \.place-route-icon\s*,[\s\S]+background:\s*var\(--route-pill-background\)/);
  assert.match(polish, /\.place-route-mode > span:last-child\s*,[\s\S]+display:\s*grid[^}]+align-content:\s*center[^}]+gap:\s*3px/);
  assert.doesNotMatch(polish, /\.priority-badge\s*\{/);
  assert.match(polish, /\.place-route-mode\[data-mode="driving"\][^}]+--route-pill-background:\s*var\(--icon-coral-background\)[^}]+--route-pill-colour:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /\.place-route-mode\[data-mode="cycling"\][^}]+--route-pill-background:\s*var\(--icon-olive-background\)[^}]+--route-pill-colour:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.place-route-mode\[data-mode="walking"\][^}]+--route-pill-background:\s*var\(--icon-teal-background\)[^}]+--route-pill-colour:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.place-route-mode strong\s*,[\s\S]+font-size:\s*calc\(\.8125rem \* var\(--font-scale\)\)[^}]+font-weight:\s*800/);
  assert.match(polish, /\.meal-grid\s*\{[^}]+grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(polish, /\.meal-grid > \.meal-empty-banner\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(polish, /\.meal-group \.food-row\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+grid-template-areas:\s*"main"\s*"footer"[^}]+row-gap:\s*15px[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(polish, /\.meal-card-main\s*\{[^}]+grid-area:\s*main[^}]+gap:\s*8px[^}]+background:\s*color-mix\(in srgb,var\(--surface\) 96%,transparent\)/);
  assert.match(polish, /\.day-card \.meal-group \.meal-card-heading\s*\{[^}]+grid-template-columns:\s*60px minmax\(0,1fr\)/);
  assert.match(polish, /\.day-card \.meal-group \.meal-card-heading \.place-media\s*\{[^}]+width:\s*60px[^}]+height:\s*60px[^}]+border-radius:\s*16px/);
  assert.match(polish, /\.meal-group h4\s*\{[^}]+display:\s*flex[^}]+align-items:\s*center[^}]+gap:\s*8px/);
  assert.match(polish, /\.meal-heading-icon\s*\{[^}]+--meal-icon-outline-width:\s*var\(--icon-outline-width\)[^}]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+border:\s*var\(--meal-icon-outline-width\)[^}]+border-radius:\s*50%/);
  assert.match(polish, /\.meal-heading-glyph\s*\{[^}]+display:\s*grid[^}]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)[^}]+place-items:\s*center/);
  assert.match(polish, /\.meal-heading-glyph svg\s*\{[^}]+width:\s*100%[^}]+height:\s*100%[^}]+stroke:\s*currentColor[^}]+stroke-width:\s*var\(--icon-stroke-width\)/);
  assert.match(polish, /\.meal-heading-icon-breakfast\s*\{[^}]+background:\s*var\(--icon-teal-background\)[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.meal-heading-icon-lunch\s*\{[^}]+background:\s*var\(--icon-olive-background\)[^}]+color:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.meal-heading-icon-dinner\s*\{[^}]+background:\s*var\(--icon-coral-background\)[^}]+color:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /\.meal-heading-label-breakfast\s*\{\s*color:\s*var\(--icon-teal-colour\)/);
  assert.match(polish, /\.meal-heading-label-lunch\s*\{\s*color:\s*var\(--icon-olive-colour\)/);
  assert.match(polish, /\.meal-heading-label-dinner\s*\{\s*color:\s*var\(--icon-coral-colour\)/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.meal-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.day-card \.place-overview,[\s\S]+grid-template-columns:\s*76px minmax\(0,1fr\)/);
  assert.match(polish, /@media \(max-width:420px\)[\s\S]+\.day-card \.place-row,[\s\S]+grid-template-columns:\s*1fr[^}]+"overview"\s*"actions"/);
  assert.match(polish, /\.day-card \.meal-group \.food-card-copy \.place-copy strong\s*\{[^}]+font-size:\s*calc\(1rem \* var\(--font-scale\)\)/);
  assert.match(polish, /--title-priority-gap:\s*8px[\s\S]+\.food-card-copy\s*\{[^}]+display:\s*flex[^}]+flex-direction:\s*column[^}]+gap:\s*var\(--title-priority-gap\)/);
  assert.match(polish, /\.food-card-copy > \.place-copy,\s*\.food-card-copy > \.open\s*\{\s*grid-area:\s*auto/);
  assert.match(polish, /\.food-card-copy > \.entry-links\s*\{[^}]+grid-area:\s*actions[^}]+justify-self:\s*start/);
  assert.match(polish, /\.food-card-copy > \.entry-links \.map-link,[\s\S]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+flex-basis:\s*var\(--content-icon-size\)/);
  assert.match(polish, /\.food-card-copy > \.entry-links \.map-link svg,[\s\S]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(polish, /\.meal-group\s*\{[^}]+--meal-action-size:\s*26px[^}]+--meal-action-glyph-size:\s*13px/);
  assert.match(polish, /\.meal-card-description\s*\{[^}]+width:\s*100%[^}]+font-size:\s*var\(--text-minimum\)[^}]+text-align:\s*left/);
  assert.match(polish, /\.meal-card-footer\s*\{[^}]+grid-area:\s*footer[^}]+gap:\s*12px[^}]+margin-inline:\s*12px/);
  assert.match(polish, /\.meal-card-footer\.has-route\s*\{\s*justify-content:\s*space-between/);
  assert.match(polish, /\.meal-card-footer > \.entry-links \.map-link,[\s\S]+width:\s*var\(--meal-action-size\)[^}]+height:\s*var\(--meal-action-size\)[^}]+flex-basis:\s*var\(--meal-action-size\)[^}]+border-radius:\s*8px/);
  assert.match(polish, /\.meal-card-footer > \.entry-links \.map-link svg,[\s\S]+width:\s*var\(--meal-action-glyph-size\)[^}]+height:\s*var\(--meal-action-glyph-size\)/);
  const agendaPlaceCards = polish.slice(polish.indexOf("Agenda places use the same layered card language"));
  assert.match(agendaPlaceCards, /\.day-card \.place-list\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(agendaPlaceCards, /\.day-card \.place-row,[\s\S]+grid-template-areas:\s*\n\s*"main"\s*\n\s*"footer"[^}]+padding:\s*14px 16px[^}]+background:\s*var\(--card-wash-gradient\)/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-main\s*\{[^}]+grid-area:\s*main[^}]+gap:\s*18px[^}]+padding:\s*18px 20px[^}]+background:\s*color-mix\(in srgb,var\(--surface\) 96%,transparent\)/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-heading\s*\{[^}]+grid-template-columns:\s*84px minmax\(0,1fr\)[^}]+align-items:\s*center/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-heading > \.place-media\s*\{[^}]+width:\s*84px[^}]+height:\s*84px[^}]+border-radius:\s*20px/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-heading-copy\s*\{[^}]+display:\s*flex[^}]+align-self:\s*center[^}]+align-items:\s*flex-start[^}]+flex-direction:\s*column[^}]+gap:\s*var\(--title-priority-gap\)[^}]+text-align:\s*left/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-heading \.place-copy\s*\{[^}]+width:\s*100%[^}]+grid-area:\s*auto[^}]+text-align:\s*left/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-heading \.place-copy strong\s*\{[^}]+font-size:\s*calc\(1\.125rem \* var\(--font-scale\)\)/);
  assert.match(agendaPlaceCards, /\.day-card \.meal-group \.place-priority-pill\s*\{[^}]+min-height:\s*18px[^}]+padding:\s*1px 6px/);
  assert.match(agendaPlaceCards, /\.day-card \.place-priority-pill\.priority-high,[\s\S]+background:\s*var\(--icon-coral-background\)[^}]+color:\s*var\(--icon-coral-colour\)/);
  assert.match(agendaPlaceCards, /\.day-card \.place-priority-pill\.priority-medium,[\s\S]+background:\s*var\(--icon-olive-background\)[^}]+color:\s*var\(--icon-olive-colour\)/);
  assert.match(agendaPlaceCards, /\.day-card \.place-priority-pill\.priority-low,[\s\S]+background:\s*var\(--icon-teal-background\)[^}]+color:\s*var\(--icon-teal-colour\)/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-main \.place-comment\s*\{[^}]+width:\s*100%[^}]+grid-area:\s*auto[^}]+justify-self:\s*stretch[^}]+text-align:\s*left/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-footer\s*\{[^}]+display:\s*flex[^}]+justify-content:\s*space-between[^}]+flex-wrap:\s*wrap/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-footer > \.place-route-toggle\s*\{[^}]+margin-left:\s*auto/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-footer > \.entry-links \.map-link,[\s\S]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+flex-basis:\s*var\(--content-icon-size\)[^}]+border-radius:\s*9px/);
  assert.match(agendaPlaceCards, /\.day-card \.agenda-place-footer > \.entry-links \.map-link svg,[\s\S]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*760px\)\s*\{\s*\.day-card \.place-list\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(polish, /\.meal-group h4\s*\{[^}]+font-size:\s*calc\(\.8125rem \* var\(--font-scale\)\)/);
  assert.match(polish, /\.meal-route-toggle\s*\{[^}]+display:\s*flex[^}]+width:\s*var\(--meal-route-toggle-size,96px\)[^}]+border:\s*var\(--icon-outline-width\) solid var\(--meal-route-colour\)[^}]+background:\s*var\(--meal-route-background\)[^}]+color:\s*var\(--meal-route-colour\)/);
  assert.match(polish, /\.meal-route-toggle\[data-mode="cycling"\][^}]+--meal-route-background:\s*var\(--icon-olive-background\)/);
  assert.match(polish, /\.meal-route-toggle\[data-mode="walking"\][^}]+--meal-route-background:\s*var\(--icon-teal-background\)/);
  assert.match(main, /function initializeMealRouteToggles\(\)[\s\S]+data-meal-route-toggle[\s\S]+currentIndex[\s\S]+option\.hidden = option !== next[\s\S]+toggle\.dataset\.mode = next\.dataset\.routeMode/);
  assert.match(main, /removeProperty\("--meal-route-toggle-size"\)[\s\S]+querySelectorAll\("\.meal-route-option"\)[\s\S]+clone\.hidden = false[\s\S]+widestToggle = Math\.max[\s\S]+setProperty\("--meal-route-toggle-size", `\$\{Math\.ceil\(widestToggle\)\}px`\)/);
  assert.doesNotMatch(polish, /\.meal-route-cycle/);
  assert.doesNotMatch(polish, /\.meal-group h4::after/);
  assert.match(polish, /--attachment-tab-gradient:\s*linear-gradient\(115deg,[^;]+var\(--gradient-coral\)[^;]+var\(--gradient-olive\)[^;]+var\(--gradient-teal\)/);
  assert.match(polish, /--attachment-frame-shadow:\s*-10px 16px 32px rgba\(247,131,97,\.065\)[^;]+rgba\(168,198,78,\.045\)[^;]+rgba\(78,185,174,\.075\)/);
  assert.match(polish, /--attachment-frame-shadow-hover:\s*-12px 18px 36px rgba\(247,131,97,\.085\)[^;]+rgba\(168,198,78,\.06\)[^;]+rgba\(78,185,174,\.095\)/);
  assert.match(polish, /\.block-frame\.has-attachments\s*\{\s*box-shadow:\s*var\(--attachment-frame-shadow\)/);
  assert.match(polish, /\.editor-block:hover \.block-frame\.has-attachments\s*\{\s*box-shadow:\s*var\(--attachment-frame-shadow-hover\)/);
  assert.match(polish, /\.block-frame\.has-attachments > \.attachment-section\s*\{[^}]+margin:\s*12px 14px 14px[^}]+background:\s*var\(--attachment-tab-gradient\)/);
  assert.match(polish, /\.block-frame\.has-attachments > \.attachment-section\s*\{[^}]+box-shadow:\s*var\(--attachment-tray-shadow\)/);
  assert.match(polish, /\.attachment-summary > svg\s*\{[^}]+width:\s*36px[^}]+height:\s*36px[^}]+border-radius:\s*50%/);
  assert.match(polish, /\.attachment-summary-copy strong\s*\{[^}]+background:\s*var\(--section-title-gradient\)[^}]+-webkit-text-fill-color:\s*transparent/);
  assert.match(polish, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(polish, /\.nav-item\.is-active::after/);
  assert.match(polish, /\.hero \.hero-stat-probe\s*\{[^}]+width:\s*max-content/);
  assert.match(polish, /\.hero > div:first-child\s*\{[^}]+overflow:\s*visible[^}]+border:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /#destination\s*\{[^}]+border:\s*0[^}]+outline:\s*0[^}]+background:\s*var\(--hero-title-gradient\)[^}]+box-shadow:\s*none[^}]+filter:\s*none[^}]+text-shadow:\s*none/);
  assert.match(polish, /\.hero::before\s*\{[^}]+linear-gradient\(120deg,rgba\(247,131,97,\.28\) 0%,rgba\(168,198,78,\.16\) 50%,rgba\(78,185,174,\.24\) 100%\)/);
  assert.match(polish, /--hero-legibility-overlay:\s*linear-gradient\(180deg,rgba\(50,52,51,\.18\) 0%,rgba\(50,52,51,\.24\) 100%\)/);
  assert.match(polish, /\.hero::before\s*\{[^}]+background:\s*var\(--hero-legibility-overlay\)/);
  assert.match(polish, /\.hero-stats\s*\{[^}]+border:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none[^}]+backdrop-filter:\s*none/);
  assert.match(polish, /\.hero \.stat\s*\{[^}]+min-height:\s*72px[^}]+padding:\s*10px 18px[^}]+border:\s*3px solid transparent[^}]+border-radius:\s*999px[^}]+linear-gradient\(#FFFFFF,#FFFFFF\) padding-box[^}]+var\(--section-outline-gradient\) border-box/);
  assert.match(polish, /@media \(max-width:600px\)[\s\S]+\.hero \.stat\s*\{[^}]+min-height:\s*63px[^}]+border-radius:\s*999px/);
  assert.match(polish, /\.hero \.stat:not\(:last-child\)::after\s*\{\s*content:\s*none/);
  assert.doesNotMatch(polish, /\.hero > div:first-child\s*\{[^}]+background:\s*rgba\(255,253,249,\.94\)/);
  assert.match(polish, /\[data-theme="dark"\] \.day-card \.place-card-copy \.place-copy strong,[\s\S]+\[data-theme="dark"\] \.amenity-group li\s*\{[^}]+color:\s*var\(--text\)[^}]+-webkit-text-fill-color:\s*var\(--text\)/);
  assert.match(polish, /\[data-theme="dark"\] \.language-button\.is-active,[\s\S]+\[data-theme="dark"\] \.quiet-button:hover\s*\{\s*color:\s*var\(--text\)/);
  assert.match(polish, /Every light pill receives a proper charcoal surface in dark mode/);
  assert.match(polish, /\[data-theme="dark"\] \.workspace-bar \.brand,[\s\S]+\[data-theme="dark"\] \.palette-popover\s*\{[^}]+linear-gradient\(var\(--surface-soft\),var\(--surface-soft\)\) padding-box[^}]+color:\s*var\(--text\)/);
  assert.match(polish, /\[data-theme="dark"\] \.section-pill\s*\{[^}]+linear-gradient\(var\(--surface-soft\),var\(--surface-soft\)\) padding-box[^}]+border-box !important/);
  assert.match(polish, /\[data-theme="dark"\] \.day-card \.place-route-mode,[\s\S]+background:\s*var\(--surface-soft\)[^}]+color:\s*var\(--text\)/);
});

test("uses one readable font size for shared category headings", async () => {
  const [tokens, typography, stayDetails, polish] = await Promise.all([
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/typography.css", "utf8"),
    readFile("src/client/styles/stay-details.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);

  assert.match(tokens, /--text-category-title:\s*var\(--text-small\)/);
  assert.match(tokens, /:root\s*\{[^}]+--text:\s*#303030[^}]+--muted:\s*#303030[^}]+--faint:\s*#303030/);
  assert.match(tokens, /--text-minimum:\s*max\(14px,calc\(14px \* var\(--font-scale\)\)\)/);
  assert.match(tokens, /--text-caption:\s*var\(--text-minimum\)/);
  assert.match(tokens, /--text-small:\s*var\(--text-minimum\)/);
  assert.match(polish, /Keep every piece of readable interface text at or above the reduced 14px floor/);
  assert.match(polish, /\.toast,[\s\S]+\.transport-card \.transport-seats\s*\{\s*font-size:\s*var\(--text-minimum\)/);
  assert.match(polish, /\.stat strong\s*\{\s*font-size:\s*max\(var\(--text-minimum\),calc\(\.9375rem \* var\(--font-scale\)\)\)/);
  assert.match(polish, /One exact colour for ordinary light-theme copy/);
  assert.match(polish, /:root:not\(\[data-theme="dark"\]\) \.meal-group h4,[\s\S]+:root:not\(\[data-theme="dark"\]\) \.day-header h3,[\s\S]+:root:not\(\[data-theme="dark"\]\) \.stay-title-copy p,[\s\S]+body\.is-editing \.place-route-editor-mode legend,[\s\S]+body\.is-editing \.add-block > span\s*\{\s*color:\s*#303030/);
  const categoryRule = typography.match(/\.section-pill,[^{]+\{[^}]+\}/)?.[0] ?? "";
  for (const selector of [
    ".section-pill",
    ".stay-title-row small",
    ".amenity-group h4",
    ".block-label",
    ".day-header small",
    ".meal-group h4",
  ]) {
    assert.match(categoryRule, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(categoryRule, /font-size:\s*var\(--text-category-title\)/);
  assert.match(stayDetails, /\.amenity-card header small[^}]+font-size:\s*var\(--text-category-title\)/);
});

test("removes the password dialog and starts editing through a direct session", async () => {
  const [html, auth] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/auth/auth-dialog.js", "utf8"),
  ]);

  assert.doesNotMatch(html, /authDialog|passwordInput|Protected Access/);
  assert.match(auth, /api\.enableEditing\(session\.csrfToken\)/);
  assert.doesNotMatch(auth, /showModal|password|login/);
});
