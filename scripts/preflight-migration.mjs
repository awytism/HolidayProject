import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { GramadoStore } from "../src/server/store.mjs";
import { createDefaultDocument } from "../src/shared/default-document.mjs";
import { validateCustomBlock, validateDocument } from "../src/shared/document-schema.mjs";

export async function preflightMigration(databasePath, options = {}) {
  const path = resolve(databasePath);
  refuseLiveDatabase(path, options.liveDatabasePath);
  const beforeHash = await fileHash(path);
  const database = new DatabaseSync(path);
  try {
    const before = snapshot(database);
    const store = new GramadoStore({ database, initialDocument: createDefaultDocument(), now: Date.now() });
    const after = snapshot(database);
    validateDocument(store.getDocument().document);
    validateTemplates(store.listCustomTemplates());
    assertPreserved(before, after);
    return { path, beforeHash, before, after };
  } finally {
    database.close();
  }
}

function refuseLiveDatabase(path, configuredLivePath) {
  const livePath = resolve(configuredLivePath ?? "data/gramado.sqlite");
  if (path === livePath) throw new Error("Preflight refuses the live database; provide a backup copy outside data/");
}

function snapshot(database) {
  const row = database.prepare("SELECT document_json, revision FROM document_state WHERE singleton = 1").get();
  const document = JSON.parse(row.document_json);
  return {
    schemaVersion: document.schemaVersion,
    revision: row.revision,
    blocks: Object.values(document.sections).reduce((total, blocks) => total + blocks.length, 0),
    places: document.sections.agenda.reduce((total, block) => total + (block.data.places?.length ?? 0), 0),
    foodOptions: countFoodOptions(document),
    media: tableCount(database, "media"),
    attachments: tableCount(database, "attachments"),
    templates: tableCount(database, "custom_templates"),
  };
}

function countFoodOptions(document) {
  return document.sections.agenda.reduce((total, block) => {
    if (block.type !== "day") return total;
    return total + Object.values(block.data.meals).reduce((mealTotal, value) => {
      if (Array.isArray(value)) return mealTotal + value.length;
      return mealTotal + (typeof value === "string" && value ? 1 : 0);
    }, 0);
  }, 0);
}

function tableCount(database, table) {
  const exists = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return exists ? database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count : 0;
}

function validateTemplates(templates) {
  for (const item of templates) validateCustomBlock(item.template.block, item.template.sectionScope);
}

function assertPreserved(before, after) {
  for (const field of ["blocks", "places", "foodOptions", "media", "attachments", "templates"]) {
    if (before[field] !== after[field]) throw new Error(`Migration changed ${field}: ${before[field]} -> ${after[field]}`);
  }
}

async function fileHash(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = argumentValue("--database");
  if (!databasePath) throw new Error("Usage: node scripts/preflight-migration.mjs --database /path/to/backup.sqlite");
  console.log(JSON.stringify(await preflightMigration(databasePath), null, 2));
}
