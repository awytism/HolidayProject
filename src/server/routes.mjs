import { createRequire } from "node:module";
import { ApiError, createGramadoService } from "./service.mjs";
import { normalizeIp } from "./security.mjs";
import { SESSION_TTL_MS } from "./config.mjs";

const require = createRequire(import.meta.url);

export function createGramadoRouter(options = {}) {
  const express = options.express ?? require("express");
  const service = options.service ?? createGramadoService({
    config: options.config,
    env: options.env,
    database: options.database,
    store: options.store,
    mediaStorage: options.mediaStorage,
    attachmentStorage: options.attachmentStorage,
    sharp: options.sharp,
    referenceChecker: options.referenceChecker,
  });
  const router = express.Router();
  const handlers = createHandlers(service);

  router.use(securityHeaders(service.config));
  router.post("/media", express.raw({
    limit: service.config.maxMediaBytes,
    type: () => true,
  }), wrap(handlers.postMedia));
  router.post("/attachments/:section/:blockId", express.raw({
    limit: service.config.maxAttachmentBytes,
    type: () => true,
  }), wrap(handlers.postAttachment));
  router.put("/attachments/:id/content", express.raw({
    limit: service.config.maxAttachmentBytes,
    type: () => true,
  }), wrap(handlers.replaceAttachment));
  router.get("/media/:id", wrap(handlers.getMedia));
  router.get("/attachments/:id/content", wrap(handlers.getAttachmentContent));
  router.use(express.json({ limit: "600kb", strict: true, type: "application/json" }));
  router.get("/document", wrap(handlers.getDocument));
  router.put("/document", wrap(handlers.putDocument));
  router.get("/session", wrap(handlers.getSession));
  router.get("/attachments", wrap(handlers.listAttachments));
  router.post("/login", wrap(handlers.login));
  router.post("/logout", wrap(handlers.logout));
  router.delete("/media/:id", wrap(handlers.deleteMedia));
  router.patch("/attachments/:id", wrap(handlers.renameAttachment));
  router.delete("/attachments/:id", wrap(handlers.deleteAttachment));
  router.get("/custom-templates", wrap(handlers.listCustomTemplates));
  router.post("/custom-templates", wrap(handlers.createCustomTemplate));
  router.get("/custom-templates/:id", wrap(handlers.getCustomTemplate));
  router.put("/custom-templates/:id", wrap(handlers.updateCustomTemplate));
  router.delete("/custom-templates/:id", wrap(handlers.deleteCustomTemplate));
  router.use(apiErrorHandler);

  Object.defineProperty(router, "gramadoService", { value: service });
  Object.defineProperty(router, "cleanupStagedMedia", { value: (options) => service.cleanupStagedMedia(options) });
  Object.defineProperty(router, "close", { value: () => service.close() });
  return router;
}

function createHandlers(service) {
  return {
    async postMedia(request, response) {
      const media = await service.uploadMedia({
        ...mutationCredentials(request, service),
        contentType: request.headers["content-type"],
        bytes: request.body,
      });
      response.location(media.url).status(201).json(media);
    },

    async getMedia(request, response) {
      const result = await service.readMedia(request.params.id);
      sendMedia(request, response, result);
    },

    async deleteMedia(request, response) {
      const result = await service.deleteMedia({
        ...mutationCredentials(request, service),
        id: request.params.id,
      });
      response.status(202).json(result);
    },

    listAttachments(request, response) {
      response.json(service.listAttachments({
        ...sessionCredentials(request, service),
        section: request.query.section,
      }));
    },

    async postAttachment(request, response) {
      const attachment = await service.uploadAttachment({
        ...mutationCredentials(request, service),
        section: request.params.section,
        blockId: request.params.blockId,
        name: request.query.name,
        contentType: request.headers["content-type"],
        bytes: request.body,
      });
      response.location(`/api/attachments/${attachment.id}/content`).status(201).json(attachment);
    },

    async replaceAttachment(request, response) {
      response.json(await service.replaceAttachment({
        ...mutationCredentials(request, service),
        id: request.params.id,
        name: request.query.name,
        contentType: request.headers["content-type"],
        bytes: request.body,
      }));
    },

    renameAttachment(request, response) {
      response.json(service.renameAttachment({
        ...mutationCredentials(request, service),
        id: request.params.id,
        name: request.body?.name,
      }));
    },

    async getAttachmentContent(request, response) {
      const result = await service.readAttachment({
        ...sessionCredentials(request, service),
        id: request.params.id,
      });
      sendAttachment(response, result, request.query.mode === "preview");
    },

    async deleteAttachment(request, response) {
      await service.deleteAttachment({
        ...mutationCredentials(request, service),
        id: request.params.id,
      });
      response.status(204).end();
    },

    getDocument(_request, response) {
      response.json(service.getDocument());
    },

    async putDocument(request, response) {
      const result = await service.updateDocument({
        sessionToken: readSessionCookie(request, service.config.cookieName),
        csrfToken: request.headers["x-csrf-token"],
        revision: request.body?.revision,
        document: request.body?.document,
      });
      response.json(result);
    },

    getSession(request, response) {
      const session = service.getSessionState(readSessionCookie(request, service.config.cookieName));
      if (session.isNew) setSessionCookie(response, session.token, service.config);
      response.json(publicSession(session));
    },

    async login(request, response) {
      const session = await service.login({
        sessionToken: readSessionCookie(request, service.config.cookieName),
        csrfToken: request.headers["x-csrf-token"],
        password: request.body?.password,
        ip: resolveClientIp(request, service.config.trustProxyHops),
      });
      setSessionCookie(response, session.token, service.config);
      response.json(publicSession(session));
    },

    logout(request, response) {
      service.logout({
        sessionToken: readSessionCookie(request, service.config.cookieName),
        csrfToken: request.headers["x-csrf-token"],
      });
      clearSessionCookie(response, service.config);
      response.status(204).end();
    },

    listCustomTemplates(request, response) {
      response.json(service.listCustomTemplates(sessionCredentials(request, service)));
    },

    createCustomTemplate(request, response) {
      const template = service.createCustomTemplate({
        ...mutationCredentials(request, service),
        name: request.body?.name,
        template: request.body?.template,
      });
      response.location(`/api/custom-templates/${template.id}`).status(201).json(template);
    },

    getCustomTemplate(request, response) {
      response.json(service.getCustomTemplate({
        ...sessionCredentials(request, service),
        id: request.params.id,
      }));
    },

    updateCustomTemplate(request, response) {
      response.json(service.updateCustomTemplate({
        ...mutationCredentials(request, service),
        id: request.params.id,
        name: request.body?.name,
        template: request.body?.template,
        revision: request.body?.revision,
      }));
    },

    deleteCustomTemplate(request, response) {
      service.deleteCustomTemplate({
        ...mutationCredentials(request, service),
        id: request.params.id,
        revision: request.body?.revision,
      });
      response.status(204).end();
    },
  };
}

