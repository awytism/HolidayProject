import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { placeholderizeDocument } from "../src/shared/placeholder-document.mjs";
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
  const placeholderDocument = placeholderizeDocument(document);
  placeholderDocument.sections.transport = placeholderDocument.sections.transport.filter((block) => block.type === "flight");
  validateDocument(placeholderDocument);
  const placeholderJson = JSON.stringify(placeholderDocument);

  if (placeholderJson === state.document_json) {
    console.log(`Document revision ${state.revision} already contains placeholders.`);
    process.exitCode = 0;
  } else {
    const now = Date.now();
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare(`
        INSERT INTO document_backups (revision, schema_version, document_json, created_at)
        VALUES (?, ?, ?, ?)
      `).run(state.revision, document.schemaVersion, state.document_json, now);
      database.prepare(`
        UPDATE document_state
        SET document_json = ?, revision = revision + 1, updated_at = ?
        WHERE singleton = 1 AND revision = ?
      `).run(placeholderJson, now, state.revision);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    console.log(`Replaced live content with placeholders at revision ${state.revision + 1}.`);
  }
} finally {
  database.close();
}
