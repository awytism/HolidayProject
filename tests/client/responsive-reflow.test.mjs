import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("narrow layouts stack dense cards instead of squeezing their contents", async () => {
  const [polish, main] = await Promise.all([
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/main.js", "utf8"),
  ]);
  const mobile = polish.slice(polish.indexOf("Responsive reflow guardrails"));

  assert.match(mobile, /\.workspace-actions\s*\{[^}]+flex-wrap:\s*wrap/);
  assert.match(mobile, /\.transport-card \.route-timeline\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(mobile, /\.transport-card \.route-line > span\s*\{\s*display:\s*none/);
  assert.match(mobile, /\.transport-card \.detail-strip\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(mobile, /@media \(max-width:\s*820px\)[\s\S]+\.day-card \.place-row\.has-routes,[\s\S]+grid-template-areas:\s*\n\s*"overview"\s*\n\s*"actions"/);
  assert.match(mobile, /\.day-card \.place-row\.has-routes,[\s\S]+grid-template-areas:\s*\n\s*"overview"\s*\n\s*"actions"/);
  assert.match(mobile, /\.day-card \.place-overview,[\s\S]+grid-template-columns:\s*84px minmax\(0,1fr\)/);
  assert.match(mobile, /\.day-card \.place-route-modes,[\s\S]+grid-auto-flow:\s*row[\s\S]+overflow:\s*visible/);
  assert.match(mobile, /@media \(max-width:\s*340px\)[\s\S]+\.day-card \.place-overview,[\s\S]+grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(polish, /\.amenity-group\s*\{[^}]+--amenity-row-block-size:\s*calc\(1lh \+ 18px\)/);
  assert.match(polish, /\.amenity-group ul\s*\{[^}]+grid-auto-rows:\s*var\(--amenity-row-block-size\)/);
  assert.match(polish, /\.amenity-group li > span:last-child\s*\{[^}]+max-width:\s*100%[^}]+text-overflow:\s*ellipsis[^}]+white-space:\s*nowrap/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+grid-template-areas:\s*\n\s*"brand"\s*\n\s*"nav"\s*\n\s*"actions"/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+\.workspace-actions\s*\{[^}]+flex-wrap:\s*nowrap[^}]+overflow-x:\s*auto/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+\.amenity-group\s*\{\s*--amenity-row-block-size:\s*calc\(1lh \+ 18px\)/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+\.day-header \.day-heading\s*\{[^}]+grid-template-columns:\s*52px minmax\(0,1fr\)[^}]+grid-template-rows:\s*auto[^}]+row-gap:\s*0/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+\.day-heading-calendar\s*\{[^}]+width:\s*52px[^}]+height:\s*56px[^}]+grid-column:\s*1[^}]+grid-row:\s*1/);
  assert.match(polish, /@media \(max-width:\s*520px\)[\s\S]+\.day-heading-copy\s*\{[^}]+grid-column:\s*2[^}]+grid-row:\s*1/);
  assert.match(main, /function synchronizeBilingualLayout\(\)[\s\S]+\["en-GB", "pt-BR"\]/);
});