function sessionCredentials(request, service) {
  return { sessionToken: readSessionCookie(request, service.config.cookieName) };
}

function mutationCredentials(request, service) {
  return {
    ...sessionCredentials(request, service),
    csrfToken: request.headers["x-csrf-token"],
  };
}

function sendMedia(request, response, result) {
  const etag = `"${result.media.id}"`;
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  response.setHeader("Content-Type", "image/webp");
  response.setHeader("Content-Length", String(result.bytes.length));
  response.setHeader("ETag", etag);
  if (request.headers["if-none-match"] === etag) return response.status(304).end();
  return response.send(result.bytes);
}

function sendAttachment(response, result, preview) {
  if (preview && !result.attachment.previewable) {
    throw new ApiError(415, "attachment_preview_unavailable", "Preview is unavailable for this file type");
  }
  const disposition = preview ? "inline" : "attachment";
  const fallback = result.attachment.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(result.attachment.name).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Content-Type", result.attachment.contentType);
  response.setHeader("Content-Length", String(result.bytes.length));
  response.setHeader("Content-Disposition", `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`);
  response.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.send(result.bytes);
}

function publicSession(session) {
  return {
    authenticated: session.authenticated,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
  };
}

function wrap(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next);
}

export function resolveClientIp(request, trustedProxyHops = 0) {
  const direct = request.socket?.remoteAddress ?? request.connection?.remoteAddress;
  if (trustedProxyHops === 0) return normalizeIp(direct);
  const forwarded = readForwardedFor(request.headers["x-forwarded-for"]);
  const chain = [...forwarded, direct];
  const selectedIndex = Math.max(0, chain.length - trustedProxyHops - 1);
  return normalizeIp(chain[selectedIndex]);
}

function readForwardedFor(header) {
  if (header === undefined) return [];
  if (typeof header !== "string") throw new ApiError(400, "invalid_client_ip", "Invalid forwarded IP header");
  return header.split(",").map((address) => address.trim()).filter(Boolean);
}

function readSessionCookie(request, cookieName) {
  const header = request.headers.cookie;
  if (typeof header !== "string") return undefined;
  const prefix = `${cookieName}=`;
  const values = header.split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(prefix))
    .map((part) => part.slice(prefix.length));
  return values.length === 1 ? values[0] : undefined;
}

export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: config.secureCookies,
    maxAge: SESSION_TTL_MS,
    path: config.cookiePath,
  };
}

function setSessionCookie(response, token, config) {
  response.cookie(config.cookieName, token, sessionCookieOptions(config));
}

function clearSessionCookie(response, config) {
  const options = sessionCookieOptions(config);
  delete options.maxAge;
  response.clearCookie(config.cookieName, options);
}

export function securityHeaders(config) {
  return (_request, response, next) => {
    response.removeHeader?.("X-Powered-By");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    if (config.nodeEnv === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
    next();
  };
}

function apiErrorHandler(error, request, response, next) {
  const normalized = normalizeApiError(error, request.path);
  if (!normalized) return next(error);
  if (normalized.details?.retryAfterSeconds) {
    response.setHeader("Retry-After", String(normalized.details.retryAfterSeconds));
  }
  return response.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details && { details: normalized.details }),
    },
  });
}

function normalizeApiError(error, path) {
  if (error instanceof ApiError) return error;
  if (error?.type === "entity.parse.failed") {
    return new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }
  if (error?.type === "entity.too.large") {
    if (path === "/media") return new ApiError(413, "image_too_large", "Image exceeds the upload size limit");
    if (path.startsWith("/attachments/")) return new ApiError(413, "attachment_too_large", "Attachment exceeds the upload size limit");
    return new ApiError(413, "request_too_large", "Request body is too large");
  }
  if (error instanceof TypeError && error.message === "Invalid IP address") {
    return new ApiError(400, "invalid_client_ip", "Unable to determine the client IP");
  }
  return null;
}
