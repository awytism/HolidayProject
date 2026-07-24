import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { stayConfig } from "../../src/client/sections/stay.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { allowsDateFormatSelection } from "../../src/client/editor/inline-date-time-editor.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { formatTravelDateRangeForLocale } from "../../src/shared/date-utils.mjs";

test("uses calendar inputs for every structured trip date and derives view labels", async () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport.find((block) => block.type === "flight");
  const stay = document.sections.stay.find((block) => block.type === "stay-summary");
  const agenda = document.sections.agenda.find((block) => block.type === "day");
  const agendaWithMeals = document.sections.agenda.find((block) => (
    block.type === "day" && ["breakfast", "lunch", "dinner"].every((meal) => block.data.meals[meal].length)
  ));
  const agendaWithOpenMeal = document.sections.agenda.find((block) => (
    block.type === "day"
    && ["breakfast", "lunch", "dinner"].some((meal) => block.data.meals[meal].length)
    && ["breakfast", "lunch", "dinner"].some((meal) => !block.data.meals[meal].length)
  ));
  const shell = await readFile("public/index.html", "utf8");
  const agendaSource = await readFile("src/client/sections/agenda.js", "utf8");

  assert.equal(countMatches(shell, /data-meta-date=/g), 2);
  assert.match(transportConfig.render(transport, true), /type="date" value="2026-10-24"/);
  assert.match(transportConfig.render(transport, false), /data-inline-date-field="date"[^>]*>24\/10\/2026/);
  assert.equal(countMatches(stayConfig.render(stay, true), /type="date"/g), 2);
  assert.match(stayConfig.render(stay, false), /data-inline-date-field="checkin"[^>]*>24\/10\/2026/);
  assert.match(stayConfig.render(stay, false), /data-inline-date-field="checkout"[^>]*>01\/11\/2026/);

  const agendaEditor = agendaConfig.render(agenda, true);
  const agendaMealsEditor = agendaConfig.render(agendaWithMeals, true);
  const agendaView = agendaConfig.render(agenda, false);
  const agendaMealsView = agendaConfig.render(agendaWithMeals, false);
  const agendaOpenMealView = agendaConfig.render(agendaWithOpenMeal, false);
  assert.equal(countMatches(agendaEditor, /type="date"/g), 1);
  assert.match(agendaEditor, /value="2026-10-24"[^>]+data-block-field="date"/);
  assert.match(agendaEditor, /value="Arrival"[^>]+data-block-field="title"/);
  assert.doesNotMatch(agendaEditor, />Month</);
  assert.doesNotMatch(agendaEditor, />Weekday</);
  assert.match(agendaView, /<h3 class="day-heading"><span class="day-heading-calendar" role="img" aria-label="Saturday, Oct 24" data-inline-date-action="block" data-inline-date-field="date" data-inline-date-label="Agenda Date"><span class="day-heading-month">Oct<\/span><strong class="day-heading-number">24<\/strong><\/span><span class="day-heading-copy"><span class="day-heading-weekday" data-inline-static>Saturday<\/span><span class="day-heading-separator" aria-hidden="true">•<\/span><span class="day-heading-title">Arrival<\/span><\/span><\/h3>/);
  assert.match(agendaSource, /MEAL_ICON_CLASSES = Object\.freeze\(\{[\s\S]+breakfast: "meal-heading-icon-breakfast"[\s\S]+lunch: "meal-heading-icon-lunch"[\s\S]+dinner: "meal-heading-icon-dinner"/);
  assert.match(agendaSource, /MEAL_ICON_KEYS = Object\.freeze\(\{[\s\S]+breakfast: "coffee"[\s\S]+lunch: "utensils"[\s\S]+dinner: "soda"/);
  for (const meal of ["breakfast", "lunch", "dinner"]) {
    assert.match(agendaMealsView, new RegExp(`meal-heading-icon meal-heading-icon-${meal}`));
    assert.match(agendaEditor, new RegExp(`meal-heading-icon meal-heading-icon-${meal}`));
    assert.match(agendaMealsView, new RegExp(`meal-heading-label meal-heading-label-${meal}`));
    assert.match(agendaEditor, new RegExp(`meal-heading-label meal-heading-label-${meal}`));
  }
  assert.equal(countMatches(agendaMealsView, /class="meal-heading-glyph"/g), 3);
  assert.equal(countMatches(agendaEditor, /class="meal-heading-glyph"/g), 3);
  for (const icon of ["coffee", "utensils", "soda"]) {
    assert.match(agendaMealsView, new RegExp(`class="meal-heading-glyph" data-icon="${icon}"><svg`));
    assert.match(agendaEditor, new RegExp(`class="meal-heading-glyph" data-icon="${icon}"><svg`));
  }
  assert.match(agendaView, /class="day-heading-separator" aria-hidden="true">•<\/span>/);
  assert.doesNotMatch(agendaView, /<span class="sr-only">•<\/span>/);
  assert.doesNotMatch(agendaView, /day-heading-date|day-date-month|day-date-number/);
  agenda.data.date = "2026-10-25";
  const changedAgendaView = agendaConfig.render(agenda, false);
  assert.match(changedAgendaView, /aria-label="Sunday, Oct 25"/);
  assert.match(changedAgendaView, /day-heading-month">Oct<\/span><strong class="day-heading-number">25/);
  assert.match(changedAgendaView, /day-heading-weekday" data-inline-static>Sunday<\/span>/);

  agenda.data.meals = { breakfast: [], lunch: [], dinner: [] };
  const emptyMealsView = agendaConfig.render(agenda, false);
  assert.equal(countMatches(emptyMealsView, /No meals planned\./g), 1);
  assert.match(emptyMealsView, /<div class="meal-grid"><p class="day-note meal-empty-banner">No meals planned\.<\/p><div class="inline-entry-add-group">/);
  assert.doesNotMatch(emptyMealsView, /class="meal-group"/);
  assert.doesNotMatch(emptyMealsView, /food-row-open|>Em aberto</);
  assert.equal(countMatches(agendaOpenMealView, /class="meal-group"/g), 3);
  assert.equal(countMatches(agendaOpenMealView, /class="food-row food-row-open"/g), 1);
  assert.match(agendaOpenMealView, /<span class="open">Em aberto<\/span>/);
  assert.doesNotMatch(agendaOpenMealView, /meal-empty-banner|No meals planned/);
  const agendaMealsMarkup = mealMarkup(agendaMealsView);
  const plannedOptionCount = mealWithRouteCount(agendaWithMeals);
  assert.equal(countMatches(agendaMealsMarkup, /class="meal-card-footer has-route"/g), plannedOptionCount);
  assert.equal(countMatches(agendaMealsMarkup, /data-meal-route-toggle data-mode="driving"/g), routeReadyMealCount(agendaWithMeals));
  assert.equal(countMatches(agendaMealsMarkup, /data-meal-route-option/g), routeModeCount(agendaWithMeals));
  assert.match(agendaMealsMarkup, /data-route-mode="driving"[^>]*><span class="meal-route-glyph"/);
  assert.match(agendaMealsMarkup, /data-route-mode="cycling"[^>]* hidden>/);
  assert.match(agendaMealsMarkup, /data-route-mode="walking"[^>]* hidden>/);
  for (const field of [
    "drivingDistance", "drivingTime", "cyclingDistance",
    "cyclingTime", "walkingDistance", "walkingTime",
  ]) {
    assert.match(agendaMealsEditor, new RegExp(`data-food-field="${field}"`));
  }
  assert.match(agendaMealsEditor, /<legend>Distance from Main Accommodation<\/legend>/);
  assert.doesNotMatch(agendaMealsView, /meal-route-cycle/);
  const openViewPlannedCount = routeReadyMealCount(agendaWithOpenMeal);
  assert.equal(countMatches(mealMarkup(agendaOpenMealView), /data-meal-route-toggle/g), openViewPlannedCount);
});

test("meal travel-time pills skip blank and zero modes and hide when none are available", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day" && entry.data.meals.lunch.length);
  const option = block.data.meals.lunch[0];
  block.data.meals = { breakfast: [], lunch: [option], dinner: [] };
  option.drivingTime = "0 m";
  option.cyclingTime = "12 m";
  option.walkingTime = "18 m";
  let meals = mealMarkup(agendaConfig.render(block, false));

  assert.match(meals, /data-meal-route-toggle data-mode="cycling"/);
  assert.doesNotMatch(meals, /data-route-mode="driving"/);
  assert.match(meals, /data-route-mode="cycling"[^>]*>[\s\S]*?12 m/);
  assert.match(meals, /data-route-mode="walking"[^>]* hidden>[\s\S]*?18 m/);
  assert.doesNotMatch(meals, /meal-route-cycle| km/);

  option.cyclingTime = "0";
  meals = mealMarkup(agendaConfig.render(block, false));
  assert.match(meals, /class="meal-route-toggle is-static" data-mode="walking"/);
  assert.doesNotMatch(meals, /data-meal-route-toggle/);

  option.walkingTime = "00:00";
  meals = mealMarkup(agendaConfig.render(block, false));
  assert.doesNotMatch(meals, /meal-route-toggle|has-route/);

  option.drivingTime = "1 h 0 m";
  meals = mealMarkup(agendaConfig.render(block, false));
  assert.match(meals, /class="meal-route-toggle is-static" data-mode="driving"/);
  assert.match(meals, />1 h 0 m</);
});

test("in-place editing opens calendar and clock pickers with shared format choices", async () => {
  const [controller, main, styles] = await Promise.all([
    readFile("src/client/editor/inline-date-time-editor.js", "utf8"),
    readFile("src/client/main.js", "utf8"),
    readFile("src/client/styles/inline-edit.css", "utf8"),
  ]);
  assert.match(controller, /input type="date" name="startDate"/);
  assert.match(controller, /input type="date" name="endDate"/);
  assert.match(controller, /input type="date" name="date"/);
  assert.match(controller, /input type="time" name="time"/);
  assert.match(controller, /input type="date" name="journeyDate"/);
  assert.match(controller, /input type="search" name="timeZoneLocation"/);
  assert.match(controller, /input type="hidden" name="timeZone"/);
  assert.match(controller, /datalist id="inline-time-zone-locations"/);
  assert.doesNotMatch(controller, /select name="timeZone"/);
  assert.match(controller, /resolveTimeZoneLocation\(timeZoneLocation/);
  assert.match(controller, /descriptor\.section === "transport"/);
  assert.match(controller, /block\.data\.duration = deriveTransportDuration\(block\.data\)/);
  assert.match(controller, /unconfirmed \? "TBD"/);
  assert.match(controller, /label\("To be determined"\)/);
  assert.match(controller, /Day first — 24\/10\/2026/);
  assert.match(controller, /12-hour \(AM\/PM\) — 6:30 PM/);
  assert.equal(allowsDateFormatSelection({ kind: "block", section: "agenda" }), false);
  assert.equal(allowsDateFormatSelection({ kind: "block", section: "transport" }), true);
  assert.equal(allowsDateFormatSelection({ kind: "hero" }), true);
  assert.match(controller, /if \(dateFormat !== null\) preferences\.setDateFormat\(dateFormat\)/);
  assert.match(controller, /showPicker/);
  assert.match(main, /createInlineDateTimeEditor\(\{/);
  assert.match(main, /inlineDateTimeEditor\.apply\(\)/);
  assert.match(styles, /\.inline-date-time-dialog/);
  assert.match(styles, /\.inline-date-range/);
  assert.match(controller, /class="inline-time-settings-card"/);
  assert.match(controller, /label\("Time Settings"\)/);
  assert.match(controller, /class="inline-time-settings-grid"/);
  assert.match(controller, /class="inline-transport-time-card"/);
  assert.match(controller, /label\("Journey Details"\)/);
  assert.match(styles, /\.inline-transport-time-fields/);
  assert.match(styles, /\.inline-time-zone-field/);
  assert.match(styles, /\.inline-date-time-dialog\s*\{[^}]+width:\s*min\(640px,calc\(100% - 28px\)\)/);
  assert.match(styles, /\.inline-time-settings-grid,\s*\.inline-transport-time-fields\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)[^}]+align-items:\s*start/);
  assert.match(styles, /\.inline-transport-time-fields > label > :is\(input\[type="date"\],input\[type="search"\]\)\s*\{[^}]+height:\s*44px[^}]+min-height:\s*44px/);
});

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function routeReadyMealCount(block) {
  return Object.values(block.data.meals).flat().filter((option) => (
    [option.drivingTime, option.cyclingTime, option.walkingTime].filter(hasPositiveRouteTime).length > 1
  )).length;
}

function mealWithRouteCount(block) {
  return Object.values(block.data.meals).flat().filter((option) => (
    [option.drivingTime, option.cyclingTime, option.walkingTime].some(hasPositiveRouteTime)
  )).length;
}

function routeModeCount(block) {
  return Object.values(block.data.meals).flat().reduce((count, option) => (
    count + [option.drivingTime, option.cyclingTime, option.walkingTime].filter(hasPositiveRouteTime).length
  ), 0);
}

function hasPositiveRouteTime(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers) return true;
  return numbers.some((number) => Number(number.replace(",", ".")) > 0);
}

function mealMarkup(view) {
  return view.split('<div class="meal-grid">')[1].split('<p class="day-note">')[0];
}

test("calendar controls inherit theme color-scheme and palette tokens", async () => {
  const [tokens, layout, editor, editMode] = await Promise.all([
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
    readFile("src/client/styles/edit-text-mode.css", "utf8"),
  ]);
  assert.match(tokens, /\[data-theme="dark"\][^{]+\{[^}]+color-scheme:\s*dark/);
  assert.match(layout, /\.hero-date-editor input[^}]+var\(--surface-soft\)[^}]+var\(--text\)/);
  assert.match(editor, /input\[type="date"\][^}]+accent-color:\s*var\(--primary\)/);
  assert.match(editMode, /body\.is-editing \.hero-date-editor\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)[^}]+gap:\s*7px[^}]+overflow:\s*visible/);
  assert.match(editMode, /body\.is-editing \.hero \.stat\s*\{[^}]+border-radius:\s*12px[^}]+background:\s*var\(--editor-panel\)/);
  assert.match(editMode, /body\.is-editing \.hero-stats\s*\{[^}]+grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)[^}]+gap:\s*8px/);
  assert.match(editMode, /body\.is-editing \.priority-picker summary\s*\{[^}]+min-height:\s*36px[^}]+border-radius:\s*10px/);
  assert.match(editMode, /body\.is-editing \.priority-options\s*\{[^}]+display:\s*grid[^}]+margin-top:\s*5px/);
  assert.match(editMode, /body\.is-editing \.place-route-editor-mode\s*\{[^}]+padding:\s*4px 0[^}]+background:\s*transparent/);
  assert.match(editMode, /body\.is-editing \.place-route-editor\s*\{[^}]+grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)[^}]+gap:\s*8px/);
  assert.match(editMode, /body\.is-editing \.editor-card-heading\s*\{[^}]+padding:\s*12px 14px 0/);
  assert.match(editMode, /body\.is-editing \.block-frame > \.edit-form\s*\{[^}]+gap:\s*8px[^}]+padding:\s*10px 14px 14px/);
  assert.match(editMode, /body\.is-editing \.edit-form\s*\{[^}]+grid-auto-rows:\s*max-content[^}]+align-content:\s*start[^}]+align-items:\s*start/);
  assert.match(editMode, /body\.is-editing \.edit-form label\s*\{[^}]+grid-template-rows:\s*auto auto[^}]+align-self:\s*start[^}]+gap:\s*5px/);
  assert.doesNotMatch(editMode, /grid-template-rows:\s*minmax\(2\.6em,auto\) auto/);
  assert.doesNotMatch(editMode, /body\.is-editing \.editor-block \.transport-cover-editor,/);
});

