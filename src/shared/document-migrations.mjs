import { createDefaultDocument, createLegacyStayDistancesBlock, createStayAnatomyBlock, createTravelEssentialsBlock } from "./default-document.mjs";
import {
  inclusiveDayCount,
  isIsoDate,
  parseLegacyCalendarDate,
  parseLegacyDateInRange,
  parseLegacyDateRange,
} from "./date-utils.mjs";
import { DOCUMENT_SCHEMA_VERSION, validateDocument } from "./document-schema.mjs";

const DOCUMENT_MIGRATIONS = new Map([
  [2, migrateV2ToV3],
  [3, migrateV3ToV4],
  [4, migrateV4ToV5],
  [5, migrateV5ToV6],
  [6, migrateV6ToV7],
  [7, migrateV7ToV8],
  [8, migrateV8ToV9],
  [9, migrateV9ToV10],
  [10, migrateV10ToV11],
  [11, migrateV11ToV12],
  [12, migrateV12ToV13],
  [13, migrateV13ToV14],
  [14, migrateV14ToV15],
]);

export function migrateDocument(document) {
  assertDocumentVersion(document);
  let candidate = document;
  while (candidate.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    const migrate = DOCUMENT_MIGRATIONS.get(candidate.schemaVersion);
    if (!migrate) throw new TypeError("Unsupported document schema");
    candidate = migrate(candidate);
  }
  return validatedClone(candidate);
}

export function migrateV2ToV3(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === 3) return structuredClone(document);
  if (document.schemaVersion !== 2) throw new TypeError("Expected document schema version 2");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 3;
  assertSections(candidate.sections);
  candidate.sections.transport = migrateBlocks(candidate.sections.transport, "transport");
  candidate.sections.stay = migrateBlocks(candidate.sections.stay, "stay");
  candidate.sections.agenda = migrateBlocks(candidate.sections.agenda, "agenda");
  seedStayAnatomy(candidate.sections.stay);
  migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(candidate))))));
  return candidate;
}

export const migrateDocumentV2ToV3 = migrateV2ToV3;

export function migrateV3ToV4(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 4) return structuredClone(document);
  if (document.schemaVersion !== 3) throw new TypeError("Expected document schema version 3");

  const candidate = structuredClone(document);
  const range = parseLegacyDateRange(candidate.meta?.dates);
  candidate.schemaVersion = 4;
  candidate.meta.startDate = range.startDate;
  candidate.meta.endDate = range.endDate;
  delete candidate.meta.dates;
  const days = inclusiveDayCount(range.startDate, range.endDate);
  if (days !== null) candidate.meta.days = String(days);
  migrateDateBlocks(candidate.sections, range);
  return candidate;
}

export function migrateV4ToV5(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 5) return structuredClone(document);
  if (document.schemaVersion !== 4) throw new TypeError("Expected document schema version 4");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 5;
  assertSections(candidate.sections);
  for (const block of candidate.sections.agenda) upgradeAgendaBlock(block);
  return candidate;
}

export function migrateV5ToV6(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 6) return structuredClone(document);
  if (document.schemaVersion !== 5) throw new TypeError("Expected document schema version 5");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 6;
  assertSections(candidate.sections);
  for (const block of candidate.sections.stay) upgradeStayDistanceBlock(block);
  return candidate;
}

export function migrateV6ToV7(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 7) return structuredClone(document);
  if (document.schemaVersion !== 6) throw new TypeError("Expected document schema version 6");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 7;
  assertSections(candidate.sections);
  for (const block of candidate.sections.stay) upgradeStayDistanceCyclingBlock(block);
  return candidate;
}

export function migrateV7ToV8(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 8) return structuredClone(document);
  if (document.schemaVersion !== 7) throw new TypeError("Expected document schema version 7");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 8;
  assertSections(candidate.sections);
  for (const block of candidate.sections.transport) upgradeTransportLocationCovers(block);
  return candidate;
}

