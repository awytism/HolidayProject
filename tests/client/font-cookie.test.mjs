import assert from "node:assert/strict";
import test from "node:test";
import { createCookieStore } from "../../src/client/app/cookies.js";
import { normalizeFontFamily, normalizeFontScale } from "../../src/client/app/preferences.js";

test("normalizes font scale to the nearest supported step", () => {
  assert.equal(normalizeFontScale(null), 100);
  assert.equal(normalizeFontScale("89"), 90);
  assert.equal(normalizeFontScale("106"), 110);
  assert.equal(normalizeFontScale("999"), 130);
  assert.equal(normalizeFontScale("broken"), 100);
});

test("normalizes the two supported font families", () => {
  assert.equal(normalizeFontFamily("google-sans"), "google-sans");
  assert.equal(normalizeFontFamily("abeezee"), "abeezee");
  assert.equal(normalizeFontFamily("comic-sans"), "google-sans");
  assert.equal(normalizeFontFamily(null), "google-sans");
});

test("reads and writes encoded browser cookies with safe attributes", () => {
  const cookieDocument = { cookie: "gramado_font_scale=110; other=value" };
  const store = createCookieStore(cookieDocument);
  assert.equal(store.get("gramado_font_scale"), "110");
  store.set("gramado_font_scale", "120", { maxAge: 100, secure: true });
  assert.match(cookieDocument.cookie, /^gramado_font_scale=120; Path=\/; Max-Age=100; SameSite=Lax; Secure$/);
});

test("treats malformed percent-encoded cookie values as absent", () => {
  const store = createCookieStore({ cookie: "gramado_font_scale=%E0%A4%A" });
  assert.equal(store.get("gramado_font_scale"), null);
});
