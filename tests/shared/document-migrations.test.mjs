import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument, createLegacyStayDistancesBlock } from "../../src/shared/default-document.mjs";
import { formatAgendaDate, formatDateRange, formatFullDate } from "../../src/shared/date-utils.mjs";
import {
  migrateDocument,
  migrateDocumentV2ToV3,
  migrateV2ToV3,
} from "../../src/shared/document-migrations.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("deterministically migrates v2 without mutating content or existing IDs", () => {
  const source = createV2Document();
  source.meta.destination = "Preserved destination";
  source.sections.stay[0].data.name = "Preserved stay";
  source.sections.stay[1].data.items.push("Sauna · Custom amenity");
  source.sections.agenda[0].data.places[0].image = "https://example.com/legacy.jpg";
  const before = structuredClone(source);
  const originalIds = sectionIds(source);

  const first = migrateV2ToV3(source);
  const second = migrateDocumentV2ToV3(source);
  const current = migrateDocument(first);

  assert.deepEqual(source, before);
  assert.deepEqual(first, second);
  assert.notEqual(first, source);
  assert.equal(first.schemaVersion, 3);
  assert.equal(validateDocument(current), true);
  assert.deepEqual(current.meta, {
    brandName: "Dudu & Ale",
    destination: "Preserved destination",
    region: "Rio Grande do Sul",
    startDate: "2026-10-24",
    endDate: "2026-11-01",
    days: "9",
    legs: "4",
  });
  assert.equal(current.sections.transport[0].data.date, "2026-10-24");
  assert.deepEqual(
    current.sections.agenda.slice(0, 2).map((block) => block.data.date),
    ["2026-10-24", "2026-10-25"],
  );
  for (const section of Object.keys(originalIds)) {
    assert.deepEqual(first.sections[section].slice(0, originalIds[section].length).map((block) => block.id), originalIds[section]);
  }
  assert.equal(first.meta.destination, "Preserved destination");
  assert.equal(first.sections.stay[0].data.name, "Preserved stay");
  assert.equal(first.sections.agenda[0].data.places[0].image, "https://example.com/legacy.jpg");
});

test("replaces legacy amenities with stable grouped items and seeds anatomy", () => {
  const source = createV2Document();
  const legacy = source.sections.stay.find((block) => block.type === "amenities");
  const first = migrateDocument(source);
  const second = migrateDocument(source);
  const amenities = first.sections.stay.find((block) => block.id === legacy.id);
  const anatomy = first.sections.stay.find((block) => block.type === "stay-anatomy");

  assert.equal(amenities.type, "stay-amenities");
  assert.equal("items" in amenities.data, false);
  assert.deepEqual(amenities.data.groups[0].items.map((item) => item.label), legacy.data.items);
  assert.deepEqual(
    amenities.data.groups[0].items.map((item) => item.id),
    second.sections.stay.find((block) => block.id === legacy.id).data.groups[0].items.map((item) => item.id),
  );
  assert.equal(new Set(amenities.data.groups[0].items.map((item) => item.id)).size, legacy.data.items.length);
  assert.equal(anatomy.data.area, "90 m²");
  assert.deepEqual(anatomy.data.spaces.map((space) => space.label), ["Quarto 1", "Quarto 2", "Quarto 3", "Sala de Estar"]);
});

test("adds null covers to every block and agenda place", () => {
  const migrated = migrateDocument(createV2Document());
  for (const blocks of Object.values(migrated.sections)) {
    for (const block of blocks) assert.equal(block.cover, null);
  }
  for (const block of migrated.sections.agenda) {
    for (const place of block.data.places ?? []) assert.equal(place.cover, null);
  }
});

test("is idempotent for valid current documents while returning an isolated clone", () => {
  const current = migrateDocument(createV2Document());
  const snapshot = structuredClone(current);
  const repeated = migrateDocument(current);

  assert.deepEqual(repeated, snapshot);
  assert.notEqual(repeated, current);
  repeated.meta.destination = "Changed clone";
  assert.deepEqual(current, snapshot);
});

