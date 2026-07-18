import { clone } from "../utils/html.js";
import {
  parseLegacyCalendarDate,
  parseLegacyDateInRange,
  parseLegacyDateRange,
} from "../../shared/date-utils.mjs";
import { isRecognizedMapUrl, migrateDocument } from "../../shared/document-migrations.mjs";
import { validateDocument } from "../../shared/document-schema.mjs";

const TRIP_KEY = "gramado-trip-data-v1";
const PLAN_KEY = "gramado-week-plan-v1";
const MIGRATION_KEY = "gramado-blocks-migrated-v2";

export function prepareLoadedState(serverState, storage) {
  const sourceSchemaVersion = serverState?.document?.schemaVersion;
  const document = migrateDocument(serverState?.document);
  const legacy = migrateLegacyState({ ...serverState, document }, storage);
  validateDocument(legacy.document);
  const serverMigrated = sourceSchemaVersion !== legacy.document.schemaVersion;
  return {
    document: legacy.document,
    migrated: serverMigrated || legacy.migrated,
    legacyMigrated: legacy.migrated,
    serverMigrated,
  };
}

export function migrateLegacyState(serverState, storage) {
  const legacyStorage = storage ?? getStorage();
  if (serverState.revision !== 1 || readStorage(legacyStorage, MIGRATION_KEY)) return unchanged(serverState.document);
  const flat = parse(readStorage(legacyStorage, TRIP_KEY));
  const plan = parse(readStorage(legacyStorage, PLAN_KEY));
  if (!flat && !plan) return unchanged(serverState.document);
  const document = clone(serverState.document);
  if (flat) migrateFlatFields(document, flat);
  if (plan) migratePlan(document, plan);
  return { document, migrated: true };
}

export function markLegacyMigrationComplete(storage) {
  try {
    (storage ?? getStorage())?.setItem(MIGRATION_KEY, new Date().toISOString());
  } catch { /* The server save remains authoritative. */ }
}

function getStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

function readStorage(storage, key) {
  try { return storage?.getItem(key); } catch { return null; }
}

function unchanged(document) {
  return { document, migrated: false };
}

function parse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function migrateFlatFields(document, flat) {
  assign(document.meta, "destination", flat.destinationCity);
  assign(document.meta, "region", flat.destinationRegion);
  const legacyRange = parseLegacyDateRange(flat.tripDates);
  assign(document.meta, "startDate", legacyRange.startDate);
  assign(document.meta, "endDate", legacyRange.endDate);
  assign(document.meta, "days", flat.tripDays);
  assign(document.meta, "legs", flat.transportCount);
  migrateStay(document.sections.stay, flat, dateRange(document.meta));
  migrateTransport(document.sections.transport, flat);
}

function migrateStay(blocks, flat, range) {
  const summary = blocks.find((block) => block.type === "stay-summary");
  const essentials = blocks.find((block) => block.type === "essentials");
  assign(summary?.data, "name", flat.stayName);
  assign(summary?.data, "subtitle", flat.staySubtitle);
  assign(summary?.data, "checkin", parseLegacyDateInRange(flat.stayCheckinDate, range));
  assign(summary?.data, "checkout", parseLegacyDateInRange(flat.stayCheckoutDate, range));
  const values = [flat.stayAddress, flat.stayCheckinTime, flat.stayEntry, flat.stayContact, flat.stayConfirmation];
  essentials?.data.items.forEach((item, index) => assign(item, "value", values[index]));
}

function migrateTransport(blocks, flat) {
  updateTransport(blocks[0], flat, "outboundFlight", true);
  updateTransport(blocks[1], flat, "outboundBus", false);
  updateTransport(blocks[2], flat, "inboundBus", false);
  updateTransport(blocks[3], flat, "inboundFlight", true);
}

function updateTransport(block, flat, prefix, flight) {
  if (!block) return;
  assign(block.data, "departure", flat[`${prefix}DepartureTime`]);
  assign(block.data, "arrival", flat[`${prefix}ArrivalTime`]);
  assign(block.data, "duration", flat[`${prefix}Duration`]);
  assign(block.data, "origin", flat[`${prefix}Origin`]);
  assign(block.data, "destination", flat[`${prefix}Destination`]);
  assign(block.data, "seats", flat[`${prefix}Seats`]);
  if (flight) assign(block.data, "provider", flat.airline);
  else assign(block.data, "provider", flat.busProvider);
}

function migratePlan(document, plan) {
  if (!Array.isArray(plan.days)) return;
  const saved = document.sections.agenda.find((block) => block.type === "saved-places");
  const range = dateRange(document.meta);
  const days = plan.days.map((item, index) => legacyDay(item, index, range));
  document.sections.agenda = [...days, ...(saved ? [legacySaved(saved, plan.otherPlaces)] : [])];
}

function legacyDay(item, index, range) {
  return {
    id: `agenda-legacy-${index}`,
    type: "day",
    data: {
      date: parseLegacyCalendarDate(item.month, item.date, range),
      title: item.title ?? "Day Plan",
      places: Array.isArray(item.events) ? item.events.map((entry, placeIndex) => legacyPlace(entry, `${index}-${placeIndex}`)) : [],
      meals: legacyMeals(item.meals, index),
      notes: item.notes ?? "",
    },
  };
}

function legacyMeals(meals, dayIndex) {
  return {
    breakfast: legacyFoodOptions(meals?.breakfast, `${dayIndex}-breakfast`),
    lunch: legacyFoodOptions(meals?.lunch, `${dayIndex}-lunch`),
    dinner: legacyFoodOptions(meals?.dinner, `${dayIndex}-dinner`),
  };
}

function legacyFoodOptions(value, suffix) {
  if (typeof value !== "string" || !value) return [];
  return [{
    id: `food-legacy-${suffix}`,
    name: value,
    mapUrl: "",
    websiteUrl: "",
    cover: null,
    priority: "medium",
  }];
}

function legacySaved(block, places) {
  const items = Array.isArray(places) ? places.map((entry, index) => legacyPlace(entry, `saved-${index}`)) : [];
  return { ...block, data: { ...block.data, places: items } };
}

function legacyPlace(entry, suffix) {
  const link = typeof entry.link === "string" ? entry.link : "";
  const mapUrl = isRecognizedMapUrl(link) ? link : "";
  return {
    id: `place-legacy-${suffix}`,
    name: entry.name ?? "Place",
    mapUrl,
    websiteUrl: link && !mapUrl ? link : "",
    image: entry.image ?? "",
    comment: entry.comment ?? "",
    cover: null,
    priority: "medium",
  };
}

function assign(target, key, value) {
  if (target && typeof value === "string" && value) target[key] = value;
}

function dateRange(meta) {
  return { startDate: meta.startDate, endDate: meta.endDate };
}