export function migrateV8ToV9(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 8) throw new TypeError("Expected document schema version 8");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 9;
  assertSections(candidate.sections);
  for (const block of candidate.sections.agenda) upgradeAgendaRouteFields(block);
  return candidate;
}

export function migrateV9ToV10(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 9) throw new TypeError("Expected document schema version 9");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 10;
  assertSections(candidate.sections);
  for (const block of candidate.sections.stay) upgradeCasaSolDaSerra(block);
  return candidate;
}

export function migrateV10ToV11(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 10) throw new TypeError("Expected document schema version 10");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 11;
  assertSections(candidate.sections);
  const defaults = defaultMealRouteDistances();
  for (const block of candidate.sections.agenda) upgradeMealRouteDistances(block, defaults);
  return candidate;
}

export function migrateV11ToV12(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 11) throw new TypeError("Expected document schema version 11");

  const candidate = structuredClone(document);
  candidate.schemaVersion = 12;
  assertSections(candidate.sections);
  const defaults = defaultMealRouteTimes();
  for (const block of candidate.sections.agenda) upgradeMealRouteTimes(block, defaults);
  return candidate;
}


export function migrateV12ToV13(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 12) throw new TypeError("Expected document schema version 12");

  const candidate = structuredClone(document);
  assertSections(candidate.sections);
  const savedPlaces = candidate.sections.agenda.filter((block) => block.type === "saved-places");
  candidate.sections.agenda = candidate.sections.agenda.filter((block) => block.type !== "saved-places");
  candidate.sections.places = [...(Array.isArray(candidate.sections.places) ? candidate.sections.places : []), ...savedPlaces];
  candidate.schemaVersion = 13;
  return candidate;
}

export function migrateV13ToV14(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 13) throw new TypeError("Expected document schema version 13");

  const candidate = structuredClone(document);
  assertSections(candidate.sections);
  if (!candidate.sections.transport.some((block) => block.type === "travel-essentials")) {
    candidate.sections.transport.unshift(createTravelEssentialsBlock(availableId(candidate.sections.transport, "travel-essentials")));
  }
  candidate.schemaVersion = 14;
  return candidate;
}

export function migrateV14ToV15(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion !== 14) throw new TypeError("Expected document schema version 14");

  const candidate = structuredClone(document);
  if (["Your Holiday Name", "Nome das suas férias"].includes(candidate.meta?.brandName)) {
    candidate.meta.brandName = "Itinerary";
  }
  candidate.schemaVersion = DOCUMENT_SCHEMA_VERSION;
  validateDocument(candidate);
  return candidate;
}
const MEAL_ROUTE_DISTANCE_FIELDS = Object.freeze([
  "drivingDistance",
  "cyclingDistance",
  "walkingDistance",
]);
const MEAL_ROUTE_TIME_FIELDS = Object.freeze([
  "drivingTime",
  "cyclingTime",
  "walkingTime",
]);

function defaultMealRouteDistances() {
  const options = createDefaultDocument().sections.agenda
    .filter((block) => block.type === "day")
    .flatMap((block) => Object.values(block.data.meals).flat());
  return new Map(options.map((option) => [option.name, option]));
}

function upgradeMealRouteDistances(block, defaults) {
  if (block.type !== "day") return;
  for (const option of Object.values(block.data.meals).flat()) {
    const fallback = defaults.get(option.name) ?? {};
    const fields = MEAL_ROUTE_DISTANCE_FIELDS.map((field) => [
      field,
      typeof option[field] === "string" ? option[field] : fallback[field] ?? "",
    ]);
    Object.assign(option, Object.fromEntries(fields));
  }
}

function defaultMealRouteTimes() {
  const options = createDefaultDocument().sections.agenda
    .filter((block) => block.type === "day")
    .flatMap((block) => Object.values(block.data.meals).flat());
  return new Map(options.map((option) => [option.name, option]));
}

function upgradeMealRouteTimes(block, defaults) {
  if (block.type !== "day") return;
  for (const option of Object.values(block.data.meals).flat()) {
    const fallback = defaults.get(option.name) ?? {};
    const fields = MEAL_ROUTE_TIME_FIELDS.map((field) => [
      field,
      typeof option[field] === "string" ? option[field] : fallback[field] ?? "",
    ]);
    Object.assign(option, Object.fromEntries(fields));
  }
}