test("upgrades v5 landmark cards with deterministic driving and walking times", () => {
  const source = createDefaultDocument();
  source.sections.stay.splice(2, 0, createLegacyStayDistancesBlock());
  source.schemaVersion = 5;
  const distances = source.sections.stay.find((block) => block.type === "stay-distances");
  for (const item of distances.data.items) {
    delete item.drivingTime;
    delete item.walkingTime;
  }
  const snapshot = structuredClone(source);

  const migrated = migrateDocument(source);
  const migratedDistances = migrated.sections.stay.find((block) => block.type === "stay-distances");

  assert.deepEqual(source, snapshot);
  assert.equal(validateDocument(migrated), true);
  assert.deepEqual(migratedDistances.data.items.map((item) => [item.drivingTime, item.walkingTime]), [
    ["2 m", "7 m"], ["3 m", "14 m"], ["5 m", "19 m"], ["5 m", "18 m"],
  ]);
});

test("upgrades v6 landmark cards with cycling routes and optional covers", () => {
  const source = createDefaultDocument();
  source.sections.stay.splice(2, 0, createLegacyStayDistancesBlock());
  source.schemaVersion = 6;
  const distances = source.sections.stay.find((block) => block.type === "stay-distances");
  for (const item of distances.data.items) {
    delete item.cyclingDistance;
    delete item.cyclingTime;
    delete item.cyclingUrl;
    delete item.cover;
  }
  const snapshot = structuredClone(source);

  const migrated = migrateDocument(source);
  const migratedDistances = migrated.sections.stay.find((block) => block.type === "stay-distances");

  assert.deepEqual(source, snapshot);
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(validateDocument(migrated), true);
  assert.deepEqual(migratedDistances.data.items.map((item) => [item.cyclingDistance, item.cyclingTime]), [
    ["0.6 km", "2 m"], ["1.1 km", "4 m"], ["2.0 km", "7 m"], ["1.6 km", "6 m"],
  ]);
  assert.deepEqual(migratedDistances.data.items.map((item) => item.cover), [null, null, null, null]);
});

test("upgrades v7 transport cards with origin and destination media", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 7;
  for (const block of source.sections.transport) {
    delete block.data.originCover;
    delete block.data.destinationCover;
  }
  const snapshot = structuredClone(source);

  const migrated = migrateDocument(source);

  assert.deepEqual(source, snapshot);
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(validateDocument(migrated), true);
  assert.deepEqual(migrated.sections.transport.flatMap((block) => [block.data.originCover, block.data.destinationCover]), Array(8).fill(null));
});

test("uses a deterministic collision-free ID for the seeded anatomy", () => {
  const source = createV2Document();
  source.sections.stay.push({
    id: "stay-anatomy",
    type: "note",
    data: { title: "Existing ID", text: "Keep this block" },
  });

  const migrated = migrateDocument(source);
  assert.equal(migrated.sections.stay.find((block) => block.type === "note").id, "stay-anatomy");
  assert.equal(migrated.sections.stay.find((block) => block.type === "stay-anatomy").id, "stay-anatomy-2");
});

test("maintains randomized migration invariants with a fixed seed", () => {
  const random = seededRandom(0xc0ffee);
  for (let iteration = 0; iteration < 75; iteration += 1) {
    const source = randomizedV2Document(random, iteration);
    const snapshot = structuredClone(source);
    const migrated = migrateDocument(source);

    assert.deepEqual(source, snapshot);
    assert.equal(validateDocument(migrated), true);
    assert.deepEqual(migrateDocument(source), migrated);
    assert.deepEqual(migrateDocument(migrated), migrated);
    assertExistingIdsPreserved(source, migrated);
  }
});

test("rolls back malformed migrations by leaving the source unchanged", () => {
  const malformed = [
    (document) => { document.sections.stay = null; },
    (document) => { document.sections.stay[1].data.items[0] = { label: "not a string" }; },
    (document) => { document.sections.transport[1].id = document.sections.transport[0].id; },
    (document) => { document.sections.agenda[0].data.places = {}; },
    (document) => { document.meta.destination = "x".repeat(10_001); },
    (document) => { document.sections.transport.push({ id: "bad", type: "script", data: {} }); },
  ];

  for (const corrupt of malformed) {
    const source = createV2Document();
    corrupt(source);
    const snapshot = structuredClone(source);
    assert.throws(() => migrateDocument(source), TypeError);
    assert.deepEqual(source, snapshot);
  }
});

