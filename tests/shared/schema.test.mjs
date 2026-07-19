import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  DOCUMENT_SCHEMA_VERSION,
  validateCustomBlock,
  validateDocument,
  validateMedia,
} from "../../src/shared/document-schema.mjs";

test("accepts the complete schema v4 default document", () => {
  const document = createDefaultDocument();
  assert.equal(document.schemaVersion, DOCUMENT_SCHEMA_VERSION);
  assert.equal(document.meta.brandName, "Dudu & Ale");
  assert.equal(validateDocument(document), true);

  const allBlocks = Object.values(document.sections).flat();
  const staySummary = document.sections.stay.find((block) => block.type === "stay-summary");
  assert.deepEqual(staySummary.cover, {
    url: "/assets/casa-sol-da-serra.webp",
    alt: "Casa Sol da Serra and its garden in Gramado",
    position: "center",
  });
  assert.equal(allBlocks.filter((block) => block !== staySummary).every((block) => block.cover === null), true);
  const rioCover = {
    url: "/assets/rio-de-janeiro-airport.png",
    alt: "Aerial view of Rio de Janeiro and Sugarloaf Mountain",
    position: "center",
  };
  const flights = document.sections.transport.filter((block) => block.type === "flight");
  assert.deepEqual(flights[0].data.originCover, rioCover);
  assert.deepEqual(flights[1].data.destinationCover, rioCover);
  assert.equal(document.sections.transport.every((block) => block.data.providerCover === null), true);
  const agendaPlaces = document.sections.agenda.flatMap((block) => block.data.places ?? []);
  assert.equal(agendaPlaces.filter((place) => place.name === "Aeroporto Internacional Antônio Carlos Jobim").every((place) => JSON.stringify(place.cover) === JSON.stringify(rioCover)), true);
  assert.equal(agendaPlaces.filter((place) => place.name !== "Aeroporto Internacional Antônio Carlos Jobim").every((place) => place.cover === null && place.image === ""), true);
  const airportLabels = [
    ...document.sections.transport.flatMap((block) => [block.data.origin, block.data.destination]),
    ...agendaPlaces.map((place) => place.name),
  ];
  assert.equal(airportLabels.includes("Aeroporto Internacional Antônio Carlos Jobim"), true);
  assert.equal(airportLabels.includes("Aeroporto Internacional Salgado Filho"), true);
  assert.equal(airportLabels.some((label) => /RIOgaleão|GIG Airport|POA Airport|Salgado Filho International Airport/.test(label)), false);
  const mealOptions = document.sections.agenda.flatMap((block) => Object.values(block.data.meals ?? {}).flat());
  assert.equal(mealOptions.every((option) => option.cover === null), true);
  assert.equal(mealOptions.every((option) => [
    option.drivingTime,
    option.cyclingTime,
    option.walkingTime,
  ].every((value) => typeof value === "string")), true);
});

test("validates structured transport direction, stop and seat choices", () => {
  const document = createDefaultDocument();
  const flight = document.sections.transport.find((block) => block.type === "flight");
  flight.data.directionMode = "inbound";
  flight.data.serviceType = "layover";
  flight.data.stopCount = 2;
  flight.data.seatCount = 3;
  assert.equal(validateDocument(document), true);

  flight.data.stopCount = 0;
  assert.throws(() => validateDocument(document), /layover stop count/);
  flight.data.stopCount = 2;
  flight.data.seatCount = 21;
  assert.throws(() => validateDocument(document), /seat count/);
});

test("accepts transport endpoint dates and IANA time zones", () => {
  const document = createDefaultDocument();
  const flight = document.sections.transport.find((block) => block.type === "flight");
  flight.data.departureDate = "2026-10-24";
  flight.data.arrivalDate = "2026-10-25";
  flight.data.departureTimeZone = "America/Sao_Paulo";
  flight.data.arrivalTimeZone = "Europe/London";
  assert.equal(validateDocument(document), true);

  flight.data.arrivalTimeZone = "Not/A_Time_Zone";
  assert.throws(() => validateDocument(document), /arrivalTimeZone/);
});