function validatedClone(document) {
  const candidate = structuredClone(document);
  validateDocument(candidate);
  return candidate;
}

function migrateBlocks(blocks, section) {
  if (!Array.isArray(blocks)) throw new TypeError(`Invalid ${section} blocks`);
  return blocks.map((block) => migrateBlock(block, section));
}

function migrateDateBlocks(sections, range) {
  assertSections(sections);
  for (const block of sections.transport) migrateBlockDates(block, range);
  for (const block of sections.stay) migrateBlockDates(block, range);
  for (const block of sections.agenda) migrateBlockDates(block, range);
}

export function migrateCustomBlockDates(block, range) {
  const candidate = structuredClone(block);
  migrateBlockDates(candidate, range);
  return candidate;
}

export function migrateCustomBlock(block, options) {
  const candidate = structuredClone(block);
  if (options.sourceVersion < 4) migrateBlockDates(candidate, options.range);
  if (options.sourceVersion < 5) upgradeAgendaBlock(candidate);
  if (options.sourceVersion < 6) upgradeStayDistanceBlock(candidate);
  if (options.sourceVersion < 7) upgradeStayDistanceCyclingBlock(candidate);
  if (options.sourceVersion < 8) upgradeTransportLocationCovers(candidate);
  if (options.sourceVersion < 9) upgradeAgendaRouteFields(candidate);
  if (options.sourceVersion < 10) upgradeCasaSolDaSerra(candidate);
  if (options.sourceVersion < 11) upgradeMealRouteDistances(candidate, defaultMealRouteDistances());
  if (options.sourceVersion < 12) upgradeMealRouteTimes(candidate, defaultMealRouteTimes());
  return candidate;
}

function upgradeCasaSolDaSerra(block) {
  if (!isStaySummary(block)) return;
  if (!block.data || typeof block.data !== "object") throw new TypeError("Invalid stay summary");
  if (!["Casa Sol da Serra", "Casa do Sol"].includes(block.data.name)) return;
  block.data.name = "Casa Sol da Serra";
  if (block.data.subtitle === "Hidro · Bikes · Centro") block.data.subtitle = "Incrível Casa com Hidro e Bikes";
  if (!block.data.checkinTime) block.data.checkinTime = "14:00";
  if (!block.data.checkoutTime) block.data.checkoutTime = "11:00";
}

function isStaySummary(block) {
  return Boolean(block) && typeof block === "object" && block.type === "stay-summary";
}

function migrateBlockDates(block, range) {
  if (["flight", "transfer"].includes(block.type)) block.data.date = parseLegacyDateInRange(block.data.date, range);
  if (block.type === "stay-summary") {
    block.data.checkin = parseLegacyDateInRange(block.data.checkin, range);
    block.data.checkout = parseLegacyDateInRange(block.data.checkout, range);
  }
  if (block.type !== "day" || isIsoDate(block.data.date, { allowEmpty: false })) return;
  block.data.date = parseLegacyCalendarDate(block.data.month, block.data.date, range);
  delete block.data.month;
  delete block.data.weekday;
}

function migrateBlock(block, section) {
  if (!block || typeof block !== "object" || Array.isArray(block)) throw new TypeError(`Invalid ${section} block`);
  const migrated = section === "stay" && block.type === "amenities" ? migrateAmenities(block) : block;
  migrated.cover = null;
  if (section === "agenda" && ["day", "saved-places"].includes(migrated.type)) addPlaceCovers(migrated.data);
  return migrated;
}

function migrateAmenities(block) {
  if (!block.data || typeof block.data !== "object" || !Array.isArray(block.data.items)) {
    throw new TypeError("Invalid amenities data");
  }
  const { items, ...data } = block.data;
  const prefix = `v3-${stableHash(block.id)}`;
  const defaults = createDefaultDocument().sections.stay.find((item) => item.type === "stay-amenities");
  return {
    ...defaults,
    id: block.id,
    type: "stay-amenities",
    data: {
      ...defaults.data,
      title: data.title,
      groups: [{
        id: `${prefix}-group`,
        label: data.title,
        items: items.map((label, index) => migrateAmenity(label, prefix, index)),
      }, ...defaults.data.groups],
    },
  };
}