test("rejects unsupported versions and malformed v3 without source mutation", () => {
  const unsupported = createV2Document();
  unsupported.schemaVersion = 1;
  const invalidV3 = createDefaultDocument();
  invalidV3.sections.agenda[0].cover = { url: "http://example.com/a.jpg", alt: "", position: "center" };
  const snapshot = structuredClone(invalidV3);

  assert.throws(() => migrateDocument(unsupported), /Unsupported/);
  assert.throws(() => migrateDocument(invalidV3), /cover URL/);
  assert.deepEqual(invalidV3, snapshot);
});

function createV2Document() {
  const document = createDefaultDocument();
  downgradeDateFields(document);
  document.schemaVersion = 2;
  document.sections.stay = document.sections.stay
    .filter((block) => block.type !== "stay-anatomy")
    .map(downgradeStayBlock);
  for (const blocks of Object.values(document.sections)) {
    for (const block of blocks) delete block.cover;
  }
  for (const block of document.sections.agenda) {
    for (const place of block.data.places ?? []) delete place.cover;
  }
  return document;
}

function downgradeDateFields(document) {
  document.meta.dates = formatDateRange(document.meta.startDate, document.meta.endDate);
  delete document.meta.startDate;
  delete document.meta.endDate;
  for (const block of document.sections.transport) {
    if (["flight", "transfer"].includes(block.type)) block.data.date = formatFullDate(block.data.date);
  }
  for (const block of document.sections.stay) {
    if (block.type !== "stay-summary") continue;
    block.data.checkin = formatFullDate(block.data.checkin);
    block.data.checkout = formatFullDate(block.data.checkout);
  }
  for (const block of document.sections.agenda) {
    if (block.type !== "day") continue;
    const calendar = formatAgendaDate(block.data.date);
    block.data.month = calendar.month;
    block.data.date = calendar.day;
    block.data.weekday = calendar.weekday;
  }
}

function downgradeStayBlock(block) {
  if (block.type !== "stay-amenities") return block;
  return {
    id: block.id,
    type: "amenities",
    cover: block.cover,
    data: {
      title: block.data.title,
      items: block.data.groups.flatMap((group) => group.items.map((item) => item.label)),
    },
  };
}

function randomizedV2Document(random, iteration) {
  const document = createV2Document();
  document.meta.destination = randomText(random, `Destination ${iteration}`);
  const amenities = document.sections.stay.find((block) => block.type === "amenities");
  const count = Math.floor(random() * 20);
  amenities.data.items = Array.from({ length: count }, (_, index) => randomText(random, `Amenity ${index}`));
  const sections = ["transport", "stay", "agenda"];
  const section = sections[Math.floor(random() * sections.length)];
  document.sections[section].push({
    id: `random-note-${iteration}`,
    type: "note",
    data: { title: randomText(random, "Title"), text: randomText(random, "Text") },
  });
  return document;
}

function randomText(random, prefix) {
  return `${prefix}-${Math.floor(random() * 1_000_000).toString(36)}`;
}

function assertExistingIdsPreserved(source, migrated) {
  const migratedIds = sectionIds(migrated);
  for (const [section, ids] of Object.entries(sectionIds(source))) {
    for (const id of ids) assert.equal(migratedIds[section].includes(id), true, `${section}:${id}`);
  }
}

function sectionIds(document) {
  return Object.fromEntries(Object.entries(document.sections).map(([section, blocks]) => [
    section,
    blocks.map((block) => block.id),
  ]));
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("upgrades v8 Agenda places with optional route values", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 8;
  for (const block of source.sections.agenda) {
    for (const place of block.data.places ?? []) {
      delete place.drivingDistance;
      delete place.drivingTime;
      delete place.walkingDistance;
      delete place.walkingTime;
      delete place.cyclingDistance;
      delete place.cyclingTime;
    }
  }
  const snapshot = structuredClone(source);

  const migrated = migrateDocument(source);

  assert.deepEqual(source, snapshot);
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(validateDocument(migrated), true);
  for (const block of migrated.sections.agenda) {
    for (const place of block.data.places ?? []) {
      assert.deepEqual([
        place.drivingDistance, place.drivingTime, place.walkingDistance,
        place.walkingTime, place.cyclingDistance, place.cyclingTime,
      ], ["", "", "", "", "", ""]);
    }
  }
});

