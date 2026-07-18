import { createDefaultDocument, createStayAnatomyBlock } from "./default-document.mjs";
import {
  inclusiveDayCount,
  isIsoDate,
  parseLegacyCalendarDate,
  parseLegacyDateInRange,
  parseLegacyDateRange,
} from "./date-utils.mjs";
import { DOCUMENT_SCHEMA_VERSION, validateDocument } from "./document-schema.mjs";

export function migrateDocument(document) {
  assertDocumentVersion(document);
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) return validatedClone(document);
  if (document.schemaVersion === 4) return migrateV4ToV5(document);
  if (document.schemaVersion === 3) return migrateV4ToV5(migrateV3ToV4(document));
  if (document.schemaVersion === 2) return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(document)));
  throw new TypeError("Unsupported document schema");
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
  migrateV4ToV5(migrateV3ToV4(candidate));
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
  if (document.schemaVersion !== 4) throw new TypeError("Expected document schema version 4");

  const candidate = structuredClone(document);
  candidate.schemaVersion = DOCUMENT_SCHEMA_VERSION;
  assertSections(candidate.sections);
  for (const block of candidate.sections.agenda) upgradeAgendaBlock(block);
  validateDocument(candidate);
  return candidate;
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
  return candidate;
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
    cover: null,
    priority: "medium",
  }];
}

function upgradeFoodOption(option) {
  if (!option || typeof option !== "object" || Array.isArray(option)) throw new TypeError("Invalid food option");
  return {
    ...option,
    mapUrl: typeof option.mapUrl === "string" ? option.mapUrl : "",
    websiteUrl: typeof option.websiteUrl === "string" ? option.websiteUrl : "",
    cover: option.cover ?? null,
    priority: normalizePriority(option.priority),
  };
}

function normalizePriority(value) {
  return ["high", "medium", "low"].includes(value) ? value : "medium";
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
