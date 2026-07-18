import { DatabaseSync } from "node:sqlite";
import { FAILURE_WINDOW_MS, LOCKOUT_MS } from "./config.mjs";
import { migrateCustomBlock, migrateDocument } from "../shared/document-migrations.mjs";

export const MAX_ANONYMOUS_SESSIONS = 1_000;

export class GramadoStore {
  constructor(options) {
    this.database = options.database ?? new DatabaseSync(options.dbPath);
    this.ownsDatabase = !options.database;
    this.initialize(options.initialDocument, options.now);
  }

  initialize(initialDocument, now) {
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS document_state (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        document_json TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS document_backups (
        id INTEGER PRIMARY KEY,
        revision INTEGER NOT NULL,
        schema_version INTEGER NOT NULL,
        document_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        authenticated INTEGER NOT NULL CHECK (authenticated IN (0, 1)),
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS sessions_auth_created
        ON sessions (authenticated, created_at);

      CREATE TABLE IF NOT EXISTS login_failures (
        id INTEGER PRIMARY KEY,
        ip_hash TEXT NOT NULL,
        failed_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS login_failures_ip_time
        ON login_failures (ip_hash, failed_at);

      CREATE INDEX IF NOT EXISTS login_failures_time
        ON login_failures (failed_at);

      CREATE TABLE IF NOT EXISTS login_lockouts (
        ip_hash TEXT PRIMARY KEY,
        locked_until INTEGER NOT NULL
      ) STRICT;


      CREATE INDEX IF NOT EXISTS login_lockouts_time
        ON login_lockouts (locked_until);

      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL CHECK (content_type = 'image/webp'),
        byte_size INTEGER NOT NULL CHECK (byte_size > 0),
        width INTEGER NOT NULL CHECK (width > 0),
        height INTEGER NOT NULL CHECK (height > 0),
        state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'staged')),
        created_at INTEGER NOT NULL,
        staged_at INTEGER
      ) STRICT;

      CREATE INDEX IF NOT EXISTS media_state_staged
        ON media (state, staged_at);

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        section TEXT NOT NULL CHECK (section IN ('transport', 'stay', 'agenda')),
        block_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL CHECK (byte_size > 0),
        preview_kind TEXT CHECK (preview_kind IS NULL OR preview_kind IN ('pdf', 'image', 'text', 'audio', 'video')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS attachments_block
        ON attachments (section, block_id, created_at, id);

      CREATE TABLE IF NOT EXISTS custom_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE,
        name_key TEXT NOT NULL UNIQUE,
        template_json TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS custom_templates_name
        ON custom_templates (name COLLATE NOCASE, id);
    `);
    this.database.prepare(`
      INSERT OR IGNORE INTO document_state
        (singleton, document_json, revision, updated_at)
      VALUES (1, ?, 1, ?)
    `).run(JSON.stringify(initialDocument), now);
    this.migrateStoredDocument(now);
  }

  migrateStoredDocument(now) {
    this.runTransaction(() => {
      const state = this.getDocument();
      const sourceVersion = state.document.schemaVersion;
      const migrated = migrateDocument(state.document);
      if (migrated.schemaVersion === sourceVersion) return;
      this.database.prepare(`
        INSERT INTO document_backups (revision, schema_version, document_json, created_at)
        VALUES (?, ?, ?, ?)
      `).run(state.revision, state.document.schemaVersion, JSON.stringify(state.document), now);
      this.database.prepare(`
        UPDATE document_state SET document_json = ?, revision = revision + 1, updated_at = ?
        WHERE singleton = 1
      `).run(JSON.stringify(migrated), now);
      this.migrateStoredTemplates({ sourceVersion, range: migrated.meta, now });
      this.database.prepare(`
        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)
      `).run(migrated.schemaVersion, now);
    });
  }

  migrateStoredTemplates(options) {
    const rows = this.database.prepare("SELECT id, template_json FROM custom_templates").all();
    const update = this.database.prepare(`
      UPDATE custom_templates
      SET template_json = ?, revision = revision + 1, updated_at = ?
      WHERE id = ?
    `);
    for (const row of rows) {
      const template = JSON.parse(row.template_json);
      if (!template?.block) continue;
      const block = migrateCustomBlock(template.block, options);
      const templateJson = JSON.stringify({ ...template, block });
      if (templateJson !== row.template_json) update.run(templateJson, options.now, row.id);
    }
  }

  getDocument() {
    const row = this.database.prepare(`
      SELECT document_json, revision, updated_at
      FROM document_state WHERE singleton = 1
    `).get();
    return {
      document: JSON.parse(row.document_json),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  }

  updateDocument(documentJson, expectedRevision, now) {
    const result = this.database.prepare(`
      UPDATE document_state
      SET document_json = ?, revision = revision + 1, updated_at = ?
      WHERE singleton = 1 AND revision = ?
    `).run(documentJson, now, expectedRevision);
    if (result.changes === 1) return { updated: true, state: this.getDocument() };
    return { updated: false, state: this.getDocument() };
  }

  getSession(tokenHash, now) {
    const row = this.database.prepare(`
      SELECT authenticated, created_at, expires_at
      FROM sessions WHERE token_hash = ? AND expires_at > ?
    `).get(tokenHash, now);
    if (row) return mapSession(row);
    this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }

  createSession(session) {
    this.database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(session.now);
    this.database.prepare(`
      INSERT INTO sessions (token_hash, authenticated, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(session.tokenHash, Number(session.authenticated), session.now, session.expiresAt);
    this.database.prepare(`
      DELETE FROM sessions WHERE token_hash IN (
        SELECT token_hash FROM sessions
        WHERE authenticated = 0 AND token_hash <> ?
        ORDER BY created_at DESC, token_hash DESC
        LIMIT -1 OFFSET ?
      )
    `).run(session.tokenHash, MAX_ANONYMOUS_SESSIONS - 1);
  }

  replaceSession(previousTokenHash, session) {
    this.runTransaction(() => {
      const removed = this.database.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .run(previousTokenHash);
      if (removed.changes !== 1) throw new Error("Session is no longer valid");
      this.createSession(session);
    });
  }

  deleteSession(tokenHash) {
    this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }

  getActiveLockout(ipHash, now) {
    this.database.prepare("DELETE FROM login_lockouts WHERE locked_until <= ?").run(now);
    const row = this.database.prepare(`
      SELECT locked_until FROM login_lockouts WHERE ip_hash = ?
    `).get(ipHash);
    return row?.locked_until ?? null;
  }

  recordFailedLogin(ipHash, now) {
    return this.runTransaction(() => {
      const activeLockout = this.database.prepare(`
        SELECT locked_until FROM login_lockouts
        WHERE ip_hash = ? AND locked_until > ?
      `).get(ipHash, now);
      if (activeLockout) {
        return { locked: true, failures: 3, lockedUntil: activeLockout.locked_until };
      }
      const windowStart = now - FAILURE_WINDOW_MS;
      this.database.prepare("DELETE FROM login_failures WHERE failed_at <= ?").run(windowStart);
      this.database.prepare("DELETE FROM login_lockouts WHERE locked_until <= ?").run(now);
      this.database.prepare(`
        INSERT INTO login_failures (ip_hash, failed_at) VALUES (?, ?)
      `).run(ipHash, now);
      const row = this.database.prepare(`
        SELECT COUNT(*) AS failures FROM login_failures WHERE ip_hash = ?
      `).get(ipHash);
      if (row.failures < 3) return { locked: false, failures: row.failures };
      return this.createLockout(ipHash, now);
    });
  }

  createLockout(ipHash, now) {
    const lockedUntil = now + LOCKOUT_MS;
    this.database.prepare(`
      INSERT INTO login_lockouts (ip_hash, locked_until) VALUES (?, ?)
      ON CONFLICT (ip_hash) DO UPDATE SET locked_until = excluded.locked_until
    `).run(ipHash, lockedUntil);
    this.database.prepare("DELETE FROM login_failures WHERE ip_hash = ?").run(ipHash);
    return { locked: true, failures: 3, lockedUntil };
  }

  clearLoginFailures(ipHash) {
    this.database.prepare("DELETE FROM login_failures WHERE ip_hash = ?").run(ipHash);
    this.database.prepare("DELETE FROM login_lockouts WHERE ip_hash = ?").run(ipHash);
  }

  createMedia(media) {
    this.database.prepare(`
      INSERT INTO media (id, content_type, byte_size, width, height, created_at)
      VALUES (?, 'image/webp', ?, ?, ?, ?)
    `).run(media.id, media.byteSize, media.width, media.height, media.createdAt);
    return this.getMedia(media.id);
  }

  getMedia(id) {
    const row = this.database.prepare(`
      SELECT id, content_type, byte_size, width, height, state, created_at, staged_at
      FROM media WHERE id = ?
    `).get(id);
    return row ? mapMedia(row) : null;
  }

  stageMediaDeletion(id, now) {
    const result = this.database.prepare(`
      UPDATE media SET state = 'staged', staged_at = ?
      WHERE id = ? AND state = 'active'
    `).run(now, id);
    return result.changes === 1;
  }

  listStagedMedia(limit) {
    return this.database.prepare(`
      SELECT id, content_type, byte_size, width, height, state, created_at, staged_at
      FROM media WHERE state = 'staged'
      ORDER BY staged_at, id LIMIT ?
    `).all(limit).map(mapMedia);
  }

  listActiveMediaBefore(before, limit) {
    return this.database.prepare(`
      SELECT id, content_type, byte_size, width, height, state, created_at, staged_at
      FROM media WHERE state = 'active' AND created_at <= ?
      ORDER BY created_at ASC LIMIT ?
    `).all(before, limit).map(mapMedia);
  }

  restoreMedia(id) {
    this.database.prepare(`
      UPDATE media SET state = 'active', staged_at = NULL
      WHERE id = ? AND state = 'staged'
    `).run(id);
  }

  deleteStagedMedia(id) {
    return this.database.prepare("DELETE FROM media WHERE id = ? AND state = 'staged'").run(id).changes === 1;
  }

  isMediaReferenced(id) {
    const document = this.database.prepare("SELECT document_json FROM document_state WHERE singleton = 1").get();
    if (document.document_json.includes(id)) return true;
    const templates = this.database.prepare("SELECT template_json FROM custom_templates").all();
    return templates.some((row) => row.template_json.includes(id));
  }

  createAttachment(attachment) {
    this.database.prepare(`
      INSERT INTO attachments
        (id, section, block_id, name, content_type, byte_size, preview_kind, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attachment.id,
      attachment.section,
      attachment.blockId,
      attachment.name,
      attachment.contentType,
      attachment.byteSize,
      attachment.previewKind,
      attachment.now,
      attachment.now,
    );
    return this.getAttachment(attachment.id);
  }

  getAttachment(id) {
    const row = this.database.prepare(`
      SELECT id, section, block_id, name, content_type, byte_size, preview_kind, created_at, updated_at
      FROM attachments WHERE id = ?
    `).get(id);
    return row ? mapAttachment(row) : null;
  }

  listAttachments(section) {
    return this.database.prepare(`
      SELECT id, section, block_id, name, content_type, byte_size, preview_kind, created_at, updated_at
      FROM attachments WHERE section = ? ORDER BY created_at, id
    `).all(section).map(mapAttachment);
  }

  attachmentStorageBytes() {
    return this.database.prepare("SELECT COALESCE(SUM(byte_size), 0) AS total FROM attachments").get().total;
  }

  renameAttachment(id, name, now) {
    const result = this.database.prepare(`
      UPDATE attachments SET name = ?, updated_at = ? WHERE id = ?
    `).run(name, now, id);
    return result.changes === 1 ? this.getAttachment(id) : null;
  }

  replaceAttachment(id, replacement) {
    const result = this.database.prepare(`
      UPDATE attachments
      SET name = ?, content_type = ?, byte_size = ?, preview_kind = ?, updated_at = ?
      WHERE id = ?
    `).run(
      replacement.name,
      replacement.contentType,
      replacement.byteSize,
      replacement.previewKind,
      replacement.now,
      id,
    );
    return result.changes === 1 ? this.getAttachment(id) : null;
  }

  deleteAttachment(id) {
    return this.database.prepare("DELETE FROM attachments WHERE id = ?").run(id).changes === 1;
  }

  deleteAttachmentsForBlocks(blocks) {
    if (!blocks.length) return [];
    return this.runTransaction(() => blocks.flatMap(({ section, blockId }) => {
      const rows = this.database.prepare(`
        SELECT id, section, block_id, name, content_type, byte_size, preview_kind, created_at, updated_at
        FROM attachments WHERE section = ? AND block_id = ?
      `).all(section, blockId).map(mapAttachment);
      this.database.prepare("DELETE FROM attachments WHERE section = ? AND block_id = ?").run(section, blockId);
      return rows;
    }));
  }

  listCustomTemplates() {
    return this.database.prepare(`
      SELECT id, name, template_json, revision, created_at, updated_at
      FROM custom_templates ORDER BY name COLLATE NOCASE, id
    `).all().map(mapTemplate);
  }

  getCustomTemplate(id) {
    const row = this.database.prepare(`
      SELECT id, name, template_json, revision, created_at, updated_at
      FROM custom_templates WHERE id = ?
    `).get(id);
    return row ? mapTemplate(row) : null;
  }

  createCustomTemplate(template) {
    this.database.prepare(`
      INSERT INTO custom_templates
        (id, name, name_key, template_json, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(template.id, template.name, template.nameKey, template.templateJson, template.now, template.now);
    return this.getCustomTemplate(template.id);
  }

  updateCustomTemplate(template) {
    const result = this.database.prepare(`
      UPDATE custom_templates
      SET name = ?, name_key = ?, template_json = ?, revision = revision + 1, updated_at = ?
      WHERE id = ? AND revision = ?
    `).run(
      template.name,
      template.nameKey,
      template.templateJson,
      template.now,
      template.id,
      template.revision,
    );
    return { updated: result.changes === 1, current: this.getCustomTemplate(template.id) };
  }

  deleteCustomTemplate(id, revision) {
    const result = this.database.prepare(`
      DELETE FROM custom_templates WHERE id = ? AND revision = ?
    `).run(id, revision);
    return { deleted: result.changes === 1, current: this.getCustomTemplate(id) };
  }

  runTransaction(operation) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    if (this.ownsDatabase) this.database.close();
  }
}

function mapSession(row) {
  return {
    authenticated: row.authenticated === 1,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapMedia(row) {
  return {
    id: row.id,
    contentType: row.content_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    state: row.state,
    createdAt: row.created_at,
    stagedAt: row.staged_at,
  };
}

function mapTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    template: JSON.parse(row.template_json),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttachment(row) {
  return {
    id: row.id,
    section: row.section,
    blockId: row.block_id,
    name: row.name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    previewKind: row.preview_kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
