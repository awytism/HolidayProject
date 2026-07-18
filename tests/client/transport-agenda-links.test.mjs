import assert from "node:assert/strict";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("transport cards expose safe Maps and Website links plus URL editors", () => {
  const block = createDefaultDocument().sections.transport[0];
  block.data.mapUrl = "https://maps.google.com/?q=GIG";
  block.data.websiteUrl = "https://www.latamairlines.com/";
  block.data.originCover = {
    url: "https://example.com/gig.jpg",
    alt: "GIG terminal",
    position: "center",
  };

  const view = transportConfig.render(block, false);
  const editor = transportConfig.render(block, true);
  assert.match(view, /class="map-link"/);
  assert.match(view, /class="website-link"/);
  assert.equal((view.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(editor, /data-block-field="mapUrl"/);
  assert.match(editor, /data-block-field="websiteUrl"/);
  assert.equal((editor.match(/type="url"/g) ?? []).length, 2);
  assert.ok(view.indexOf('class="entry-links"') < view.indexOf('class="route-grid"'));
  assert.ok(view.indexOf('class="route-mode"') < view.indexOf('class="route-duration"'));
  assert.match(view, new RegExp(`class="route-duration">${block.data.duration}<`));
  assert.doesNotMatch(view, /duration-pill|transport-duration|provider-visual/);
  assert.equal((view.match(/class="route-location-name/g) ?? []).length, 2);
  assert.equal((view.match(/class="route-location-media"/g) ?? []).length, 2);
  assert.ok(view.indexOf('class="route-location-name route-origin-name"') < view.indexOf('class="route-timeline"'));
  assert.match(view, /route-origin-endpoint"><span class="route-location-media"[^]+<span class="route-endpoint-copy">/);
  assert.match(view, /route-destination-endpoint"><span class="route-endpoint-copy"[^]+<span class="route-location-media">/);
  assert.match(view, /src="https:\/\/example\.com\/gig\.jpg"/);
  assert.match(view, /class="transport-seats"><svg/);
  assert.equal((editor.match(/data-transport-cover=/g) ?? []).length, 2);
  assert.match(editor, /data-transport-cover="originCover"/);
  assert.match(editor, /data-transport-cover="destinationCover"/);

  block.data.mapUrl = "javascript:alert(1)";
  block.data.websiteUrl = "";
  assert.doesNotMatch(transportConfig.render(block, false), /class="map-link"/);
});

test("food entries omit priority UI while place priorities remain", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => (
    entry.type === "day"
    && entry.data.places.length
    && Object.values(entry.data.meals).some((meal) => meal.length)
  ));
  for (const meal of Object.values(block.data.meals)) {
    for (const option of meal) option.priority = "high";
  }

  const view = agendaConfig.render(block, false);
  const food = view.split('<p class="block-label">Food</p>')[1].split('<p class="day-note">')[0];
  const editor = agendaConfig.render(block, true);
  assert.doesNotMatch(food, /priority-/);
  assert.doesNotMatch(editor, /data-food-action="priority"/);
  assert.match(editor, /data-place-action="priority"/);
});

test("transport URLs remain optional and food priority is not required by the schema", () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport[0].data;
  delete transport.mapUrl;
  delete transport.websiteUrl;
  assert.equal(validateDocument(document), true);
  transport.mapUrl = "x".repeat(2_049);
  assert.throws(() => validateDocument(document), /flight mapUrl/);
});

test("Agenda place route modes render only when their optional values are entered", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day" && entry.data.places.length);
  const place = block.data.places[0];
  place.drivingDistance = "4.2 km";
  place.drivingTime = "9 min";
  place.cyclingDistance = "3.9 km";

  const view = agendaConfig.render(block, false);
  const editor = agendaConfig.render(block, true);
  assert.equal((view.match(/class="place-route-mode"/g) ?? []).length, 2);
  assert.match(view, /<small>Driving<\/small><strong>4\.2 km · 9 min<\/strong>/);
  assert.match(view, /<small>Cycling<\/small><strong>3\.9 km<\/strong>/);
  assert.doesNotMatch(view, /<small>Walking<\/small>/);
  assert.equal((editor.match(/data-place-field="(?:driving|walking|cycling)(?:Distance|Time)"/g) ?? []).length, block.data.places.length * 6);
  assert.equal(validateDocument(createDefaultDocument()), true);
});