test("accepts legacy optional headings and validates edited pill titles", () => {
  const legacy = createDefaultDocument();
  delete legacy.meta.brandName;
  delete legacy.meta.transportTitle;
  delete legacy.meta.stayTitle;
  delete legacy.meta.agendaTitle;
  assert.equal(validateDocument(legacy), true);

  const edited = createDefaultDocument();
  edited.meta.brandName = "Our Adventures";
  edited.meta.transportTitle = "Travel Details";
  assert.equal(validateDocument(edited), true);

  edited.meta.transportTitle = "x".repeat(501);
  assert.throws(() => validateDocument(edited), /meta transportTitle/);
});

test("accepts bounded in-place text and trusted-icon override records", () => {
  const document = createDefaultDocument();
  document.meta.inlineText = {
    "en-GB:block:agenda:agenda-day-1:text:4": "A custom place description",
    "shared:brand:text:0": "Dudu & Ale",
  };
  document.meta.inlineIcons = {
    "nav:transport": "airplane",
    "section-title:stay:icon:0": "home",
  };
  assert.equal(validateDocument(document), true);

  document.meta.inlineIcons["x".repeat(321)] = "home";
  assert.throws(() => validateDocument(document), /inline icons key/);
});

test("accepts an optional uploaded or remote hero cover", () => {
  const document = createDefaultDocument();
  document.meta.heroCover = { url: "https://example.com/hero.jpg", alt: "Gramado", position: "center" };
  assert.equal(validateDocument(document), true);

  document.meta.heroCover = { mediaId: "hero-upload-1", alt: "Gramado", position: "top" };
  assert.equal(validateDocument(document), true);

  document.meta.heroCover = { url: "javascript:alert(1)", alt: "Gramado", position: "center" };
  assert.throws(() => validateDocument(document), /meta hero cover/);
});

test("seeds grouped amenities and the exact property anatomy", () => {
  const stay = createDefaultDocument().sections.stay;
  const amenities = stay.find((block) => block.type === "stay-amenities");
  const anatomy = stay.find((block) => block.type === "stay-anatomy");

  const amenityItems = amenities.data.groups.flatMap((group) => group.items);
  assert.equal(amenities.data.title, "Listing Highlights");
  assert.deepEqual(amenities.data.groups.map((group) => group.label), [
    "Kitchen",
    "Sleep and Laundry",
    "Bath and Spa",
    "Home Comforts",
    "Work and Play",
    "Outdoor Living",
  ]);
  assert.equal(amenityItems.length, 24);
  amenities.data.groups.forEach((group) => assert.equal(group.items.length, 4));
  assert.equal(new Set(amenityItems.map((item) => normalizeAmenityLabel(item.label))).size, amenityItems.length);
  assert.equal(amenityItems.find((item) => item.presetId === "linens").label, "Bed linens and wardrobes");
  const media = amenities.data.groups.find((group) => group.label === "Work and Play");
  assert.deepEqual(media.items.map((item) => item.label), [
    "Fast, free Wi-Fi",
    "Cable and satellite TV",
    "Dedicated workspace",
    "Video games",
  ]);
  assert.doesNotMatch(media.items.map((item) => item.label).join(" "), /streaming/i);
  amenityItems.forEach((item) => assert.deepEqual(Object.keys(item), ["id", "presetId", "label", "iconKey"]));
  assert.equal(anatomy.data.area, "90 m²");
  assert.deepEqual(anatomy.data.spaces.map((space) => [space.label, space.beds[0].quantity, space.beds[0].label]), [
    ["Quarto 1", 1, "Cama de Casal"],
    ["Quarto 2", 1, "Cama de Casal"],
    ["Quarto 3", 1, "Cama de Casal"],
    ["Sala de Estar", 1, "Sofá-Cama"],
  ]);
});

