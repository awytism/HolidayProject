import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ICON_PICKER_CATEGORIES, ICON_PICKER_KEYS, ICON_REGISTRY, TRUSTED_ICON_KEYS, hasTrustedIcon, iconPickerLabel } from "../../src/client/ui/icon-registry.js";

test("offers every rendered picker icon exactly once while retaining aliases", () => {
  const pickerMarkup = ICON_PICKER_KEYS.map((key) => ICON_REGISTRY[key]);

  assert.ok(Object.isFrozen(ICON_PICKER_KEYS));
  assert.equal(new Set(pickerMarkup).size, pickerMarkup.length);
  const categorizedKeys = ICON_PICKER_CATEGORIES.flatMap((category) => category.keys);
  const requestedExpansion = ["bus", "train", "ferry", "motorcycle", "air-conditioning", "gym", "room-service", "pizza", "sushi", "wine-glass", "passport", "globe", "information-circle", "ticket", "tent", "banana", "beer", "chicken", "cupcake", "donut", "noodles", "salad", "sandwich", "soup", "tea", "airport", "bridge", "church", "city", "ferris-wheel", "lighthouse", "map", "monument", "shopping-bag", "waterfall", "cloud", "cloud-sun", "droplets", "fog", "rain", "snowflake", "sun", "thunderstorm", "umbrella", "wind"];

  assert.ok(ICON_PICKER_KEYS.length < TRUSTED_ICON_KEYS.length);
  assert.ok(ICON_PICKER_KEYS.length >= 140);
  assert.ok(Object.isFrozen(ICON_PICKER_CATEGORIES));
  assert.deepEqual(ICON_PICKER_CATEGORIES.map((category) => category.label), ["Transportation", "Amenities", "Food & Drink", "Travel & Places"]);
  assert.equal(new Set(categorizedKeys).size, categorizedKeys.length);
  assert.deepEqual([...categorizedKeys].sort(), [...ICON_PICKER_KEYS].sort());
  for (const category of ICON_PICKER_CATEGORIES) {
    const labels = category.keys.map(iconPickerLabel);
    assert.deepEqual(labels, [...labels].sort((first, second) => first.localeCompare(second, "en", { sensitivity: "base" })));
  }
  assert.ok(requestedExpansion.every((key) => hasTrustedIcon(key) && ICON_PICKER_KEYS.includes(key)));
  assert.ok(["check", "game", "outdoors", "parking", "sparkles", "view", "washing-machine"].every(hasTrustedIcon));
  assert.ok(["check", "game", "outdoors", "parking", "sparkles", "view", "washing-machine"].every((key) => !ICON_PICKER_KEYS.includes(key)));

  const categories = Object.fromEntries(ICON_PICKER_CATEGORIES.map(({ label, keys }) => [label, keys]));
  assert.ok(["amenity-pillow", "bath", "play", "route", "seat", "shield", "tree"].every((key) => hasTrustedIcon(key) && !ICON_PICKER_KEYS.includes(key)));
  assert.ok(categories.Transportation.includes("airline-seat"));
  assert.ok(!categories.Transportation.includes("seat"));
  assert.equal(categories.General, undefined);
  assert.equal(categories.Activities, undefined);
  assert.ok(categories["Travel & Places"].includes("priority-star"));
  assert.ok(["book", "dice", "fire", "gamepad", "toy", "cookware", "cup", "dining", "grill", "kettle", "kitchen", "oven", "utensils", "wine-glass", "non-smoking"].every((key) => categories.Amenities.includes(key)));
  assert.ok(["cookware", "cup", "dining", "grill", "kettle", "kitchen", "oven", "utensils", "wine-glass"].every((key) => !categories["Food & Drink"].includes(key)));
  assert.ok(["banana", "beer", "chicken", "cupcake", "donut", "noodles", "salad", "sandwich", "soup", "tea"].every((key) => categories["Food & Drink"].includes(key)));
  assert.ok(["airport", "bridge", "church", "city", "ferris-wheel", "information-circle", "lighthouse", "map", "monument", "shopping-bag", "waterfall", "cloud", "cloud-sun", "droplets", "fog", "rain", "snowflake", "sun", "thunderstorm", "umbrella", "wind"].every((key) => categories["Travel & Places"].includes(key)));
  assert.ok(!categories.Amenities.includes("droplets"));
  assert.ok(!categories["Travel & Places"].includes("tree"));
  assert.ok(!categories["Travel & Places"].includes("route"));
  assert.equal(iconPickerLabel("tv"), "TV");
  assert.equal(iconPickerLabel("airline-seat"), "Seat");
  assert.equal(iconPickerLabel("map-pin"), "Pin");
  assert.equal(iconPickerLabel("paw"), "Pet");
  assert.equal(iconPickerLabel("priority-star"), "Star");
  assert.equal(iconPickerLabel("non-smoking"), "Non-Smoking");
  assert.equal(iconPickerLabel("information-circle"), "Info");
  assert.ok(categories.Amenities.filter((key) => key.startsWith("amenity-")).every((key) => !iconPickerLabel(key).startsWith("Amenity ")));
  for (const key of ["baby", "bridge", "bus", "cable-car", "car", "cloud", "helicopter", "subway", "taxi", "train", "tram", "van"]) {
    assert.ok(ICON_REGISTRY[key].includes("<path"), `${key} should use the refreshed outline`);
  }
  const referenceVehicleKeys = ["car", "bus", "subway", "taxi", "train", "tram", "van"];
  const refreshedPickerIcons = [...referenceVehicleKeys, "cloud"].map((key) => ICON_REGISTRY[key]);
  assert.equal(new Set(refreshedPickerIcons).size, refreshedPickerIcons.length);
  for (const key of referenceVehicleKeys) {
    const icon = ICON_REGISTRY[key];
    assert.match(icon, /fill="none" stroke="currentColor" stroke-width="1\.5"/u, `${key} should be stroke-only and theme-aware`);
    assert.equal((icon.match(/fill="/gu) ?? []).length, 1, `${key} should not introduce a solid fill`);
    assert.doesNotMatch(icon, /<(?:rect|ellipse|circle|polygon|polyline)\b/u, `${key} should use path-only contours`);
    assert.ok((icon.match(/<path /gu) ?? []).length >= 1, `${key} should contain an outline contour`);
    assert.ok((icon.match(/<path /gu) ?? []).length <= 8, `${key} should remain compact at 24px`);
  }
});

test("centers every icon picker glyph in a fixed tile row", async () => {
  const styles = await readFile("src/client/styles/inline-edit.css", "utf8");

  assert.ok(styles.includes("grid-template-rows: minmax(0,1fr) auto;"));
  assert.ok(styles.includes(".inline-icon-grid button > svg {"));
  assert.ok(styles.includes("  display: block;\n  width: 23px;\n  height: 23px;\n  margin: 0 auto;"));
  assert.ok(styles.includes(".inline-icon-grid button > span {"));
  assert.ok(styles.includes("  width: 100%;"));
  assert.ok(styles.includes("  text-align: center;"));
});
test("uses trash cans instead of X glyphs for content removal controls", async () => {
  const [shell, generic, stay] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("src/client/sections/generic.js", "utf8"),
    readFile("src/client/sections/stay.js", "utf8"),
  ]);
  const shellRemoveButtons = [...shell.matchAll(/<button class="(?:hero-structure-remove|section-title-action section-title-remove)"[\s\S]*?<\/button>/gu)].map(([markup]) => markup);
  const editorRemoveButtons = [...`${generic}\n${stay}`.matchAll(/<button[^>]+data-(?:table-action="delete-row"|generic-list-action="delete"|amenity-action="delete-item"|anatomy-action="delete-bed"|list-action="delete")[^>]*>[\s\S]*?<\/button>/gu)].map(([markup]) => markup);

  assert.equal(shellRemoveButtons.length, 5);
  assert.ok(shellRemoveButtons.every((markup) => /M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6/u.test(markup)));
  assert.ok(editorRemoveButtons.length >= 7);
  assert.ok(editorRemoveButtons.every((markup) => /renderActionIcon\("trash"\)/u.test(markup)));
  assert.ok([...shellRemoveButtons, ...editorRemoveButtons].every((markup) => !/[\u00d7\u00c3\u2014]/u.test(markup)));
});