test("upgrades the imported Casa do Sol record without replacing its uploaded cover", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 9;
  const stay = source.sections.stay.find((block) => block.type === "stay-summary");
  stay.data.name = "Casa do Sol";
  stay.data.subtitle = "Incrível Casa com Hidro e Bikes";
  stay.data.checkinTime = "14:00";
  stay.data.checkoutTime = "11:00";
  stay.cover = {
    mediaId: "4Z_l586hODSen5GpgYTBMAAiscqyAa2oPGAqKLZYKC8",
    alt: "",
    position: "center",
  };

  const migrated = migrateDocument(source);
  const migratedStay = migrated.sections.stay.find((block) => block.type === "stay-summary");

  assert.equal(migrated.schemaVersion, 12);
  assert.equal(migratedStay.data.name, "Casa Sol da Serra");
  assert.equal(migratedStay.data.subtitle, "Incrível Casa com Hidro e Bikes");
  assert.equal(migratedStay.data.checkinTime, "14:00");
  assert.equal(migratedStay.data.checkoutTime, "11:00");
  assert.deepEqual(migratedStay.cover, stay.cover);
});

test("upgrades v10 meal options with editable route distances", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 10;
  const options = source.sections.agenda.flatMap((block) => Object.values(block.data.meals ?? {}).flat());
  for (const option of options) {
    delete option.drivingDistance;
    delete option.cyclingDistance;
    delete option.walkingDistance;
  }

  const migrated = migrateDocument(source);
  const migratedOptions = migrated.sections.agenda.flatMap((block) => Object.values(block.data.meals ?? {}).flat());
  const houseMeal = migratedOptions.find((option) => option.name === "Casa do Sol");
  const waterParkMeal = migratedOptions.find((option) => option.name === "Acquamotion");

  assert.equal(migrated.schemaVersion, 12);
  assert.equal(validateDocument(migrated), true);
  assert.deepEqual([
    houseMeal.drivingDistance,
    houseMeal.cyclingDistance,
    houseMeal.walkingDistance,
  ], ["0", "0", "0"]);
  assert.deepEqual([
    waterParkMeal.drivingDistance,
    waterParkMeal.cyclingDistance,
    waterParkMeal.walkingDistance,
  ], ["7.6 km", "7.1 km", "6.9 km"]);
  assert.equal(migratedOptions.every((option) => [
    option.drivingDistance,
    option.cyclingDistance,
    option.walkingDistance,
  ].every((value) => typeof value === "string")), true);
});

test("upgrades v11 meal options with route times for the meal-card selector", () => {
  const source = createDefaultDocument();
  source.schemaVersion = 11;
  const options = source.sections.agenda.flatMap((block) => Object.values(block.data.meals ?? {}).flat());
  for (const option of options) {
    delete option.drivingTime;
    delete option.cyclingTime;
    delete option.walkingTime;
  }

  const migrated = migrateDocument(source);
  const migratedOptions = migrated.sections.agenda.flatMap((block) => Object.values(block.data.meals ?? {}).flat());
  const houseMeal = migratedOptions.find((option) => option.name === "Casa do Sol");
  const waterParkMeal = migratedOptions.find((option) => option.name === "Acquamotion");

  assert.equal(migrated.schemaVersion, 12);
  assert.equal(validateDocument(migrated), true);
  assert.deepEqual([
    houseMeal.drivingTime,
    houseMeal.cyclingTime,
    houseMeal.walkingTime,
  ], ["0", "0", "0"]);
  assert.deepEqual([
    waterParkMeal.drivingTime,
    waterParkMeal.cyclingTime,
    waterParkMeal.walkingTime,
  ], ["13 m", "29 m", "1 h 33 m"]);
  assert.equal(migratedOptions.every((option) => [
    option.drivingTime,
    option.cyclingTime,
    option.walkingTime,
  ].every((value) => typeof value === "string")), true);
});
