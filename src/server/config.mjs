import { validateScryptPasswordHash } from "./security.mjs";
import { validateDocument } from "../shared/document-schema.mjs";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const FAILURE_WINDOW_MS = 5 * 60 * 1000;
export const LOCKOUT_MS = 30 * 60 * 1000;
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export const MAX_MEDIA_PIXELS = 20_000_000;
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_ATTACHMENT_STORAGE_BYTES = 2 * 1024 * 1024 * 1024;
export const DEFAULT_ATTACHMENT_DOWNLOAD_PASSWORD_HASH = "scrypt$16384$8$1$DAwMDAwMDAwMDAwMDAwMDA$wLq-bSwxENOuUNI9z5NZ0Z3hdvY4VFuOiTcwf_bqceM";

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(overrides = {}, env = process.env) {
  const nodeEnv = pick(overrides.nodeEnv, env.NODE_ENV, "development");
  const config = {
    dbPath: pick(overrides.dbPath, env.GRAMADO_DB_PATH, "gramado.sqlite"),
    uploadDir: pick(overrides.uploadDir, env.GRAMADO_UPLOAD_DIR, "data/uploads"),
    attachmentDir: pick(overrides.attachmentDir, env.GRAMADO_ATTACHMENT_DIR, "data/attachments"),
    passwordHash: pick(overrides.passwordHash, env.GRAMADO_PASSWORD_SCRYPT_HASH),
    attachmentDownloadPasswordHash: pick(
      overrides.attachmentDownloadPasswordHash,
      env.GRAMADO_ATTACHMENT_DOWNLOAD_PASSWORD_SCRYPT_HASH,
      DEFAULT_ATTACHMENT_DOWNLOAD_PASSWORD_HASH,
    ),
    ipHmacSecret: pick(overrides.ipHmacSecret, env.GRAMADO_IP_HMAC_SECRET),
    cookieName: pick(overrides.cookieName, env.GRAMADO_SESSION_COOKIE, "gramado_session"),
    cookiePath: pick(overrides.cookiePath, env.GRAMADO_COOKIE_PATH, "/"),
    nodeEnv,
    secureCookies: nodeEnv === "production" || overrides.secureCookies === true,
    trustProxyHops: parseTrustProxyHops(pick(overrides.trustProxyHops, env.GRAMADO_TRUST_PROXY_HOPS, 0)),
    clock: pick(overrides.clock, Date.now),
    initialDocument: readInitialDocument(overrides, env),
    maxDocumentBytes: pick(overrides.maxDocumentBytes, 512 * 1024),
    maxTemplateBytes: pick(overrides.maxTemplateBytes, 512 * 1024),
    maxMediaBytes: pick(overrides.maxMediaBytes, MAX_MEDIA_BYTES),
    maxMediaPixels: pick(overrides.maxMediaPixels, MAX_MEDIA_PIXELS),
    maxAttachmentBytes: parsePositiveInteger(
      pick(overrides.maxAttachmentBytes, env.GRAMADO_MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_BYTES),
      "GRAMADO_MAX_ATTACHMENT_BYTES",
    ),
    maxAttachmentStorageBytes: parsePositiveInteger(
      pick(overrides.maxAttachmentStorageBytes, env.GRAMADO_MAX_ATTACHMENT_STORAGE_BYTES, MAX_ATTACHMENT_STORAGE_BYTES),
      "GRAMADO_MAX_ATTACHMENT_STORAGE_BYTES",
    ),
  };
  validateConfig(config);
  return Object.freeze(config);
}

function parseTrustProxyHops(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 16) {
    throw new ConfigError("GRAMADO_TRUST_PROXY_HOPS must be an integer from 0 to 16");
  }
  return parsed;
}

function parsePositiveInteger(value, name) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ConfigError(`${name} must be a positive integer`);
  }
  return parsed;
}

function readInitialDocument(overrides, env) {
  if (Object.hasOwn(overrides, "initialDocument")) return overrides.initialDocument;
  if (!env.GRAMADO_INITIAL_DOCUMENT) return {};
  try {
    return JSON.parse(env.GRAMADO_INITIAL_DOCUMENT);
  } catch {
    throw new ConfigError("GRAMADO_INITIAL_DOCUMENT must be valid JSON");
  }
}

function validateConfig(config) {
  assertText(config.dbPath, "GRAMADO_DB_PATH is invalid");
  assertText(config.uploadDir, "GRAMADO_UPLOAD_DIR is invalid");
  assertText(config.attachmentDir, "GRAMADO_ATTACHMENT_DIR is invalid");
  assertSecret(config.ipHmacSecret);
  assertCookieName(config.cookieName);
  assertCookiePath(config.cookiePath);
  if (typeof config.clock !== "function") throw new ConfigError("clock must be a function");
  assertDocumentSize(config.maxDocumentBytes, "maxDocumentBytes");
  assertDocumentSize(config.maxTemplateBytes, "maxTemplateBytes");
  assertPositiveInteger(config.maxMediaBytes, "maxMediaBytes");
  assertPositiveInteger(config.maxMediaPixels, "maxMediaPixels");
  assertPositiveInteger(config.maxAttachmentBytes, "maxAttachmentBytes");
  assertPositiveInteger(config.maxAttachmentStorageBytes, "maxAttachmentStorageBytes");
  if (config.maxAttachmentStorageBytes < config.maxAttachmentBytes) {
    throw new ConfigError("maxAttachmentStorageBytes must be at least maxAttachmentBytes");
  }
  try {
    validateScryptPasswordHash(config.passwordHash);
    validateScryptPasswordHash(config.attachmentDownloadPasswordHash);
    validateDocument(config.initialDocument);
    if (JSON.stringify(config.initialDocument) === undefined) {
      throw new TypeError("initial document must be JSON serializable");
    }
  } catch (error) {
    throw new ConfigError(`Invalid server configuration: ${error.message}`);
  }
}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function assertText(value, message) {
  if (typeof value !== "string" || !value) throw new ConfigError(message);
}

function assertSecret(value) {
  if (typeof value !== "string") throw new ConfigError("GRAMADO_IP_HMAC_SECRET must contain at least 32 bytes");
  if (Buffer.byteLength(value) < 32) throw new ConfigError("GRAMADO_IP_HMAC_SECRET must contain at least 32 bytes");
}

function assertCookieName(value) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new ConfigError("GRAMADO_SESSION_COOKIE is invalid");
}

function assertCookiePath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) throw new ConfigError("GRAMADO_COOKIE_PATH is invalid");
}

function assertDocumentSize(value, name) {
  if (!Number.isInteger(value) || value < 1024) throw new ConfigError(`${name} must be an integer of at least 1024`);
}

function assertPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new ConfigError(`${name} must be a positive integer`);
}
