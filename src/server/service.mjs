import { loadConfig, SESSION_TTL_MS } from "./config.mjs";
import {
  csrfTokenForSession,
  hashSessionToken,
  newOpaqueToken,
  secureStringEqual,
  verifyScryptPassword,
} from "./security.mjs";
import { GramadoStore } from "./store.mjs";
import { MediaInputError, MediaStorage } from "./media.mjs";
import { AttachmentInputError, AttachmentStorage, detectPreviewKind } from "./attachments.mjs";
import { validateCustomBlock, validateDocument } from "../shared/document-schema.mjs";

const INVALID_PASSWORD = "\0invalid-password-input";
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TEMPLATE_NAME_CONTROLS = /[\u0000-\u001f\u007f]/;
const ATTACHMENT_NAME_CONTROLS = /[\u0000-\u001f\u007f]/;
const ORPHAN_MEDIA_AGE_MS = 24 * 60 * 60 * 1000;

export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createGramadoService(options = {}) {
  const config = loadConfig(options.config, options.env);
  const store = options.store ?? new GramadoStore({
    database: options.database,
    dbPath: config.dbPath,
    initialDocument: config.initialDocument,
    now: config.clock(),
  });
  const mediaStorage = options.mediaStorage ?? new MediaStorage({
    uploadDir: config.uploadDir,
    maxBytes: config.maxMediaBytes,
    maxPixels: config.maxMediaPixels,
    sharp: options.sharp,
  });
  const attachmentStorage = options.attachmentStorage ?? new AttachmentStorage({
    directory: config.attachmentDir,
    maxBytes: config.maxAttachmentBytes,
  });
  return new GramadoService(config, store, {
    mediaStorage,
    attachmentStorage,
    referenceChecker: options.referenceChecker,
  });
}

export class GramadoService {
  constructor(config, store, runtime = {}) {
    this.config = config;
    this.store = store;
    this.mediaStorage = runtime.mediaStorage;
    this.attachmentStorage = runtime.attachmentStorage;
    this.referenceChecker = runtime.referenceChecker ?? ((id) => this.store.isMediaReferenced(id));
  }

  getDocument() {
    return presentDocument(this.store.getDocument());
  }

  async updateDocument(input) {
    this.requireSession(input.sessionToken, true);
    this.assertCsrf(input.sessionToken, input.csrfToken);
    const documentJson = serializeDocument(input.document, this.config.maxDocumentBytes);
    if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
      throw new ApiError(400, "invalid_revision", "revision must be a positive integer");
    }