test("collapsed place cards and workspace controls keep a deliberate mobile order", async () => {
  const [page, polish, main] = await Promise.all([
    readFile(new URL("../../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../../src/client/styles/polish.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/client/main.js", import.meta.url), "utf8"),
  ]);
  assert.match(page, /id="mobileActionsToggle"[\s\S]+aria-controls="workspaceActions"/);
  const collapsedMenu = polish.slice(polish.indexOf("Mobile navigation stays on one compact row"));
  assert.match(collapsedMenu, /grid-template-areas:\s*"brand nav mobile-actions"[^}]+justify-content:\s*center/);
  assert.match(collapsedMenu, /\.main-nav\s*\{[^}]+justify-self:\s*center/);
  assert.match(collapsedMenu, /\.workspace-actions\s*\{[^}]+width:\s*min\(272px,calc\(100vw - 20px\)\)[^}]+grid-template-columns:\s*repeat\(8,minmax\(0,1fr\)\)[^}]+transform:\s*translateX\(50%\)/);
  assert.match(collapsedMenu, /\.workspace-bar\.is-mobile-menu-open \.workspace-actions\s*\{\s*display:\s*grid/);
  assert.match(collapsedMenu, /\.workspace-actions > \.language-switch,[\s\S]+grid-column:\s*span 4/);
  assert.match(collapsedMenu, /\.workspace-actions button\s*\{[^}]+touch-action:\s*manipulation/);
  assert.match(collapsedMenu, /\.day-card \.place-row,[\s\S]+row-gap:\s*24px[^}]+padding:\s*22px 20px/);
  assert.match(collapsedMenu, /\.day-card \.place-route-modes,[\s\S]+gap:\s*13px/);
  assert.match(collapsedMenu, /\.day-card \.place-row > \.entry-links,[\s\S]+gap:\s*12px/);
  assert.match(collapsedMenu, /\.hero\s*\{\s*gap:\s*clamp\(56px,15vw,72px\)/);
  assert.match(polish, /\.day-card \.place-row,[\s\S]+grid-template-areas:\s*\n\s*"media title"\s*\n\s*"actions actions"/);
  assert.match(polish, /\.day-card \.place-row\.has-comment\.has-routes,[\s\S]+grid-template-areas:\s*\n\s*"media title"\s*\n\s*"comment comment"\s*\n\s*"routes routes"\s*\n\s*"actions actions"/);
  assert.match(polish, /\.place-overview,[\s\S]+\.place-card-copy[\s\S]+display:\s*contents/);
  assert.match(polish, /\.meal-group \.food-row,[\s\S]+grid-template-areas:\s*\n\s*"main"\s*\n\s*"footer"[\s\S]+row-gap:\s*15px/);
  assert.match(polish, /\.day-card \.meal-group \.meal-card-heading\s*\{[^}]+grid-template-columns:\s*60px minmax\(0,1fr\)/);
  assert.match(polish, /\.day-card \.meal-group \.meal-card-main\s*\{[^}]+gap:\s*12px[^}]+padding:\s*14px 15px/);
  assert.match(polish, /\.day-card \.meal-group \.food-card-copy,[\s\S]+width:\s*100%[^}]+justify-content:\s*flex-start[^}]+text-align:\s*left/);
  assert.match(polish, /\.day-card \.meal-group \.food-card-copy\s*\{[^}]+gap:\s*var\(--title-priority-gap\)/);
  assert.match(collapsedMenu, /\.meal-card-main\s*\{[^}]+min-height:\s*72px[^}]+gap:\s*8px[^}]+padding:\s*7px 9px[^}]+border-radius:\s*13px/);
  assert.match(collapsedMenu, /\.day-card \.meal-group \.meal-card-heading\s*\{[^}]+grid-template-columns:\s*56px minmax\(0,1fr\)/);
  assert.match(collapsedMenu, /\.day-card \.meal-group \.meal-card-heading \.place-media\s*\{[^}]+width:\s*56px[^}]+height:\s*56px[^}]+border-radius:\s*15px/);
  assert.match(collapsedMenu, /\.meal-card-main \.place-copy\s*\{[^}]+min-height:\s*0[^}]+grid-area:\s*auto/);
  assert.match(polish, /\.meal-group \.food-card-copy\s*\{[^}]+grid-area:\s*auto/);
  assert.match(polish, /\.meal-card-footer\s*\{[^}]+grid-area:\s*footer[^}]+justify-content:\s*flex-start/);
  const agendaPlaceCards = polish.slice(polish.indexOf("Agenda places use the same layered card language"));
  assert.match(agendaPlaceCards, /\.day-card \.place-list\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*760px\)[\s\S]+\.day-card \.place-list\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*600px\)[\s\S]+\.agenda-place-heading\s*\{[^}]+grid-template-columns:\s*68px minmax\(0,1fr\)/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*600px\)[\s\S]+\.agenda-place-heading > \.place-media\s*\{[^}]+width:\s*68px[^}]+height:\s*68px/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*600px\)[\s\S]+\.agenda-place-heading-copy\s*\{[^}]+justify-content:\s*center[^}]+gap:\s*var\(--title-priority-gap\)[\s\S]+\.agenda-place-heading \.place-copy\s*\{[^}]+min-height:\s*0[^}]+height:\s*auto/);
  assert.match(agendaPlaceCards, /@media \(max-width:\s*600px\)[\s\S]+\.agenda-place-footer > \.place-route-toggle\s*\{[^}]+margin-left:\s*auto/);
  assert.match(main, /function initializeMobileActionsMenu\(\)[\s\S]+aria-expanded/);
});