test("hero duration and transport legs remain calculated and non-editable", async () => {
  const [main, html] = await Promise.all([
    readFile("src/client/main.js", "utf8"),
    readFile("public/index.html", "utf8"),
  ]);
  assert.match(main, /const stats = displayTripStats\(tripDocument\)/);
  assert.match(main, /return deriveTripStats\(tripDocument\)/);
  assert.match(main, /elements\.tripDays\.textContent = formatHeroCount\(stats\.days, "day", "days"\)/);
  assert.match(main, /elements\.tripLegs\.textContent = formatHeroCount\(stats\.legs, "leg", "legs"\)/);
  assert.match(main, /synchronizeTripStats\(tripDocument\)/);
  assert.match(main, /for \(const element of \[elements\.tripDays, elements\.tripLegs\]\)/);
  assert.match(html, /<small data-inline-static>Date<\/small>/);
  assert.match(html, /<small data-inline-static>Duration<\/small><strong id="tripDays" data-inline-static>0 days<\/strong>/);
  assert.match(html, /<small data-inline-static>Transport<\/small><strong id="tripLegs" data-inline-static>0 legs<\/strong>/);
  assert.doesNotMatch(html, /<strong><span id="trip(?:Days|Legs)">/);
  assert.match(main, /renderMeta\(tripDocument, false\)/);
  assert.doesNotMatch(main, /updateMetaDate|document\.meta\.days = String\(days\)/);
});

test("formats hero date ranges for either language without changing global locale", () => {
  assert.equal(formatTravelDateRangeForLocale("2026-10-24", "2026-11-01", "en-GB"), "24th of Oct to 1st of Nov, 2026");
  assert.equal(formatTravelDateRangeForLocale("2026-10-24", "2026-11-01", "pt-BR"), "24 de out. a 1º de nov. de 2026");
});
