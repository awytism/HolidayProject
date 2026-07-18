import assert from "node:assert/strict";
import test from "node:test";
import { initializePreferences } from "../../src/client/app/preferences.js";

test("applies and updates blue-theme preferences when storage throws", (context) => {
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
  assert.deepEqual(root.dataset, { theme: "dark" });
  events.theme();
  assert.equal(root.dataset.theme, "light");
  assert.equal(meta.content, "#f3f7fc");
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