function migrateAmenity(label, prefix, index) {
  const preset = amenityPreset(label);
  return {
    id: `${prefix}-item-${index + 1}`,
    presetId: preset.presetId,
    label,
    iconKey: preset.iconKey,
  };
}

function amenityPreset(label) {
  const value = typeof label === "string" ? label.toLowerCase() : "";
  if (value.includes("hydro")) return { presetId: "hot-tub", iconKey: "hot-tub" };
  if (value.includes("bike")) return { presetId: "bikes", iconKey: "bike" };
  if (value.includes("central") || value.includes("centro")) return { presetId: "central-location", iconKey: "map-pin" };
  return { presetId: "custom", iconKey: "check" };
}

function addPlaceCovers(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.places)) throw new TypeError("Invalid agenda places");
  for (const place of data.places) {
    if (!place || typeof place !== "object" || Array.isArray(place)) throw new TypeError("Invalid place");
    place.cover = null;
  }
}

function upgradeAgendaBlock(block) {
  if (!block || typeof block !== "object" || !["day", "saved-places"].includes(block.type)) return;
  if (!block.data || !Array.isArray(block.data.places)) throw new TypeError("Invalid agenda places");
  block.data.places = block.data.places.map(upgradePlace);
  if (block.type !== "day") return;
  if (!block.data.meals || typeof block.data.meals !== "object") throw new TypeError("Invalid day meals");
  block.data.meals = Object.fromEntries(["breakfast", "lunch", "dinner"].map((meal) => [
    meal,
    upgradeMeal(block.data.meals[meal], block.id, meal),
  ]));
}

function upgradePlace(place) {
  if (!place || typeof place !== "object" || Array.isArray(place)) throw new TypeError("Invalid place");
  const legacyLink = typeof place.link === "string" ? place.link : "";
  const mapLink = isRecognizedMapUrl(legacyLink) ? legacyLink : "";
  const upgraded = {
    ...place,
    mapUrl: typeof place.mapUrl === "string" ? place.mapUrl : mapLink,
    websiteUrl: typeof place.websiteUrl === "string" ? place.websiteUrl : legacyLink && !mapLink ? legacyLink : "",
    priority: normalizePriority(place.priority),
  };
  delete upgraded.link;
  return upgraded;
}

function upgradeMeal(value, blockId, meal) {
  if (Array.isArray(value)) return value.map(upgradeFoodOption);
  if (typeof value !== "string") throw new TypeError(`Invalid ${meal} meal`);
  if (!value) return [];
  return [{
    id: `food-${stableHash(blockId)}-${meal}-1`,
    name: value,
    mapUrl: "",
    websiteUrl: "",
    comment: "",
    priority: "medium",
    cover: null,
  }];
}

function upgradeFoodOption(option) {
  if (!option || typeof option !== "object" || Array.isArray(option)) throw new TypeError("Invalid food option");
  const upgraded = {
    ...option,
    mapUrl: typeof option.mapUrl === "string" ? option.mapUrl : "",
    websiteUrl: typeof option.websiteUrl === "string" ? option.websiteUrl : "",
    comment: typeof option.comment === "string" ? option.comment : "",
    priority: normalizePriority(option.priority),
    cover: option.cover ?? null,
  };
  return upgraded;
}

function normalizePriority(value) {
  return ["high", "medium", "low"].includes(value) ? value : "medium";
}

function upgradeStayDistanceBlock(block) {
  if (!block || typeof block !== "object" || block.type !== "stay-distances") return;
  if (!block.data || !Array.isArray(block.data.items)) throw new TypeError("Invalid stay distance landmarks");
  const defaults = createLegacyStayDistancesBlock();
  const times = new Map(defaults.data.items.map((item) => [item.name, item]));
  for (const item of block.data.items) upgradeStayDistanceItem(item, times);
}

