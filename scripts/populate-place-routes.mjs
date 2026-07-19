import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { AGENDA_PLACE_DETAILS } from "../src/shared/default-document.mjs";
import { migrateDocument } from "../src/shared/document-migrations.mjs";
import { validateDocument } from "../src/shared/document-schema.mjs";
import { formatDurationUnits } from "../src/shared/duration-utils.mjs";

const ROUTE_FIELDS = Object.freeze([
  "drivingDistance",
  "drivingTime",
  "cyclingDistance",
  "cyclingTime",
  "walkingDistance",
  "walkingTime",
]);
const HOUSE_ROUTE = Object.freeze(Object.fromEntries(ROUTE_FIELDS.map((field) => [field, "0"])));

export function populatePlaceRoutes(databasePath) {
  const database = new DatabaseSync(resolve(databasePath));
  try {
    const row = database.prepare(`
      SELECT document_json, revision FROM document_state WHERE singleton = 1
    `).get();
    const document = migrateDocument(JSON.parse(row.document_json));
    const result = updateAgenda(document);
    validateDocument(document);
    if (!result.updated) return { ...result, revision: row.revision };
    const update = database.prepare(`
      UPDATE document_state
      SET document_json = ?, revision = revision + 1, updated_at = ?
      WHERE singleton = 1 AND revision = ?
    `).run(JSON.stringify(document), Date.now(), row.revision);
    if (update.changes !== 1) throw new Error("The trip changed while distances were being populated");
    return { ...result, revision: row.revision + 1 };
  } finally {
    database.close();
  }
}

function updateAgenda(document) {
  const missing = new Set();
  let updated = 0;
  let populated = 0;
  for (const block of document.sections.agenda) {
    for (const entry of routeEntries(block)) {
      const result = updateEntry(entry, missing);
      updated += result.updated;
      populated += result.populated;
    }
  }
  if (missing.size) throw new Error(`Missing route data for: ${[...missing].join(", ")}`);
  return { updated, populated, complete: true };
}

function routeEntries(block) {
  const places = block.data.places ?? [];
  if (block.type !== "day") return places;
  const meals = Object.values(block.data.meals ?? {}).flat();
  return [...places, ...meals.filter((entry) => String(entry.name ?? "").trim())];
}

function updateEntry(entry, missing) {
  const name = String(entry.name ?? "").trim();
  const route = routeForName(name);
  if (!route) {
    if (name) missing.add(name);
    return { updated: 0, populated: 0 };
  }
  let changed = false;
  for (const field of ROUTE_FIELDS) {
    if (entry[field] === route[field]) continue;
    entry[field] = route[field];
    changed = true;
  }
  return { updated: Number(changed), populated: 1 };
}

function routeForName(name) {
  if (isHouse(name)) return HOUSE_ROUTE;
  const details = AGENDA_PLACE_DETAILS[name];
  if (!details) return null;
  return {
    drivingDistance: details.drivingDistance,
    drivingTime: formatDurationUnits(details.drivingTime),
    cyclingDistance: details.cyclingDistance,
    cyclingTime: formatDurationUnits(details.cyclingTime),
    walkingDistance: details.walkingDistance,
    walkingTime: formatDurationUnits(details.walkingTime),
  };
}

function isHouse(name) {
  const normalized = name.toLocaleLowerCase("pt-BR").replace(/[\uFE0E\uFE0F]/g, "");
  return normalized === "casa do sol" || normalized === "casa sol da serra" || normalized.startsWith("🏠");
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = argumentValue("--database") || "data/gramado.sqlite";
  console.log(JSON.stringify(populatePlaceRoutes(databasePath), null, 2));
}
