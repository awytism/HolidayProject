import assert from "node:assert/strict";
import test from "node:test";
import { calculateScrollTopThreshold, shouldShowScrollTop } from "../../src/client/app/scroll-top.js";

test("shows the scroll-to-top control only after meaningful scrolling", () => {
  assert.equal(calculateScrollTopThreshold(600), 240);
  assert.equal(calculateScrollTopThreshold(900), 360);
  assert.equal(calculateScrollTopThreshold(1400), 420);
  assert.equal(shouldShowScrollTop({ scrollY: 0, scrollHeight: 2400, viewportHeight: 600 }), false);
  assert.equal(shouldShowScrollTop({ scrollY: 240, scrollHeight: 2400, viewportHeight: 600 }), false);
  assert.equal(shouldShowScrollTop({ scrollY: 241, scrollHeight: 2400, viewportHeight: 600 }), true);
  assert.equal(shouldShowScrollTop({ scrollY: 500, scrollHeight: 650, viewportHeight: 600 }), false);
});