function normalizeAmenityLabel(label) {
  return label.normalize("NFKD").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

test("accepts every generic block type in every section", () => {
  for (const section of ["transport", "stay", "agenda"]) {
    const document = createDefaultDocument();
    document.sections[section].push(...genericBlocks(section));
    assert.equal(validateDocument(document), true);
    for (const block of genericBlocks(`standalone-${section}`)) {
      assert.equal(validateCustomBlock(block, section), true);
    }
  }
});

test("preserves section-specific types and rejects misplaced or removed types", () => {
  assert.equal(validateCustomBlock(block("specific-flight", "flight", flightData()), "transport"), true);
  assert.equal(validateCustomBlock(block("specific-link", "link", {
    title: "Booking", description: "Open reservation", url: "https://example.com",
  }), "stay"), true);
  assert.throws(() => validateCustomBlock(block("wrong-flight", "flight", flightData()), "agenda"), /block type/);
  assert.throws(() => validateCustomBlock(block("old-amenities", "amenities", { title: "Old", items: [] }), "stay"), /block type/);
  assert.throws(() => validateCustomBlock(block("unknown", "script", {}), "transport"), /block type/);
});

test("validates remote and uploaded media as an exclusive union", () => {
  assert.equal(validateMedia(remoteMedia()), true);
  assert.equal(validateMedia({ mediaId: "XyZ_123-upload", alt: "Uploaded", position: "top" }), true);
  assert.equal(validateMedia({ url: "/assets/casa-sol-da-serra.webp", alt: "Bundled", position: "center" }), true);

  const invalid = [
    { url: "http://example.com/image.jpg", alt: "", position: "center" },
    { url: "/media/id", alt: "", position: "center" },
    { mediaId: "", alt: "", position: "center" },
    { url: "https://example.com/a.jpg", mediaId: "id", alt: "", position: "center" },
    { alt: "", position: "center" },
    { url: "https://example.com/a.jpg", alt: "x".repeat(501), position: "center" },
  ];
  for (const media of invalid) assert.throws(() => validateMedia(media), TypeError);

  const invalidCover = createDefaultDocument();
  invalidCover.sections.transport[0].cover = { url: "http://example.com/a.jpg", alt: "", position: "center" };
  assert.throws(() => validateDocument(invalidCover), /cover URL/);
});

test("accepts only supported optional block widths", () => {
  for (const span of [4, 6, 8, 12]) {
    const document = createDefaultDocument();
    document.sections.transport[0].layout = { span };
    assert.equal(validateDocument(document), true);
  }

  for (const layout of [{ span: 5 }, { span: "6" }, null, { width: 6 }]) {
    const document = createDefaultDocument();
    document.sections.transport[0].layout = layout;
    assert.throws(() => validateDocument(document), /block layout/);
  }
});

test("requires valid ordered ISO dates while allowing new undated blocks", () => {
  const document = createDefaultDocument();
  document.sections.transport[0].data.date = "";
  assert.equal(validateDocument(document), true);

  for (const value of ["Oct 24", "2026-02-29", "2026-1-02"]) {
    const invalid = createDefaultDocument();
    invalid.sections.transport[0].data.date = value;
    assert.throws(() => validateDocument(invalid), /flight date/);
  }

  const reversed = createDefaultDocument();
  reversed.meta.endDate = "2026-10-20";
  assert.throws(() => validateDocument(reversed), /trip dates/);
});

test("enforces table dimensions and row width", () => {
  const valid = createDefaultDocument();
  valid.sections.transport.push(block("large-table", "table", {
    title: "Maximum table",
    columns: Array.from({ length: 12 }, (_, index) => `Column ${index}`),
    rows: Array.from({ length: 50 }, () => Array(12).fill("Cell")),
  }));
  assert.equal(validateDocument(valid), true);

  const tooWide = structuredClone(valid);
  tooWide.sections.transport.at(-1).data.columns.push("Column 13");
  assert.throws(() => validateDocument(tooWide), /table columns/);

  const tooTall = structuredClone(valid);
  tooTall.sections.transport.at(-1).data.rows.push(Array(12).fill("Cell"));
  assert.throws(() => validateDocument(tooTall), /table rows/);

  const ragged = structuredClone(valid);
  ragged.sections.transport.at(-1).data.rows[0].pop();
  assert.throws(() => validateDocument(ragged), /cell count/);
});

test("enforces bounded strings, collections, and unique stable IDs", () => {
  const longText = createDefaultDocument();
  longText.sections.agenda[0].data.notes = "x".repeat(10_001);
  assert.throws(() => validateDocument(longText), /day data notes/);

  const longId = createDefaultDocument();
  longId.sections.stay[0].id = "x".repeat(161);
  assert.throws(() => validateDocument(longId), /block ID/);

  const tooManyPlaces = createDefaultDocument();
  tooManyPlaces.sections.agenda[0].data.places = makePlaces(201);
  assert.throws(() => validateDocument(tooManyPlaces), /places/);

  const duplicate = createDefaultDocument();
  duplicate.sections.stay[1].id = duplicate.sections.stay[0].id;
  assert.throws(() => validateDocument(duplicate), /block ID/);

  const duplicateAmenity = createDefaultDocument();
  const items = duplicateAmenity.sections.stay[1].data.groups[0].items;
  items[1].id = items[0].id;
  assert.throws(() => validateDocument(duplicateAmenity), /amenity item ID/);
});

test("rejects seeded randomized non-string values at every required string path", () => {
  const document = createDefaultDocument();
  document.sections.transport.push(...genericBlocks("random"));
  const random = seededRandom(0x5eed1234);
  const paths = shuffled(collectStringPaths(document), random);
  const nonStrings = [null, false, 0, {}, []];

  for (const path of paths) {
    const mutation = structuredClone(document);
    const parent = path.slice(0, -1).reduce((value, key) => value[key], mutation);
    parent[path.at(-1)] = structuredClone(nonStrings[Math.floor(random() * nonStrings.length)]);
    assert.throws(() => validateDocument(mutation), TypeError, path.join("."));
  }
});

function genericBlocks(prefix) {
  return [
    block(`${prefix}-table`, "table", {
      title: "Schedule", columns: ["Time", "Plan"], rows: [["09:00", "Walk"]],
    }),
    { ...block(`${prefix}-image`, "image-card", { title: "View", text: "Mountain view" }), cover: remoteMedia() },
    block(`${prefix}-icons`, "icon-list", {
      title: "Highlights", items: [{ id: `${prefix}-icon-1`, label: "Central", iconKey: "map-pin", text: "Walkable" }],
    }),
    block(`${prefix}-checklist`, "checklist", {
      title: "Packing", items: [{ id: `${prefix}-check-1`, label: "Tickets", checked: true }],
    }),
    block(`${prefix}-facts`, "facts", {
      title: "Details", items: [{ id: `${prefix}-fact-1`, label: "Duration", value: "3 hours" }],
    }),
    block(`${prefix}-link-card`, "link-card", {
      title: "Map", description: "Open directions", url: "https://example.com/map",
    }),
    block(`${prefix}-note`, "note", { title: "Remember", text: "Bring a jacket" }),
  ];
}

function flightData() {
  return {
    direction: "Outbound", date: "2026-10-24", provider: "Air", origin: "A", originCity: "Alpha",
    destination: "B", destinationCity: "Beta", departure: "09:00", arrival: "10:00",
    duration: "1h", stop: "Direct", details: "None", seats: "1A",
  };
}

function block(id, type, data) {
  return { id, type, cover: null, data };
}

function remoteMedia() {
  return { url: "https://images.example.com/view.jpg", alt: "A mountain view", position: "center" };
}

function makePlaces(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `place-${index}`, name: `Place ${index}`, link: "", image: "", comment: "", cover: null,
  }));
}

function collectStringPaths(value, path = [], paths = []) {
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (typeof child === "string") paths.push(childPath);
    else if (child && typeof child === "object") collectStringPaths(child, childPath, paths);
  }
  return paths;
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