    const previous = this.store.getDocument().document;
    const result = this.store.updateDocument(documentJson, input.revision, this.config.clock());
    if (!result.updated) {
      throw new ApiError(409, "revision_conflict", "The document has changed", {
        currentRevision: result.state.revision,
      });
    }
    const removed = removedBlocks(previous, input.document);
    const attachments = this.store.deleteAttachmentsForBlocks(removed);
    await Promise.allSettled(attachments.map((attachment) => this.attachmentStorage.remove(attachment.id)));
    return presentDocument(result.state);
  }

  getSessionState(sessionToken) {
    const existing = this.findSession(sessionToken);
    if (existing) return this.presentSession(sessionToken, existing, false);
    return this.issueSession(false);
  }

  enableEditing(input) {
    this.requireSession(input.sessionToken, false);
    this.assertCsrf(input.sessionToken, input.csrfToken);
    return this.rotateSession(input.sessionToken, true, this.config.clock());
  }

  async login(input) {
    this.requireSession(input.sessionToken, false);
    this.assertCsrf(input.sessionToken, input.csrfToken);
    const validInput = isAcceptablePassword(input.password);
    const candidate = validInput ? input.password : INVALID_PASSWORD;
    const matches = await verifyScryptPassword(candidate, this.config.passwordHash);
    const completedAt = this.config.clock();
    if (!validInput || !matches) throw new ApiError(401, "invalid_credentials", "Invalid credentials");
    return this.rotateSession(input.sessionToken, true, completedAt);
  }

  logout(input) {
    this.requireSession(input.sessionToken, true);
    this.assertCsrf(input.sessionToken, input.csrfToken);
    this.store.deleteSession(this.sessionHash(input.sessionToken));
  }

  async uploadMedia(input) {
    this.requireMutation(input);
    const contentType = normalizeContentType(input.contentType);
    let image;
    try {
      image = await this.mediaStorage.process(input.bytes, contentType);
    } catch (error) {
      if (error instanceof MediaInputError) throw new ApiError(error.status, error.code, error.message);
      throw error;
    }
    return this.persistMedia(image);
  }

  async persistMedia(image) {
    const id = newOpaqueToken();
    await this.mediaStorage.write(id, image.bytes);
    try {
      const media = this.store.createMedia({
        id,
        byteSize: image.bytes.length,
        width: image.width,
        height: image.height,
        createdAt: this.config.clock(),
      });
      return presentMedia(media);
    } catch (error) {
      await this.mediaStorage.remove(id).catch(() => {});
      throw error;
    }
  }

  async readMedia(id) {
    assertOpaqueId(id, "media_not_found", "Media was not found");
    const media = this.store.getMedia(id);
    if (!media) throw new ApiError(404, "media_not_found", "Media was not found");
    try {
      return { media: presentMedia(media), bytes: await this.mediaStorage.read(id) };
    } catch (error) {
      if (error?.code === "ENOENT") throw new ApiError(404, "media_not_found", "Media was not found");
      throw error;
    }
  }

  async deleteMedia(input) {
    this.requireMutation(input);
    assertOpaqueId(input.id, "media_not_found", "Media was not found");
    const media = this.store.getMedia(input.id);
    if (!media) throw new ApiError(404, "media_not_found", "Media was not found");
    if (await this.referenceChecker(input.id)) {
      throw new ApiError(409, "media_in_use", "Media is still referenced");
    }
    if (media.state === "active") this.store.stageMediaDeletion(input.id, this.config.clock());
    return { id: input.id, status: "staged" };
  }

  async cleanupStagedMedia(options = {}) {
    const limit = normalizeCleanupLimit(options.limit);
    const staged = this.store.listStagedMedia(limit);
    const result = { removed: [], restored: [], failed: [] };
    for (const media of staged) await this.cleanupMedia(media, result);
    const before = this.config.clock() - ORPHAN_MEDIA_AGE_MS;
    const candidates = this.store.listActiveMediaBefore(before, limit);
    for (const media of candidates) await this.cleanupOrphan(media, result);
    return result;
  }

  async cleanupOrphan(media, result) {
    try {
      if (await this.referenceChecker(media.id)) return;
      this.store.stageMediaDeletion(media.id, this.config.clock());
      await this.cleanupMedia(media, result);
    } catch { result.failed.push(media.id); }
  }

  async cleanupMedia(media, result) {
    try {
      if (await this.referenceChecker(media.id)) {
        this.store.restoreMedia(media.id);
        result.restored.push(media.id);
        return;
      }
      await this.mediaStorage.remove(media.id);
      this.store.deleteStagedMedia(media.id);
      result.removed.push(media.id);
    } catch {
      result.failed.push(media.id);
    }
  }

  listAttachments(input) {
    this.requireSession(input.sessionToken, true);
    const section = normalizeSection(input.section);
    const attachments = this.store.listAttachments(section).map(presentAttachment);
    return {
      attachments,
      storage: {
        usedBytes: this.store.attachmentStorageBytes(),
        maximumBytes: this.config.maxAttachmentStorageBytes,
      },
    };
  }

  async uploadAttachment(input) {
    this.requireMutation(input);
    const target = this.normalizeAttachmentTarget(input);
    const file = this.normalizeAttachmentFile(input);
    this.assertAttachmentQuota(file.bytes.length);
    const id = newOpaqueToken();
    await this.attachmentStorage.write(id, file.bytes);
    try {
      return presentAttachment(this.store.createAttachment({
        id,
        ...target,
        ...file,
        byteSize: file.bytes.length,
        previewKind: detectPreviewKind(file.bytes, file.contentType),
        now: this.config.clock(),
      }));
    } catch (error) {
      await this.attachmentStorage.remove(id).catch(() => {});
      throw error;
    }
  }

  renameAttachment(input) {
    this.requireMutation(input);
    const attachment = this.requireAttachment(input.id);
    const renamed = this.store.renameAttachment(attachment.id, normalizeAttachmentName(input.name), this.config.clock());
    return presentAttachment(renamed);
  }

  async replaceAttachment(input) {
    this.requireMutation(input);
    const attachment = this.requireAttachment(input.id);
    const file = this.normalizeAttachmentFile(input);
    this.assertAttachmentQuota(file.bytes.length - attachment.byteSize);
    await this.attachmentStorage.write(attachment.id, file.bytes);
    const replaced = this.store.replaceAttachment(attachment.id, {
      ...file,
      byteSize: file.bytes.length,
      previewKind: detectPreviewKind(file.bytes, file.contentType),
      now: this.config.clock(),
    });
    return presentAttachment(replaced);
  }

  async readAttachment(input) {
    this.requireSession(input.sessionToken, true);
    return this.loadAttachment(input.id);
  }

  async downloadAttachment(input) {
    this.requireSession(input.sessionToken, false);
    this.assertCsrf(input.sessionToken, input.csrfToken);
    const validInput = isAcceptablePassword(input.password);
    const candidate = validInput ? input.password : INVALID_PASSWORD;
    const matches = await verifyScryptPassword(candidate, this.config.attachmentDownloadPasswordHash);
    if (!validInput || !matches) {
      throw new ApiError(403, "invalid_attachment_password", "The attachment password is incorrect");
    }
    return this.loadAttachment(input.id);
  }

  async loadAttachment(id) {
    const attachment = this.requireAttachment(id);
    try {
      return { attachment: presentAttachment(attachment), bytes: await this.attachmentStorage.read(attachment.id) };
    } catch (error) {
      if (error?.code === "ENOENT") throw new ApiError(404, "attachment_not_found", "Attachment was not found");
      throw error;
    }
  }

  async deleteAttachment(input) {
    this.requireMutation(input);
    const attachment = this.requireAttachment(input.id);
    this.store.deleteAttachment(attachment.id);
    await this.attachmentStorage.remove(attachment.id);
  }

  normalizeAttachmentTarget(input) {
    const section = normalizeSection(input.section);
    const blockId = normalizeBlockId(input.blockId);
    const document = this.store.getDocument().document;
    if (!document.sections[section].some((block) => block.id === blockId)) {
      throw new ApiError(404, "block_not_found", "Content block was not found");
    }
    return { section, blockId };
  }

  normalizeAttachmentFile(input) {
    try { this.attachmentStorage.validate(input.bytes); } catch (error) {
      if (error instanceof AttachmentInputError) throw new ApiError(error.status, error.code, error.message);
      throw error;
    }
    return {
      name: normalizeAttachmentName(input.name),
      contentType: normalizeAttachmentContentType(input.contentType),
      bytes: input.bytes,
    };
  }

  assertAttachmentQuota(additionalBytes) {
    if (this.store.attachmentStorageBytes() + Math.max(0, additionalBytes) > this.config.maxAttachmentStorageBytes) {
      throw new ApiError(507, "attachment_storage_full", "Attachment storage quota has been reached");
    }
  }

  requireAttachment(id) {
    assertOpaqueId(id, "attachment_not_found", "Attachment was not found");
    const attachment = this.store.getAttachment(id);
    if (!attachment) throw new ApiError(404, "attachment_not_found", "Attachment was not found");
    return attachment;
  }

  listCustomTemplates(input) {
    this.requireSession(input.sessionToken, true);
    return { templates: this.store.listCustomTemplates().map(presentTemplate) };
  }

  getCustomTemplate(input) {
    this.requireSession(input.sessionToken, true);
    assertOpaqueId(input.id, "template_not_found", "Custom template was not found");
    return presentExistingTemplate(this.store.getCustomTemplate(input.id));
  }

  createCustomTemplate(input) {
    this.requireMutation(input);
    const fields = normalizeTemplate(input, this.config.maxTemplateBytes);
    try {
      const template = this.store.createCustomTemplate({
        id: newOpaqueToken(),
        ...fields,
        now: this.config.clock(),
      });
      return presentTemplate(template);
    } catch (error) {
      throw normalizeTemplateConflict(error);
    }
  }

  updateCustomTemplate(input) {
    this.requireMutation(input);
    assertOpaqueId(input.id, "template_not_found", "Custom template was not found");
    assertRevision(input.revision);
    const fields = normalizeTemplate(input, this.config.maxTemplateBytes);
    let result;
    try {
      result = this.store.updateCustomTemplate({
        id: input.id,
        revision: input.revision,
        ...fields,
        now: this.config.clock(),
      });
    } catch (error) {
      throw normalizeTemplateConflict(error);
    }
    assertTemplateMutation(result, input.revision);
    return presentTemplate(result.current);
  }

  deleteCustomTemplate(input) {
    this.requireMutation(input);
    assertOpaqueId(input.id, "template_not_found", "Custom template was not found");
    assertRevision(input.revision);
    const result = this.store.deleteCustomTemplate(input.id, input.revision);
    assertTemplateMutation(result, input.revision);
  }

  requireMutation(input) {
    this.requireSession(input.sessionToken, true);
    this.assertCsrf(input.sessionToken, input.csrfToken);
  }

  requireSession(token, authenticated) {
    const session = this.findSession(token);
    if (!session || (authenticated && !session.authenticated)) {
      throw new ApiError(401, "authentication_required", "Authentication is required");
    }
    return session;
  }

  assertCsrf(sessionToken, csrfToken) {
    const expected = csrfTokenForSession(sessionToken, this.config.ipHmacSecret);
    if (!secureStringEqual(csrfToken, expected)) {
      throw new ApiError(403, "invalid_csrf_token", "A valid CSRF token is required");
    }
  }

  findSession(token) {
    if (typeof token !== "string" || !SESSION_TOKEN_PATTERN.test(token)) return null;
    return this.store.getSession(this.sessionHash(token), this.config.clock());
  }

  issueSession(authenticated, now = this.config.clock()) {
    const token = newOpaqueToken();
    const session = makeSession(this.sessionHash(token), authenticated, now);
    this.store.createSession(session);
    return this.presentSession(token, session, true);
  }

  rotateSession(previousToken, authenticated, now) {
    const token = newOpaqueToken();
    const session = makeSession(this.sessionHash(token), authenticated, now);
    this.store.replaceSession(this.sessionHash(previousToken), session);
    return this.presentSession(token, session, true);
  }

  presentSession(token, session, isNew) {
    return {
      authenticated: session.authenticated,
      csrfToken: csrfTokenForSession(token, this.config.ipHmacSecret),
      expiresAt: new Date(session.expiresAt).toISOString(),
      token,
      isNew,
    };
  }

  sessionHash(token) {
    return hashSessionToken(token, this.config.ipHmacSecret);
  }

  close() {
    this.store.close();
  }
}

