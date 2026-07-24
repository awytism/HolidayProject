import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mutateAgendaBlock } from "../../src/client/editor/inline-agenda-editor.js";
import { agendaConfig, placesConfig } from "../../src/client/sections/agenda.js";
import { renderIcon } from "../../src/client/ui/icon-registry.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("modern Agenda cards expose removable places and meals with full-width, dark-mode empty states", async () => {
  const document = createDefaultDocument();
  const day = document.sections.agenda.find((block) => block.type === "day" && block.data.places.length && Object.values(block.data.meals).some((options) => options.length));
  const meal = Object.entries(day.data.meals).find(([, options]) => options.length);
  const placeCount = day.data.places.length;
  const mealCount = meal[1].length;

  assert.equal(mutateAgendaBlock(document, day.id, action("remove-place", { placeId: day.data.places[0].id })), true);
  assert.equal(day.data.places.length, placeCount - 1);
  assert.equal(mutateAgendaBlock(document, day.id, action("remove-food", { meal: meal[0], foodId: meal[1][0].id })), true);
  assert.equal(day.data.meals[meal[0]].length, mealCount - 1);

  day.data.places = [];
  day.data.meals = { breakfast: [], lunch: [], dinner: [] };
  const empty = agendaConfig.render(day, false);
  assert.match(empty, /class="day-note place-empty-banner">No places planned\.<\/p>/);
  assert.match(empty, /class="day-note meal-empty-banner">No meals planned\.<\/p>/);
  assert.match(empty, /data-inline-agenda-action="add-place"/);
  assert.equal((empty.match(/data-inline-agenda-action="add-food"/g) ?? []).length, 3);
  const [polish, themes] = await Promise.all([
    readFile("src/client/styles/polish.css", "utf8"),
    readFile("src/client/styles/palette-themes.css", "utf8"),
  ]);
  assert.match(polish, /\.day-card \.place-list > \.place-empty-banner\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(polish, /\.day-card \.place-list > \.place-empty-banner,[\s\S]+\.meal-grid > \.meal-empty-banner\s*\{[^}]+width:\s*100%[^}]+align-self:\s*stretch[^}]+justify-self:\s*stretch/);
  assert.match(polish, /\[data-theme="dark"\] \.day-card \.place-list > \.place-empty-banner,[\s\S]+\[data-theme="dark"\] \.meal-grid > \.meal-empty-banner\s*\{[^}]+background:[^}]+color:\s*var\(--text\)/);
  assert.match(themes, /:root \.day-card \.place-list > \.place-empty-banner,[\s\S]+:root \.day-card \.meal-grid > \.meal-empty-banner,[\s\S]+:root \.saved-place-group \.saved-grid > \.saved-place-empty\s*\{[^}]+width:\s*100%[^}]+grid-column:\s*1 \/ -1 !important[^}]+overflow:\s*visible[^}]+background:\s*var\(--card-wash-gradient\)[^}]+color:\s*var\(--text\)[^}]+font-size:\s*var\(--text-small\)[^}]+line-height:\s*1\.5[^}]+text-align:\s*left/);
  assert.doesNotMatch(polish, /\.saved-place-empty\s*\{[^}]+rgba\(255,252,240/);
  assert.match(themes, /body\.is-inline-editing \.day-card \.place-list > \.place-empty-banner,[\s\S]+body\.is-inline-editing \.day-card \.meal-grid > \.meal-empty-banner\s*\{[^}]+width:\s*100%[^}]+grid-column:\s*1 \/ -1 !important/);

  assert.equal(mutateAgendaBlock(document, day.id, action("add-place")), true);
  assert.equal(mutateAgendaBlock(document, day.id, action("add-food", { meal: "lunch" })), true);
  assert.equal(day.data.places.length, 1);
  assert.equal(day.data.meals.lunch.length, 1);
  assert.equal(validateDocument(document), true);
});

