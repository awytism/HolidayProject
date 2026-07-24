import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { GramadoStore } from "../../src/server/store.mjs";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { formatAgendaDate, formatDateRange, formatFullDate } from "../../src/shared/date-utils.mjs";

test("backs up and atomically migrates a persisted v2 document", (context) => {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  const v2 = legacyDocument();
  database.exec(`
    CREATE TABLE document_state (singleton INTEGER PRIMARY KEY, document_json TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL) STRICT;
    CREATE TABLE attachments (
      id TEXT PRIMARY KEY,
      section TEXT NOT NULL CHECK (section IN ('transport', 'stay', 'agenda')),
      block_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size > 0),
      preview_kind TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;    CREATE TABLE custom_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      name_key TEXT NOT NULL UNIQUE,
      template_json TEXT NOT NULL,
      revision INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
  `);
  database.prepare("INSERT INTO document_state VALUES (1, ?, 2, 100)").run(JSON.stringify(v2));
  database.prepare("INSERT INTO attachments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "legacy-places-attachment", "agenda", "agenda-saved-places", "places.txt", "text/plain", 10, "text", 100, 100,
  );
  database.prepare("INSERT INTO custom_templates VALUES (?, ?, ?, ?, 1, 90, 90)").run(
    "legacy-day-template",
    "Legacy day",
    "legacy day",
    JSON.stringify({ sectionScope: "agenda", block: v2.sections.agenda[0] }),
  );
  const store = new GramadoStore({ database, initialDocument: createDefaultDocument(), now: 200 });
  const state = store.getDocument();
  assert.equal(state.document.schemaVersion, 15);
  assert.equal(state.revision, 3);
  const backup = database.prepare("SELECT revision, schema_version, document_json FROM document_backups").get();
  assert.equal(backup.revision, 2);
  assert.equal(backup.schema_version, 2);
  assert.deepEqual(JSON.parse(backup.document_json), v2);
  assert.deepEqual({ ...database.prepare("SELECT version, applied_at FROM schema_migrations").get() }, {
    version: 15,
    applied_at: 200,
  });
  assert.equal(database.prepare("SELECT section FROM attachments WHERE id = 'legacy-places-attachment'").get().section, "places");
  assert.match(database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attachments'").get().sql, /'places'/);
  const template = database.prepare("SELECT template_json, revision, updated_at FROM custom_templates").get();
  const templateBlock = JSON.parse(template.template_json).block;
  assert.equal(templateBlock.data.date, "2026-10-24");
  assert.equal("month" in templateBlock.data, false);
  assert.deepEqual({ revision: template.revision, updatedAt: template.updated_at }, { revision: 2, updatedAt: 200 });
});

test("rolls back the backup and preserves the v2 source when migration update fails", (context) => {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  const v2Json = JSON.stringify(legacyDocument());
  database.exec(`
    CREATE TABLE document_state (
      singleton INTEGER PRIMARY KEY,
      document_json TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TRIGGER reject_document_update BEFORE UPDATE ON document_state
    BEGIN
      SELECT RAISE(ABORT, 'document update failed');
    END;
  `);
  database.prepare("INSERT INTO document_state VALUES (1, ?, 2, 100)").run(v2Json);

  assert.throws(() => new GramadoStore({
    database,
    initialDocument: createDefaultDocument(),
    now: 200,
  }), /document update failed/);
  assert.deepEqual({
    ...database.prepare("SELECT document_json, revision, updated_at FROM document_state").get(),
  }, {
    document_json: v2Json,
    revision: 2,
    updated_at: 100,
  });
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM document_backups").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 0);
});

function legacyDocument() {
  const document = createDefaultDocument();
  document.meta.dates = formatDateRange(document.meta.startDate, document.meta.endDate);
  delete document.meta.startDate;
  delete document.meta.endDate;
  document.sections.transport.forEach((block) => { block.data.date = formatFullDate(block.data.date); });
  const staySummary = document.sections.stay.find((block) => block.type === "stay-summary");
  staySummary.data.checkin = formatFullDate(staySummary.data.checkin);
  staySummary.data.checkout = formatFullDate(staySummary.data.checkout);
  document.sections.agenda.filter((block) => block.type === "day").forEach((block) => {
    const calendar = formatAgendaDate(block.data.date);
    block.data.month = calendar.month;
    block.data.date = calendar.day;
    block.data.weekday = calendar.weekday;
  });
  document.schemaVersion = 2;
  document.sections.agenda.push(...document.sections.places);
  delete document.sections.places;
  for (const blocks of Object.values(document.sections)) blocks.forEach((block) => { delete block.cover; });
  document.sections.agenda.forEach((block) => block.data.places?.forEach((place) => { delete place.cover; }));
  document.sections.stay = document.sections.stay.filter((block) => block.type !== "stay-anatomy");
  const amenities = document.sections.stay.find((block) => block.type === "stay-amenities");
  amenities.type = "amenities";
  amenities.data = { title: amenities.data.title, items: ["Hot tub", "Bikes"] };
  return document;
}