function makeSession(tokenHash, authenticated, now) {
  return {
    tokenHash,
    authenticated,
    now,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
}

function isAcceptablePassword(password) {
  return typeof password === "string" && Buffer.byteLength(password) <= 1024;
}

function serializeDocument(document, maxBytes) {
  let json;
  try {
    validateDocument(document);
    json = JSON.stringify(document);
  } catch (error) {
    throw new ApiError(400, "invalid_document", error.message);
  }
  if (json === undefined || Buffer.byteLength(json) > maxBytes) {
    throw new ApiError(400, "invalid_document", "document is missing or too large");
  }
  return json;
}

function presentDocument(state) {
  return {
    document: state.document,
    revision: state.revision,
    updatedAt: new Date(state.updatedAt).toISOString(),
  };
}

function normalizeContentType(value) {
  if (typeof value !== "string") return "";
  return value.split(";", 1)[0].trim().toLowerCase();
}

function presentMedia(media) {
  return {
    id: media.id,
    url: `/api/media/${media.id}`,
    contentType: media.contentType,
    byteSize: media.byteSize,
    width: media.width,
    height: media.height,
    createdAt: new Date(media.createdAt).toISOString(),
  };
}

function presentAttachment(attachment) {
  return {
    id: attachment.id,
    blockId: attachment.blockId,
    name: attachment.name,
    contentType: attachment.contentType,
    byteSize: attachment.byteSize,
    previewKind: attachment.previewKind,
    previewable: attachment.previewKind !== null,
    createdAt: new Date(attachment.createdAt).toISOString(),
    updatedAt: new Date(attachment.updatedAt).toISOString(),
  };
}

function removedBlocks(previous, next) {
  return Object.keys(previous.sections).flatMap((section) => {
    const retained = new Set(next.sections[section].map((block) => block.id));
    return previous.sections[section]
      .filter((block) => !retained.has(block.id))
      .map((block) => ({ section, blockId: block.id }));
  });
}

function normalizeSection(value) {
  if (!["transport", "stay", "agenda"].includes(value)) {
    throw new ApiError(400, "invalid_section", "Trip Section is invalid");
  }
  return value;
}

function normalizeBlockId(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 160) {
    throw new ApiError(400, "invalid_block", "Content block is invalid");
  }
  return value;
}

