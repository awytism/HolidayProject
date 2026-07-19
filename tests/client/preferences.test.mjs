import assert from "node:assert/strict";
import test from "node:test";
import { initializePreferences, normalizePalette } from "../../src/client/app/preferences.js";
import { initializeDateTimePreferences } from "../../src/client/app/date-time-preferences.js";

test("normalizes palette preferences to the available site palette", () => {
  assert.equal(normalizePalette("coral-olive-teal"), "coral-olive-teal");
  assert.equal(normalizePalette("unknown"), "coral-olive-teal");
  assert.equal(normalizePalette(null), "coral-olive-teal");
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
  assert.deepEqual(root.dataset, { palette: "coral-olive-teal", theme: "dark" });
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