function upgradeStayDistanceItem(item, times) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new TypeError("Invalid stay distance landmark");
  const fallback = times.get(item.name);
  item.drivingTime = normalizeRouteTime(item.drivingTime, fallback?.drivingTime);
  item.walkingTime = normalizeRouteTime(item.walkingTime, fallback?.walkingTime);
}

function normalizeRouteTime(value, fallback) {
  if (typeof value === "string") return value;
  return typeof fallback === "string" ? fallback : "Add time";
}

function upgradeStayDistanceCyclingBlock(block) {
  if (!block || typeof block !== "object" || block.type !== "stay-distances") return;
  if (!block.data || !Array.isArray(block.data.items)) throw new TypeError("Invalid stay distance landmarks");
  const defaults = createLegacyStayDistancesBlock();
  const routes = new Map(defaults.data.items.map((item) => [item.name, item]));
  for (const item of block.data.items) upgradeStayDistanceCyclingItem(item, routes);
}

function upgradeStayDistanceCyclingItem(item, routes) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new TypeError("Invalid stay distance landmark");
  const fallback = routes.get(item.name);
  item.cyclingDistance = normalizeRouteField(item.cyclingDistance, fallback?.cyclingDistance, "Add distance");
  item.cyclingTime = normalizeRouteField(item.cyclingTime, fallback?.cyclingTime, "Add time");
  item.cyclingUrl = normalizeRouteField(item.cyclingUrl, fallback?.cyclingUrl, "");
  item.cover ??= null;
}

function normalizeRouteField(value, fallback, placeholder) {
  if (typeof value === "string") return value;
  return typeof fallback === "string" ? fallback : placeholder;
}


function upgradeAgendaRouteFields(block) {
  if (!block || typeof block !== "object" || !["day", "saved-places"].includes(block.type)) return;
  if (!block.data || !Array.isArray(block.data.places)) throw new TypeError("Invalid agenda places");
  for (const place of block.data.places) upgradeAgendaPlaceRouteFields(place);
}

function upgradeAgendaPlaceRouteFields(place) {
  if (!place || typeof place !== "object" || Array.isArray(place)) throw new TypeError("Invalid place");
  for (const field of [
    "drivingDistance", "drivingTime", "walkingDistance", "walkingTime", "cyclingDistance", "cyclingTime",
  ]) {
    if (typeof place[field] !== "string") place[field] = "";
  }
}
function upgradeTransportLocationCovers(block) {
  if (!block || typeof block !== "object" || !["flight", "transfer"].includes(block.type)) return;
  if (!block.data || typeof block.data !== "object") throw new TypeError("Invalid transport block");
  block.data.originCover ??= null;
  block.data.destinationCover ??= null;
}
export function isRecognizedMapUrl(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return host === "maps.app.goo.gl"
    || host.startsWith("maps.google.")
    || (host.startsWith("google.") && url.pathname.startsWith("/maps"))
    || host === "maps.apple.com"
    || (host.endsWith("bing.com") && url.pathname.startsWith("/maps"))
    || host === "waze.com" || host.endsWith(".waze.com");
}

function seedStayAnatomy(blocks) {
  if (blocks.some((block) => block.type === "stay-anatomy")) return;
  blocks.push(createStayAnatomyBlock(availableId(blocks, "stay-anatomy")));
}

function availableId(blocks, preferred) {
  const ids = new Set(blocks.map((block) => block.id));
  if (!ids.has(preferred)) return preferred;
  let suffix = 2;
  while (ids.has(`${preferred}-${suffix}`)) suffix += 1;
  return `${preferred}-${suffix}`;
}

function stableHash(value) {
  if (typeof value !== "string") return "invalid";
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function assertDocumentVersion(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new TypeError("Invalid document");
  if (!Number.isInteger(document.schemaVersion)) throw new TypeError("Invalid document schema version");
}

function assertSections(sections) {
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) throw new TypeError("Invalid sections");
}