function normalizeAttachmentName(value) {
  if (typeof value !== "string") throw new ApiError(400, "invalid_attachment_name", "Attachment name is required");
  const name = value.split(/[\\/]/).at(-1).trim().normalize("NFKC");
  if (!name || name.length > 255 || ATTACHMENT_NAME_CONTROLS.test(name)) {
    throw new ApiError(400, "invalid_attachment_name", "Attachment name must contain 1 to 255 printable characters");
  }
  return name;
}

function normalizeAttachmentContentType(value) {
  const normalized = normalizeContentType(value);
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(normalized)
    ? normalized.slice(0, 200)
    : "application/octet-stream";
}

function assertOpaqueId(value, code, message) {
  if (!OPAQUE_ID_PATTERN.test(value)) throw new ApiError(404, code, message);
}

function normalizeCleanupLimit(value) {
  if (value === undefined) return 100;
  if (!Number.isInteger(value) || value < 1 || value > 1_000) {
    throw new TypeError("cleanup limit must be an integer from 1 to 1000");
  }
  return value;
}

function normalizeTemplate(input, maxBytes) {
  const name = normalizeTemplateName(input.name);
  const templateJson = serializeTemplate(input.template, maxBytes);
  return { name, nameKey: name.toLowerCase(), templateJson };
}