test("text-bearing pills and cards reflow before their copy can overflow", async () => {
  const [polish, finalContainment, styleIndex] = await Promise.all([
    readFile(new URL("../../src/client/styles/polish.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/client/styles/containment.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/client/styles/index.css", import.meta.url), "utf8"),
  ]);
  const containment = polish.slice(polish.indexOf("Page-wide responsive containment"));
  assert.match(containment, /:where\([\s\S]+\.hero \.stat-copy,[\s\S]+\.property-pills > span,[\s\S]+\.transport-card \.detail-strip,[\s\S]+\.place-route-mode,[\s\S]+\.amenity-group h4[\s\S]+max-width:\s*100%/);
  assert.match(containment, /\.brand-wordmark,[\s\S]+\.hero \.stat strong,[\s\S]+\.property-pills > span,[\s\S]+\.place-route-mode strong,[\s\S]+\.day-heading-title\s*\{[^}]+overflow-wrap:\s*anywhere[^}]+white-space:\s*normal/);
  assert.match(containment, /\.hero \.location-line,[\s\S]+\.section-pill > span,[\s\S]+\.priority-control,[\s\S]+\.nested-toolbar\s*\{\s*flex-wrap:\s*wrap/);
  assert.match(containment, /@container \(max-width:\s*1050px\)\s*\{\s*\.property-pills\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  const finalTracks = polish.slice(polish.indexOf("Final responsive track decisions"));
  assert.match(finalTracks, /@media \(min-width:\s*601px\) and \(max-width:\s*820px\)[\s\S]+\.hero-stats\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(finalTracks, /@media \(min-width:\s*601px\) and \(max-width:\s*700px\)[\s\S]+\.transport-card \.route-timeline\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+gap:\s*24px/);
  assert.ok(styleIndex.indexOf('@import url("./containment.css")') > styleIndex.indexOf('@import url("./edit-text-mode.css")'));
  assert.match(finalContainment, /html,\s*body\s*\{[^}]+min-width:\s*0[^}]+overflow-x:\s*clip/);
  assert.match(finalContainment, /\.amenity-group li > span:last-child,\s*\.meal-route-value\s*\{[^}]+overflow:\s*visible[^}]+text-overflow:\s*clip/);
  assert.doesNotMatch(finalContainment, /itinerary-date-menu|itinerary-date-option/);
  assert.match(finalContainment, /@container \(max-width:\s*520px\)[\s\S]+\.stay-dates,[\s\S]+\.distance-list\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
});

test("mobile transport cards align the mode and duration between route endpoints", async () => {
  const polish = await readFile(new URL("../../src/client/styles/polish.css", import.meta.url), "utf8");
  const mobileTransport = polish.slice(polish.indexOf("A more spacious, legible transport composition"));
  assert.match(mobileTransport, /@media \(max-width:\s*600px\)[\s\S]+\.transport-card\s*\{\s*padding:\s*24px 20px 22px/);
  assert.match(mobileTransport, /\.transport-card \.detail-strip\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\) auto[^}]+gap:\s*18px/);
  assert.match(mobileTransport, /\.transport-card \.transport-seats\s*\{[^}]+justify-self:\s*end[^}]+text-align:\s*right/);
  assert.match(mobileTransport, /Mobile cards finish with their actions followed by the notes row[\s\S]+\.transport-card\s*\{[^}]+grid-template-columns:\s*minmax\(0,1fr\)[^}]+grid-template-areas:\s*\n\s*"provider"\s*\n\s*"origin"\s*\n\s*"duration"\s*\n\s*"destination"\s*\n\s*"details"\s*\n\s*"actions"\s*\n\s*"notes"/);
  assert.match(mobileTransport, /\.transport-card \.block-topline\s*\{\s*display:\s*contents/);
  assert.match(mobileTransport, /\.transport-card \.route-grid,\s*\.transport-card \.route-timeline\s*\{\s*display:\s*contents/);
  assert.match(mobileTransport, /\.transport-card \.route-origin-endpoint\s*\{[^}]+grid-area:\s*origin[^}]+margin-top:\s*38px/);
  assert.match(mobileTransport, /\.transport-card \.route-destination-endpoint\s*\{[^}]+grid-area:\s*destination[^}]+margin-top:\s*0[^}]+margin-bottom:\s*36px/);
  assert.match(mobileTransport, /\.transport-card \.route-line\s*\{[^}]+display:\s*grid[^}]+width:\s*100%[^}]+min-width:\s*0[^}]+min-height:\s*0[^}]+grid-template-columns:\s*68px minmax\(0,1fr\)[^}]+grid-area:\s*duration[^}]+gap:\s*16px[^}]+justify-self:\s*stretch[^}]+margin:\s*24px 0[^}]+padding:\s*0[^}]+background:\s*transparent[^}]+box-shadow:\s*none/);
  assert.match(mobileTransport, /\.transport-card \.route-line > span\s*\{\s*display:\s*none !important/);
  assert.match(mobileTransport, /\.transport-card \.route-line \.route-mode\s*\{\s*display:\s*contents/);
  assert.match(mobileTransport, /\.transport-card \.route-line \.route-mode > i\s*\{[^}]+display:\s*grid[^}]+grid-column:\s*1[^}]+justify-self:\s*center/);
  assert.match(mobileTransport, /\.transport-card \.route-line \.route-duration\s*\{[^}]+display:\s*block[^}]+min-width:\s*max-content[^}]+grid-column:\s*2[^}]+justify-self:\s*start[^}]+position:\s*static[^}]+inset:\s*auto[^}]+transform:\s*none[^}]+font-size:\s*var\(--text-minimum\)[^}]+text-align:\s*left[^}]+white-space:\s*nowrap/);
  assert.match(mobileTransport, /\.transport-card \.block-topline > \.entry-links\s*\{[^}]+grid-area:\s*actions[^}]+justify-self:\s*start[^}]+justify-content:\s*flex-start[^}]+margin-top:\s*18px/);
  assert.match(mobileTransport, /\.transport-card \.transport-note\s*\{\s*grid-area:\s*notes/);
  assert.match(mobileTransport, /\.block-type-stay-summary \.stay-copy\s*\{[^}]+grid-template-areas:\s*\n\s*"title"\s*\n\s*"property"\s*\n\s*"dates"\s*\n\s*"actions"/);
  assert.match(mobileTransport, /\.block-type-stay-summary \.stay-title-row\s*\{\s*display:\s*contents/);
  assert.match(mobileTransport, /\.block-type-stay-summary \.stay-title-row \.entry-links\s*\{[^}]+grid-area:\s*actions[^}]+justify-self:\s*start[^}]+justify-content:\s*flex-start[^}]+margin-top:\s*20px/);
});