test("Day Plan Place(s) and Meal(s) labels are independently removable", () => {
  const document = createDefaultDocument();
  const day = document.sections.agenda.find((block) => block.type === "day");
  let view = agendaConfig.render(day, false);

  assert.match(view, /data-agenda-group-label="places">[\s\S]*?>Place\(s\)<\/p>[\s\S]*?data-inline-agenda-action="remove-places-label"/);
  assert.match(view, /data-agenda-group-label="meals">[\s\S]*?>Meal\(s\)<\/p>[\s\S]*?data-inline-agenda-action="remove-meals-label"/);
  assert.equal(mutateAgendaBlock(document, day.id, action("remove-places-label")), true);
  assert.equal(mutateAgendaBlock(document, day.id, action("remove-meals-label")), true);
  assert.equal(day.data.placesLabelVisible, false);
  assert.equal(day.data.mealsLabelVisible, false);

  view = agendaConfig.render(day, false);
  assert.doesNotMatch(view, /<p class="block-label">(?:Place|Meal)\(s\)<\/p>/);
  assert.match(view, /data-inline-agenda-action="restore-places-label"/);
  assert.match(view, /data-inline-agenda-action="restore-meals-label"/);
  assert.equal(mutateAgendaBlock(document, day.id, action("restore-places-label")), true);
  assert.equal(mutateAgendaBlock(document, day.id, action("restore-meals-label")), true);
  assert.equal(validateDocument(document), true);

  day.data.placesLabelVisible = "yes";
  assert.throws(() => validateDocument(document), /Invalid day placesLabelVisible/);
});

test("Places of Interest uses one removable title and one flat place list", () => {
  const document = createDefaultDocument();
  const saved = document.sections.places.find((block) => block.type === "saved-places");
  let view = placesConfig.render(saved, false);

  assert.match(view, /class="feature-title-icon saved-places-title-icon" aria-hidden="true"/);
  assert.match(view, new RegExp(`data-inline-icon-key="saved-places-title:${saved.id}"[^>]+data-inline-icon-name="compass-needle"`));
  assert.doesNotMatch(view, /saved-places-title-icon"[^>]+data-inline-ignore/);
  assert.ok(view.indexOf(renderIcon("compass-needle")) < view.indexOf("Places of Interest"));
  assert.doesNotMatch(renderIcon("compass-needle"), /<circle|<rect/u);
  assert.match(view, /<span class="saved-places-title-copy">Places of Interest<\/span>/);
  assert.match(view, /data-inline-agenda-action="remove-title"/);
  assert.match(view, /class="inline-entry-remove saved-title-remove"/);
  assert.match(view, /saved-place-group saved-place-group-all/);
  assert.match(view, /class="place-title-icon"/);
  assert.match(view, /data-inline-icon-key="place-title:places:/);
  assert.doesNotMatch(view, /saved-place-group-(?:restaurant|landmark)|<h4>Restaurants<\/h4>|<h4>Landmarks<\/h4>|data-place-category/);
  assert.equal((view.match(/<span>Add place<\/span>/g) ?? []).length, 1);
  assert.equal((view.match(/data-inline-agenda-action="remove-place"/g) ?? []).length, saved.data.places.length);

  assert.equal(mutateAgendaBlock(document, saved.id, action("remove-title"), "places"), true);
  view = placesConfig.render(saved, false);
  assert.match(view, /saved-places-header feature-card-header is-title-hidden/);
  assert.match(view, /data-inline-agenda-action="restore-title"/);
  assert.match(view, /class="inline-entry-add saved-title-restore"/);
  assert.equal(mutateAgendaBlock(document, saved.id, action("restore-title"), "places"), true);

  saved.data.places = [];
  view = placesConfig.render(saved, false);
  assert.equal((view.match(/No places planned\./g) ?? []).length, 1);
  assert.equal((view.match(/<span>Add place<\/span>/g) ?? []).length, 1);
  assert.doesNotMatch(view, /data-place-category/);

  assert.equal(mutateAgendaBlock(document, saved.id, action("add-place"), "places"), true);
  assert.equal(saved.data.places.length, 1);
  assert.equal(validateDocument(document), true);
});

test("Agenda places expose independently selectable title icons", () => {
  const document = createDefaultDocument();
  const day = document.sections.agenda.find((block) => block.type === "day" && block.data.places.length);
  const view = agendaConfig.render(day, false);

  assert.match(view, /class="place-title-icon"/);
  assert.match(view, /class="place-title-icon-glyph"/);
  assert.match(view, /data-inline-icon-key="place-title:agenda:/);
  assert.match(view, /data-inline-icon-name="home"/);
});

function action(inlineAgendaAction, options = {}) {
  return {
    dataset: {
      inlineAgendaAction,
      meal: options.meal,

    },
    closest(selector) {
      if (selector === "[data-place-id]" && options.placeId) return { dataset: { placeId: options.placeId } };
      if (selector === "[data-food-id]" && options.foodId) return { dataset: { foodId: options.foodId } };
      if (selector === "[data-meal]" && options.meal) return { dataset: { meal: options.meal } };
      return null;
    },
  };
}
