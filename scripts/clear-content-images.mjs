import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

const databasePath = resolve(process.argv[2] ?? "data/gramado.sqlite");
const database = new DatabaseSync(databasePath);
const now = Date.now();
let cleared = 0;

database.exec("PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE;");
try {
  const state = database.prepare(`
    SELECT document_json, revision
    FROM document_state
    WHERE singleton = 1
  `).get();
  const document = JSON.parse(state.document_json);
  cleared += clearImageReferences(document);

  database.prepare(`
    INSERT INTO document_backups (revision, schema_version, document_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(state.revision, document.schemaVersion, state.document_json, now);
  database.prepare(`
    UPDATE document_state
    SET document_json = ?, revision = revision + 1, updated_at = ?
    WHERE singleton = 1
  `).run(JSON.stringify(document), now);

  const templates = database.prepare("SELECT id, template_json FROM custom_templates").all();
  const updateTemplate = database.prepare(`
    UPDATE custom_templates
    SET template_json = ?, revision = revision + 1, updated_at = ?
    WHERE id = ?
  `);
  for (const templateRow of templates) {
    const template = JSON.parse(templateRow.template_json);
    const templateCleared = clearImageReferences(template);
    if (!templateCleared) continue;
    cleared += templateCleared;
    updateTemplate.run(JSON.stringify(template), now, templateRow.id);
  }

  database.exec("COMMIT;");
  console.log(JSON.stringify({ database: databasePath, cleared }));
} catch (error) {
  database.exec("ROLLBACK;");
  throw error;
} finally {
  database.close();
}

function clearImageReferences(value) {
  if (!value || typeof value !== "object") return 0;
  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (["cover", "heroCover", "providerCover", "originCover", "destinationCover", "media"].includes(key)) {
      if (child !== null && child !== undefined) count += 1;
      value[key] = null;
      continue;
    }
    if (["image", "imageUrl", "photoUrl", "thumbnailUrl"].includes(key)) {
      if (child) count += 1;
      value[key] = "";
      continue;
    }
    count += clearImageReferences(child);
  }
  return count;
}
