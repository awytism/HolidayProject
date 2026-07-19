import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { mealCuisineDescription } from "../src/shared/meal-cuisines.mjs";
import { placeDescription } from "../src/shared/place-descriptions.mjs";
import { migrateDocument } from "../src/shared/document-migrations.mjs";
import { validateDocument } from "../src/shared/document-schema.mjs";

export function populatePlaceDescriptions(databasePath) {
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
    if (update.changes !== 1) throw new Error("The trip changed while descriptions were being populated");
    return { ...result, revision: row.revision + 1 };
  } finally {
    database.close();
  }
}

function updateAgenda(document) {
  const missingPlaces = new Set();
  const missingMeals = new Set();
  let updated = 0;
  for (const block of document.sections.agenda) {
    updated += updateEntries(block.data.places ?? [], placeDescription, missingPlaces);
    updated += updateEntries(mealEntries(block), mealCuisineDescription, missingMeals);
  }
  if (missingPlaces.size) throw new Error(`Missing place descriptions for: ${[...missingPlaces].join(", ")}`);
  if (missingMeals.size) throw new Error(`Missing meal cuisines for: ${[...missingMeals].join(", ")}`);
  return { updated, complete: true };
}

function mealEntries(block) {
  if (block.type !== "day") return [];
  return Object.values(block.data.meals).flat().filter((entry) => String(entry.name ?? "").trim());
}

function updateEntries(entries, descriptionForName, missing) {
  return entries.reduce((total, entry) => total + updateEntry(entry, descriptionForName, missing), 0);
}

function updateEntry(entry, descriptionForName, missing) {
  const description = descriptionForName(entry.name);
  if (!description) {
    if (String(entry.name ?? "").trim()) missing.add(entry.name);
    return 0;
  }
  if (entry.comment === description) return 0;
  entry.comment = description;
  return 1;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = argumentValue("--database") || "data/gramado.sqlite";
  console.log(JSON.stringify(populatePlaceDescriptions(databasePath), null, 2));
}
