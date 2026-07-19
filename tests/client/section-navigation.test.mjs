import assert from "node:assert/strict";
import test from "node:test";
import { calculateHeroScrollTop, calculateSectionScrollTop } from "../../src/client/app/section-navigation.js";

test("positions a newly selected section at the complete hero", () => {
  assert.equal(calculateHeroScrollTop({
    pageScroll: 1500,
    heroViewportTop: -1366,
    stickyViewportBottom: 141,
  }), 0);
  assert.equal(calculateHeroScrollTop({
    pageScroll: 900,
    heroViewportTop: 240,
    stickyViewportBottom: 140,
  }), 1000);
});

test("snaps a sub-pixel hero offset at the document start to zero", () => {
  assert.equal(calculateHeroScrollTop({
    pageScroll: 248,
    heroViewportTop: -105.8,
    stickyViewportBottom: 141.2,
  }), 0);
});

test("leaves breathing room below the sticky menu when selecting a section", () => {
  assert.equal(calculateSectionScrollTop({
    pageScroll: 1200,
    targetViewportTop: 260,
    stickyViewportBottom: 64,
    gap: 24,
  }), 1372);
});
