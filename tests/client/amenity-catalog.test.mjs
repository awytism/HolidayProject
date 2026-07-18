import assert from "node:assert/strict";
import test from "node:test";
import {
  AMENITY_CATALOG,
  AMENITY_CATEGORIES,
  normalizeAmenitySearch,
  searchAmenities,
} from "../../src/client/domain/amenity-catalog.js";
import {
  ICON_REGISTRY,
  TRUSTED_ICON_KEYS,
  hasTrustedIcon,
  renderIcon,
} from "../../src/client/ui/icon-registry.js";

test("provides a stable curated catalog across every requested category", () => {
  const categoryIds = AMENITY_CATEGORIES.map((item) => item.id);
  const presetIds = AMENITY_CATALOG.map((item) => item.id);

  assert.deepEqual(categoryIds, [
    "property-space",
    "kitchen",
    "bathroom-wellbeing",
    "views",
    "outdoors",
    "comfort",
    "laundry",
    "entertainment-connectivity",
    "family",
    "parking",
    "accessibility",
    "policies",
  ]);
  assert.ok(AMENITY_CATALOG.length >= 60);
  assert.equal(new Set(presetIds).size, presetIds.length);
  assert.ok(AMENITY_CATALOG.every((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)));
  assert.ok(AMENITY_CATALOG.every((item) => categoryIds.includes(item.category)));
  assert.ok(AMENITY_CATALOG.every((item) => item.label && item.aliases.length > 0));
  assert.ok(AMENITY_CATALOG.every((item) => hasTrustedIcon(item.iconKey)));
});

test("normalizes accents, case, surrounding whitespace, and repeated spaces", () => {
  assert.equal(normalizeAmenitySearch("  REGIÃO   São  "), "regiao sao");
  assert.equal(normalizeAmenitySearch("ÁÉÍÓÚ Ç ü"), "aeiou c u");
  assert.equal(normalizeAmenitySearch(null), "");
  assert.equal(searchAmenities("HÍDRO")[0].id, "hot-tub");
  assert.equal(searchAmenities("CHURRÁSQUEIRA")[0].id, "bbq-grill");
});

test("ranks label exact and prefix matches ahead of substring and aliases", () => {
  const parking = searchAmenities("parking");
  assert.deepEqual(parking.slice(0, 2).map((item) => item.id), ["parking", "parking-garage"]);
  assert.ok(parking.findIndex((item) => item.id === "free-parking") > 1);

  const wifi = searchAmenities("wifi");
  assert.equal(wifi[0].id, "wifi");
  assert.equal(searchAmenities("wireless internet")[0].id, "wifi");
  assert.deepEqual(searchAmenities("not-an-amenity"), []);
});

test("excludes selected presets, filters categories, and never returns over ten", () => {
  const selectedIds = ["kitchen", "refrigerator", "microwave"];
  const results = searchAmenities("", { selectedIds, category: "Kitchen" });

  assert.equal(results.length, 10);
  assert.ok(results.every((item) => item.category === "kitchen"));
  assert.ok(results.every((item) => !selectedIds.includes(item.id)));
  assert.deepEqual(searchAmenities("", { category: "unknown" }), []);
  assert.deepEqual(searchAmenities("pool", { selectedIds: new Set(["private-pool"]) }).map((item) => item.id), ["shared-pool"]);
});

test("renders only immutable trusted SVG entries", () => {
  assert.ok(Object.isFrozen(ICON_REGISTRY));
  assert.ok(Object.isFrozen(TRUSTED_ICON_KEYS));
  assert.equal(TRUSTED_ICON_KEYS.length, Object.keys(ICON_REGISTRY).length);
  assert.match(renderIcon("hot-tub"), /^<svg [^>]+aria-hidden="true"[^>]*>/);
  assert.equal(renderIcon("<img src=x onerror=alert(1)>") , "");
  assert.equal(renderIcon({ toString: () => "home" }), "");
  assert.ok(!renderIcon("home").includes("script"));
});

test("maintains normalized search invariants over seeded randomized inputs", () => {
  const random = seededRandom(0xa11ce);
  const categories = AMENITY_CATEGORIES.map((item) => item.id);

  for (let iteration = 0; iteration < 250; iteration += 1) {
    const category = categories[Math.floor(random() * categories.length)];
    const candidates = AMENITY_CATALOG.filter((item) => item.category === category);
    const target = candidates[Math.floor(random() * candidates.length)];
    const excluded = randomExclusions(random, target.id);
    const query = randomDecoratedQuery(random, target.label);
    const results = searchAmenities(query, { category, selectedIds: excluded });

    assert.equal(normalizeAmenitySearch(query), normalizeAmenitySearch(target.label));
    assert.equal(results[0].id, target.id);
    assert.ok(results.length <= 10);
    assert.ok(results.every((item) => item.category === category));
    assert.ok(results.every((item) => !excluded.has(item.id)));
    assert.deepEqual(results, searchAmenities(query, { category, selectedIds: excluded }));
  }
});

test("maintains the ten-result cap under randomized exclusions", () => {
  const random = seededRandom(0xcafe2026);
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const excluded = new Set(AMENITY_CATALOG.filter(() => random() < 0.08).map((item) => item.id));
    const available = AMENITY_CATALOG.length - excluded.size;
    const results = searchAmenities("", { selectedIds: excluded });
    assert.equal(results.length, Math.min(10, available));
    assert.ok(results.every((item) => !excluded.has(item.id)));
  }
});

function randomExclusions(random, protectedId) {
  return new Set(AMENITY_CATALOG
    .filter((item) => item.id !== protectedId && random() < 0.12)
    .map((item) => item.id));
}

function randomDecoratedQuery(random, value) {
  const accents = ["\u0301", "\u0302", "\u0303", "\u0308"];
  const transformed = [...value].map((character) => {
    const cased = random() < 0.5 ? character.toUpperCase() : character.toLowerCase();
    if (!/[aeiou]/i.test(character) || random() >= 0.25) return cased;
    return `${cased}${accents[Math.floor(random() * accents.length)]}`;
  }).join("");
  return `${" ".repeat(1 + Math.floor(random() * 3))}${transformed}${" ".repeat(1 + Math.floor(random() * 3))}`;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
