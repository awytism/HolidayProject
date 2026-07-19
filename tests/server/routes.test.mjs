import assert from "node:assert/strict";
import test from "node:test";
import {
  createGramadoRouter,
  resolveClientIp,
  securityHeaders,
  sessionCookieOptions,
} from "../../src/server/routes.mjs";

test("uses the direct peer unless proxy hops are explicitly trusted", () => {
  const request = {
    headers: { "x-forwarded-for": "198.51.100.7, 198.51.100.8" },
    socket: { remoteAddress: "::ffff:192.0.2.5" },
  };
  assert.equal(resolveClientIp(request, 0), "192.0.2.5");
  assert.equal(resolveClientIp(request, 1), "198.51.100.8");
  assert.equal(resolveClientIp(request, 2), "198.51.100.7");
});

test("session cookie is 30-day, HttpOnly, Strict, and Secure in production", () => {
  const options = sessionCookieOptions({ secureCookies: true, cookiePath: "/" });
  assert.deepEqual(options, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
});

test("sets API security headers including production HSTS", () => {
  const headers = new Map();
  let continued = false;
  securityHeaders({ nodeEnv: "production" })(null, {
    setHeader(name, value) {
      headers.set(name, value);
    },
  }, () => {
    continued = true;
  });
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(continued, true);
});

test("builds the expected Express-compatible routes without loading Express globally", () => {
  const registrations = [];
  const router = {
    use(...handlers) {
      registrations.push(["USE", null, ...handlers]);
    },
    get(path, ...handlers) {
      registrations.push(["GET", path, ...handlers]);
    },
    post(path, ...handlers) {
      registrations.push(["POST", path, ...handlers]);
    },
    put(path, ...handlers) {
      registrations.push(["PUT", path, ...handlers]);
    },
    patch(path, ...handlers) {
      registrations.push(["PATCH", path, ...handlers]);
    },
    delete(path, ...handlers) {
      registrations.push(["DELETE", path, ...handlers]);
    },
  };
  const service = {
    config: { nodeEnv: "test", cookieName: "session", cookiePath: "/", secureCookies: false },
    close() {},
  };
  const express = {
    Router: () => router,
    json: () => (_request, _response, next) => next(),
    raw: () => (_request, _response, next) => next(),
  };
  const result = createGramadoRouter({ express, service });
  const routes = registrations.filter(([method]) => method !== "USE")
    .map(([method, path]) => `${method} ${path}`);

  assert.equal(result, router);
  assert.deepEqual(routes, [
    "POST /media",
    "POST /attachments/:id/download",
    "POST /attachments/:section/:blockId",
    "PUT /attachments/:id/content",
    "GET /media/:id",
    "GET /attachments/:id/content",
    "GET /document",
    "PUT /document",
    "GET /session",
    "POST /session/edit",
    "GET /attachments",
    "POST /login",
    "POST /logout",
    "DELETE /media/:id",
    "PATCH /attachments/:id",
    "DELETE /attachments/:id",
    "GET /custom-templates",
    "POST /custom-templates",
    "GET /custom-templates/:id",
    "PUT /custom-templates/:id",
    "DELETE /custom-templates/:id",
  ]);
});
