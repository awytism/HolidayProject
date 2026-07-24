import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripDocumentImages } from "../src/shared/document-images.mjs";
import { validateDocument } from "../src/shared/document-schema.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = resolve(projectRoot, process.env.GRAMADO_DB_PATH ?? "data/gramado.sqlite");
const database = new DatabaseSync(databasePath);

try {
  database.exec("PRAGMA busy_timeout = 5000");
  const state = database.prepare(`
    SELECT document_json, revision
    FROM document_state
    WHERE singleton = 1
  `).get();
  if (!state) throw new Error("The live travel document was not found.");

  const document = JSON.parse(state.document_json);
  const imageFreeDocument = stripDocumentImages(document);
  validateDocument(imageFreeDocument);
  const imageFreeJson = JSON.stringify(imageFreeDocument);

  if (imageFreeJson === state.document_json) {
    console.log(`Document revision ${state.revision} already contains no images.`);
    process.exitCode = 0;
  } else {
    updateDocument(database, state, document.schemaVersion, imageFreeJson);
    console.log(`Removed live document images at revision ${state.revision + 1}.`);
  }
} finally {
  database.close();
}

function updateDocument(database, state, schemaVersion, documentJson) {
  const now = Date.now();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      INSERT INTO document_backups (revision, schema_version, document_json, created_at)
      VALUES (?, ?, ?, ?)
    `).run(state.revision, schemaVersion, state.document_json, now);
    const update = database.prepare(`
      UPDATE document_state
      SET document_json = ?, revision = revision + 1, updated_at = ?
      WHERE singleton = 1 AND revision = ?
    `).run(documentJson, now, state.revision);
    if (update.changes !== 1) throw new Error("The live document changed during image removal.");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
