import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOM_PALETTE_PLACEHOLDER, initializePreferences, normalizeCustomPalette, normalizeFontFamily, normalizePalette } from "../../src/client/app/preferences.js";
import { initializeDateTimePreferences } from "../../src/client/app/date-time-preferences.js";

test("normalizes palette preferences to the available site palette", () => {
  assert.equal(normalizePalette("coral-olive-teal"), "coral-olive-teal");
  assert.equal(normalizePalette("periwinkle-dream"), "periwinkle-dream");
  assert.equal(normalizePalette("custom-palette"), "custom-palette");
  for (const removed of ["fresh-lagoon", "sunset-glow", "green-blue", "vivid-journey", "coastal-calm", "gramado-garden", "retro-arches"]) {
    assert.equal(normalizePalette(removed), "coral-olive-teal");
  }
  assert.equal(normalizePalette("unknown"), "coral-olive-teal");
  assert.equal(normalizePalette(null), "coral-olive-teal");
});

test("normalizes exactly five safe custom hex colours", () => {
  assert.deepEqual(normalizeCustomPalette(["c73866", "#fe676e", "FD8F52", "#ffbd71", "ffdca2"]), CUSTOM_PALETTE_PLACEHOLDER);
  assert.deepEqual(normalizeCustomPalette(JSON.stringify(CUSTOM_PALETTE_PLACEHOLDER)), CUSTOM_PALETTE_PLACEHOLDER);
  assert.equal(normalizeCustomPalette(["#FFFFFF"]), null);
  assert.equal(normalizeCustomPalette(["#FFFFFF", "#000000", "not-a-colour", "#123456", "#ABCDEF"]), null);
  assert.equal(normalizeCustomPalette("not-json"), null);
});

test("normalizes font family preferences to the five available choices", () => {
  for (const font of ["abeezee", "cause", "google-sans", "inter", "life-savers"]) {
    assert.equal(normalizeFontFamily(font), font);
  }
  assert.equal(normalizeFontFamily("unknown"), "google-sans");
});

test("applies and updates reference-palette theme preferences when storage throws", (context) => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const meta = {};
  const root = { dataset: {} };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: root, querySelector: () => meta },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: true }) },
  });
  context.after(() => restoreGlobal("document", originalDocument));
  context.after(() => restoreGlobal("window", originalWindow));

  const events = {};
  const theme = fakeButton(events, "theme");
  const storage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };

  assert.doesNotThrow(() => initializePreferences({ theme }, storage));
  assert.deepEqual(root.dataset, { palette: "coral-olive-teal", font: "google-sans", theme: "dark" });
  events.theme();
  assert.equal(root.dataset.theme, "light");
  assert.equal(meta.content, "#fbf7e8");
});

test("persists the selected date and clock display formats", () => {
  const values = new Map([
    ["travel-plan-date-format", "month-first"],
    ["travel-plan-time-format", "12-hour"],
  ]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  const preferences = initializeDateTimePreferences(storage);
  assert.equal(preferences.dateFormat, "month-first");
  assert.equal(preferences.timeFormat, "12-hour");
  preferences.setDateFormat("written");
  preferences.setTimeFormat("24-hour");
  assert.equal(values.get("travel-plan-date-format"), "written");
  assert.equal(values.get("travel-plan-time-format"), "24-hour");

  preferences.setDateFormat("day-first");
  preferences.setTimeFormat("24-hour");
});

function fakeButton(events, eventName) {
  return {
    addEventListener(_type, listener) { events[eventName] = listener; },
    setAttribute() {},
  };
}

function restoreGlobal(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete globalThis[name];
}
