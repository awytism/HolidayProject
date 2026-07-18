import assert from "node:assert/strict";
import test from "node:test";
import { stayConfig } from "../../src/client/sections/stay.js";
import { setListItem } from "../../src/client/editor/commands.js";
import { createDefaultDocument, createLegacyStayDistancesBlock } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("removes Landmark Distances from the default Stay section and Add menu", () => {
  const document = createDefaultDocument();

  assert.equal(validateDocument(document), true);
  assert.equal(document.sections.stay.some((block) => block.type === "stay-distances"), false);
  assert.equal(stayConfig.addTypes.some((entry) => entry.type === "stay-distances"), false);
});
test("renders centered nearest-first landmarks with Maps-only and route links", () => {
  const block = createLegacyStayDistancesBlock();
  block.data.items.reverse();
  const view = stayConfig.render(block, false);
  const editor = stayConfig.render(block, true);

  assert.equal((view.match(/class="distance-landmark"/g) ?? []).length, 4);
  assert.equal((view.match(/class="distance-mode" href=/g) ?? []).length, 12);
  assert.equal((view.match(/travelmode=driving/g) ?? []).length, 4);
  assert.equal((view.match(/travelmode=walking/g) ?? []).length, 4);
  assert.equal((view.match(/travelmode=bicycling/g) ?? []).length, 4);
  assert.match(view, /Driving/);
  assert.doesNotMatch(view, /By car/);
  assert.match(view, /Walking/);
  assert.match(view, /Cycling/);
  assert.equal((view.match(/class="distance-time"/g) ?? []).length, 12);
  assert.equal((view.match(/class="map-link"/g) ?? []).length, 4);
  assert.doesNotMatch(view, /class="website-link"/);
  assert.doesNotMatch(view, /Horácio Cardoso|Hortênsias|Tres Pinheiros|Me\. Verônica/);
  const order = ["Mini Mundo", "Rua Coberta", "Lago Negro", "Jardim do Amor"]
    .map((name) => view.indexOf(name));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual([...order].sort((first, second) => first - second), order);
  assert.doesNotMatch(view, /Starting point/);
  assert.doesNotMatch(view, /class="distance-origin"/);
  assert.match(editor, /data-list-property="drivingDistance"/);
  assert.match(editor, /data-list-property="drivingTime"/);
  assert.match(editor, /data-list-property="walkingDistance"/);
  assert.match(editor, /data-list-property="walkingTime"/);
  assert.match(editor, /data-list-property="cyclingDistance"/);
  assert.match(editor, /data-list-property="cyclingTime"/);
  assert.match(editor, /data-list-action="cover"/);
  assert.match(editor, /data-list-action="add"/);
});

test("renders an optional landmark cover image with a text fallback", () => {
  const block = createLegacyStayDistancesBlock();
  block.data.items[0].cover = {
    url: "https://example.com/rua-coberta.jpg",
    alt: "Rua Coberta at night",
    position: "center",
  };

  const view = stayConfig.render(block, false);
  assert.match(view, /class="distance-landmark-media"/);
  assert.match(view, /src="https:\/\/example\.com\/rua-coberta\.jpg"/);
  assert.match(view, /alt="Rua Coberta at night"/);
});

test("stores a cover image selected for a landmark", () => {
  const document = createDefaultDocument();
  const block = createLegacyStayDistancesBlock();
  document.sections.stay.push(block);
  const cover = {
    url: "https://example.com/mini-mundo.jpg",
    alt: "Mini Mundo",
    position: "center",
  };

  setListItem(document, { section: "stay", blockId: block.id, index: 1, property: "cover" }, cover);
  assert.deepEqual(block.data.items[1].cover, cover);
  assert.equal(validateDocument(document), true);
});