function normalizeTemplateName(value) {
  if (typeof value !== "string") throw new ApiError(400, "invalid_template", "Template name is required");
  const name = value.trim().normalize("NFKC");
  if (!name || name.length > 100 || TEMPLATE_NAME_CONTROLS.test(name)) {
    throw new ApiError(400, "invalid_template", "Template name must contain 1 to 100 printable characters");
  }
  return name;
}

function serializeTemplate(template, maxBytes) {
  if (!template || typeof template !== "object") {
    throw new ApiError(400, "invalid_template", "Template content must be an object or array");
  }
  validateTemplateShape(template);
  let json;
  try {
    json = JSON.stringify(template);
  } catch {
    throw new ApiError(400, "invalid_template", "Template content must be valid JSON");
  }
  if (!json || Buffer.byteLength(json) > maxBytes) {
    throw new ApiError(400, "invalid_template", "Template content is too large");
  }
  return json;
}

function validateTemplateShape(template) {
  const scope = template.sectionScope;
  if (!["all", "transport", "stay", "agenda"].includes(scope)) {
    throw new ApiError(400, "invalid_template", "Template section scope is invalid");
  }
  if (!template.block || typeof template.block !== "object") {
    throw new ApiError(400, "invalid_template", "Template block is required");
  }
  try {
    const sections = scope === "all" ? ["transport", "stay", "agenda"] : [scope];
    sections.forEach((section) => validateCustomBlock(template.block, section));
  } catch (error) {
    throw new ApiError(400, "invalid_template", error.message);
  }
}

function normalizeTemplateConflict(error) {
  if (/UNIQUE constraint failed: custom_templates\.name_key/.test(error?.message)) {
    return new ApiError(409, "template_name_conflict", "A custom template with this name already exists");
  }
  return error;
}

function assertRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new ApiError(400, "invalid_revision", "revision must be a positive integer");
  }
}

function assertTemplateMutation(result, expectedRevision) {
  if (result.updated || result.deleted) return;
  if (!result.current) throw new ApiError(404, "template_not_found", "Custom template was not found");
  throw new ApiError(409, "revision_conflict", "The custom template has changed", {
    currentRevision: result.current.revision,
    expectedRevision,
  });
}

function presentExistingTemplate(template) {
  if (!template) throw new ApiError(404, "template_not_found", "Custom template was not found");
  return presentTemplate(template);
}

function presentTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    template: template.template,
    revision: template.revision,
    createdAt: new Date(template.createdAt).toISOString(),
    updatedAt: new Date(template.updatedAt).toISOString(),
  };
}
