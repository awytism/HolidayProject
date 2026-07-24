import assert from "node:assert/strict";
import test from "node:test";
import { markLegacyMigrationComplete, migrateLegacyState, prepareLoadedState } from "../../src/client/domain/migrations.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { formatAgendaDate, formatDateRange, formatFullDate } from "../../src/shared/date-utils.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("normalizes a persisted v3 server document before loading every trip section", () => {
  const source = legacyServerDocument();

  assert.throws(() => validateDocument(source), /Unsupported document schema/);

  const result = prepareLoadedState({ revision: 24, document: source }, memoryStorage({}));
  const staySummary = result.document.sections.stay.find((block) => block.type === "stay-summary");
  const agendaDays = result.document.sections.agenda.filter((block) => block.type === "day");

  assert.equal(result.migrated, true);
  assert.equal(result.serverMigrated, true);
  assert.equal(result.legacyMigrated, false);
  assert.equal(result.document.schemaVersion, 15);
  assert.deepEqual([result.document.meta.startDate, result.document.meta.endDate], ["2026-10-24", "2026-11-01"]);
  assert.equal(result.document.sections.transport.find((block) => block.type === "flight").data.date, "2026-10-24");
  assert.deepEqual([staySummary.data.checkin, staySummary.data.checkout], ["2026-10-24", "2026-11-01"]);
  assert.deepEqual(agendaDays.slice(0, 2).map((block) => block.data.date), ["2026-10-24", "2026-10-25"]);
  assert.equal(validateDocument(result.document), true);
});

test("migrates legacy trip and agenda data only on the initial revision", () => {
  const storage = memoryStorage({
    "gramado-trip-data-v1": JSON.stringify({ destinationCity: "New Gramado", stayAddress: "Rua Teste" }),
    "gramado-week-plan-v1": JSON.stringify({
      days: [{ month: "Oct", date: "24", weekday: "Saturday", title: "Changed", events: [], meals: {}, notes: "Hello" }],
      otherPlaces: [{ name: "Cafe", link: "", image: "", comment: "" }],
    }),
  });
  const result = migrateLegacyState({ revision: 1, document: createDefaultDocument() }, storage);
  assert.equal(result.migrated, true);
  assert.equal(result.document.meta.destination, "New Gramado");
  assert.equal(result.document.sections.stay.find((block) => block.type === "essentials").data.items[0].value, "Rua Teste");
  assert.equal(result.document.sections.agenda[0].data.title, "Changed");
  assert.deepEqual(mealNames(result.document.sections.agenda[0].data.meals), { breakfast: [], lunch: [], dinner: [] });
  assert.equal(validateDocument(result.document), true);

  const skipped = migrateLegacyState({ revision: 2, document: createDefaultDocument() }, storage);
  assert.equal(skipped.migrated, false);
});

test("normalizes partial and malformed legacy meals while preserving strings", () => {
  const storage = memoryStorage({
    "gramado-week-plan-v1": JSON.stringify({
      days: [
        { meals: { breakfast: "Cafe colonial", lunch: "Fondue", dinner: "Soup" } },
        { meals: { breakfast: "Pastry", lunch: 42 } },
        { meals: null },
      ],
    }),
  });

  const result = migrateLegacyState({ revision: 1, document: createDefaultDocument() }, storage);

  assert.deepEqual(mealNames(result.document.sections.agenda[0].data.meals), {
    breakfast: ["Cafe colonial"],
    lunch: ["Fondue"],
    dinner: ["Soup"],
  });
  assert.deepEqual(mealNames(result.document.sections.agenda[1].data.meals), {
    breakfast: ["Pastry"],
    lunch: [],
    dinner: [],
  });
  assert.deepEqual(mealNames(result.document.sections.agenda[2].data.meals), { breakfast: [], lunch: [], dinner: [] });
  assert.equal(validateDocument(result.document), true);
});

test("treats unavailable storage as an optional migration source and sink", () => {
  const storage = {
    getItem() { throw new Error("storage unavailable"); },
    setItem() { throw new Error("storage unavailable"); },
  };
  const state = { revision: 1, document: createDefaultDocument() };

  assert.deepEqual(migrateLegacyState(state, storage), { document: state.document, migrated: false });
  assert.doesNotThrow(() => markLegacyMigrationComplete(storage));
});

function mealNames(meals) {
  return Object.fromEntries(Object.entries(meals).map(([meal, options]) => [
    meal,
    options.map((option) => option.name),
  ]));
}
function memoryStorage(initial) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function legacyServerDocument() {
  const document = createDefaultDocument();
  document.schemaVersion = 3;
  document.meta.dates = formatDateRange(document.meta.startDate, document.meta.endDate);
  delete document.meta.startDate;
  delete document.meta.endDate;
  document.sections.transport.forEach((block) => { block.data.date = formatFullDate(block.data.date); });
  const staySummary = document.sections.stay.find((block) => block.type === "stay-summary");
  staySummary.data.checkin = formatFullDate(staySummary.data.checkin);
  staySummary.data.checkout = formatFullDate(staySummary.data.checkout);
  document.sections.agenda.filter((block) => block.type === "day").forEach((block) => {
    const calendar = formatAgendaDate(block.data.date);
    block.data.month = calendar.month;
    block.data.date = calendar.day;
    block.data.weekday = calendar.weekday;
  });
  return document;
}
