import assert from "node:assert/strict";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { updateTransportStructuredField } from "../../src/client/editor/inline-transport-editor.js";
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
  block.data.providerCover = {
    url: "https://example.com/latam.jpg",
    alt: "LATAM aircraft",
    position: "top",
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
  assert.ok(view.indexOf('class="entry-links"') < view.indexOf('class="detail-strip"'));
  assert.match(view, /class="transport-attachment-button"[^>]+data-transport-attachment/);
  assert.ok(view.indexOf('class="route-mode"') < view.indexOf('class="route-duration"'));
  assert.match(view, /<small class="route-duration" data-inline-static>2 h 10 m<\/small>/);
  assert.match(view, /<span aria-hidden="true" data-inline-static> · <\/span>/);
  assert.match(view, /stroke-width="1\.5"[\s\S]+M17\.8 19 16 11/);
  assert.doesNotMatch(view, /m21 16-8-4\.8/);
  assert.doesNotMatch(view, /duration-pill|transport-duration|provider-visual/);
  assert.equal((view.match(/class="route-location-name/g) ?? []).length, 2);
  assert.equal((view.match(/class="route-location-media"/g) ?? []).length, 2);
  assert.ok(view.indexOf('class="route-location-name route-origin-name"') < view.indexOf('class="route-timeline"'));
  assert.match(view, /route-origin-endpoint"><span class="route-location-media"[^]+<span class="route-endpoint-copy">/);
  assert.match(view, /route-destination-endpoint"><span class="route-endpoint-copy"[^]+<span class="route-location-media">/);
  assert.match(view, /src="https:\/\/example\.com\/gig\.jpg"/);
  assert.match(view, /class="provider-icon has-provider-image position-top"><img src="https:\/\/example\.com\/latam\.jpg"/);
  assert.match(view, /class="transport-seats"><span class="transport-seat-summary">[\s\S]+<svg[\s\S]+<span class="transport-seat-copy">/);
  assert.equal((editor.match(/data-transport-cover=/g) ?? []).length, 3);
  assert.match(editor, /data-transport-cover="providerCover"/);
  assert.match(editor, /data-transport-cover="originCover"/);
  assert.match(editor, /data-transport-cover="destinationCover"/);
  assert.match(editor, /<strong>Provider Image<\/strong><small>Change<\/small>/);
  assert.match(editor, /class="transport-cover-preview"><img src="https:\/\/example\.com\/latam\.jpg"/);

  block.data.mapUrl = "javascript:alert(1)";
  block.data.websiteUrl = "";
  assert.doesNotMatch(transportConfig.render(block, false), /class="map-link"/);
});

test("transport cards expose direction, flight type, stop and seat selectors in place", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  let view = transportConfig.render(flight, false);
  assert.match(view, /data-inline-transport-field="directionMode"/);
  assert.match(view, /data-inline-transport-field="serviceType"/);
  assert.match(view, /data-inline-transport-field="stopCount"/);
  assert.match(view, /data-inline-transport-field="seatCount"/);
  assert.match(view, /class="transport-seat-count-view" data-inline-static>x2<\/span>/);
  assert.match(view, /class="route-duration" data-inline-static/);
  assert.ok(view.indexOf('class="transport-seat-count-view"') < view.indexOf('class="transport-seat-copy"'));

  assert.equal(updateTransportStructuredField(flight, "directionMode", "inbound"), true);
  assert.equal(updateTransportStructuredField(flight, "serviceType", "layover"), true);
  assert.equal(updateTransportStructuredField(flight, "stopCount", "3"), true);
  assert.equal(updateTransportStructuredField(flight, "seatCount", "4"), true);
  assert.equal(flight.data.direction, "Inbound");
  assert.equal(flight.data.stop, "Layover · 3 stops");
  assert.equal(flight.data.seatCount, 4);

  view = transportConfig.render(flight, false);
  assert.match(view, /data-inline-transport-view="directionMode">Inbound<\/span>/);
  assert.match(view, /data-inline-transport-view="serviceType">Layover · 3 stops<\/strong>/);
  assert.match(view, /class="transport-seat-count-view" data-inline-static>x4<\/span>/);
});

test("transport duration ignores legacy copy and derives from endpoint timing", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  flight.data.duration = "99 h";
  flight.data.departureDate = "2026-10-24";
  flight.data.arrivalDate = "2026-10-25";
  flight.data.departure = "23:00";
  flight.data.arrival = "01:15";
  const view = transportConfig.render(flight, false);
  assert.match(view, /class="route-duration" data-inline-static>2 h 15 m<\/small>/);
  assert.doesNotMatch(view, />99 h</);
});

test("transport cards finish with an editable note row and fixed label", () => {
  const block = createDefaultDocument().sections.transport[0];
  block.data.notes = "Meet at Terminal 2.";
  const view = transportConfig.render(block, false);
  assert.match(view, /<p class="day-note transport-note"><strong data-inline-static>Observações:<\/strong> Meet at Terminal 2\.<\/p><\/article>$/);
});

test("agenda note labels stay fixed while their note text remains available for inline editing", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day");
  const view = agendaConfig.render(block, false);
  assert.match(view, /<p class="day-note"><strong data-inline-static>Observações:<\/strong>\s+[^<]+<\/p>/);
});

test("LATAM flight cards use the Rio airport image while keeping the provider fallback", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  assert.equal(flight.data.providerCover, null);
  assert.equal(flight.data.originCover.url, "/assets/rio-de-janeiro-airport.png");
  assert.match(transportConfig.render(flight, false), /<img src="\/assets\/rio-de-janeiro-airport\.png"/);
  assert.match(transportConfig.render(flight, false), /class="provider-icon"/);
  assert.match(transportConfig.render(flight, true), /data-transport-cover="providerCover"/);
});

test("Telch transfer cards start without images and keep the image editor available", () => {
  const transfers = createDefaultDocument().sections.transport.filter((block) => block.type === "transfer");
  assert.equal(transfers.length, 2);

  for (const block of transfers) {
    assert.equal(block.data.providerCover, null);
    assert.equal(block.data.originCover, null);
    assert.equal(block.data.destinationCover, null);
    assert.doesNotMatch(transportConfig.render(block, false), /<img\b/);
    assert.match(transportConfig.render(block, true), /data-transport-cover="providerCover"/);
  }
});

test("food entries render editable priorities and optional descriptions like compact place cards", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => (
    entry.type === "day"
    && entry.data.places.length
    && Object.values(entry.data.meals).some((meal) => meal.length)
  ));
  for (const meal of Object.values(block.data.meals)) {
    for (const option of meal) {
      option.priority = "high";
      option.comment = "A concise meal description.";
    }
  }

  const view = agendaConfig.render(block, false);
  const food = view.split('<p class="block-label">Refeições</p>')[1].split('<p class="day-note">')[0];
  const editor = agendaConfig.render(block, true);
  assert.equal((editor.match(/>\+ Add Meal<\/button>/g) ?? []).length, 3);
  assert.match(view, /<p class="block-label">Lugar\(es\)<\/p>/);
  assert.match(food, /class="meal-card-heading"[\s\S]+class="place-priority-pill priority-high"[^>]*>High<\/span>/);
  assert.match(food, /<small class="meal-card-description">A concise meal description\.<\/small>/);
  assert.match(editor, /<details class="priority-picker"><summary aria-label="Priority">High<\/summary>/);
  assert.match(editor, /data-food-action="priority" data-priority="high"/);
  assert.match(editor, /class="editor-remove-button" type="button" data-food-action="delete">Remove Meal<\/button>/);
  assert.match(editor, /data-food-field="comment" placeholder="Descrição" aria-label="Descrição">A concise meal description\.<\/textarea>/);
  assert.match(editor, /<details class="priority-picker"><summary aria-label="Priority">High<\/summary>/);
  assert.match(editor, /data-place-action="priority" data-priority="high"/);
  assert.match(editor, /class="editor-remove-button" type="button" data-place-action="delete">Remove Place<\/button>/);

  const untitled = Object.values(block.data.meals).flat()[0];
  untitled.name = "   ";
  block.data.meals = { breakfast: [untitled], lunch: [], dinner: [] };
  const untitledMeals = agendaConfig.render(block, false).split('<p class="block-label">Refeições</p>')[1];
  assert.doesNotMatch(untitledMeals, /class="place-priority-pill/);
});

test("transport URLs and legacy food presentation fields remain optional in the schema", () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport[0].data;
  const food = Object.values(document.sections.agenda.find((block) => block.type === "day" && Object.values(block.data.meals).some((meal) => meal.length)).data.meals).flat()[0];
  delete transport.mapUrl;
  delete transport.websiteUrl;
  delete food.comment;
  delete food.priority;
  assert.equal(validateDocument(document), true);
  food.priority = "urgent";
  assert.throws(() => validateDocument(document), /food option priority/);
  transport.mapUrl = "x".repeat(2_049);
  assert.throws(() => validateDocument(document), /flight mapUrl/);
});

test("Agenda place route modes render only when their optional values are entered", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day" && entry.data.places.length);
  const place = block.data.places[0];
  for (const entry of block.data.places) {
    for (const mode of ["driving", "cycling", "walking"]) {
      entry[`${mode}Distance`] = "";
      entry[`${mode}Time`] = "";
    }
  }
  place.drivingDistance = "4.2 km";
  place.drivingTime = "9 min";
  place.cyclingDistance = "3.9 km";
  place.cyclingTime = "17 min";
  place.walkingDistance = "0 km";
  place.walkingTime = "0";
  place.comment = "";

  const view = agendaConfig.render(block, false);
  const editor = agendaConfig.render(block, true);
  assert.equal((view.match(/data-meal-route-option/g) ?? []).length, 2);
  assert.match(view, /class="meal-route-toggle place-route-toggle"[^>]+data-meal-route-toggle data-mode="driving"/);
  assert.ok(view.indexOf('data-route-mode="driving"') < view.indexOf('data-route-mode="cycling"'));
  assert.ok(view.indexOf('class="place-copy"') < view.indexOf('class="entry-links"'));
  assert.ok(view.indexOf('class="entry-links"') < view.indexOf('class="meal-route-toggle place-route-toggle"'));
  assert.match(view, /<div class="agenda-place-main"><span class="agenda-place-heading">[\s\S]+?<span class="agenda-place-heading-copy">[\s\S]+?<span class="place-priority-pill priority-(?:high|medium|low)"[^>]*>(?:High|Medium|Low)<\/span><\/span><\/span><\/div><div class="agenda-place-footer"><span class="entry-links">[\s\S]+?<button class="meal-route-toggle place-route-toggle"/);
  assert.match(view, /class="place-row priority-(?:high|medium|low) has-routes"/);
  assert.match(view, /<span class="place-priority-pill priority-(?:high|medium|low)" aria-label="(?:High|Medium|Low) priority">(?:High|Medium|Low)<\/span>/);
  assert.match(editor, /class="priority-field priority-(?:high|medium|low)"/);
  assert.match(editor, /data-priority="high"[^>]*class="priority-option priority-high(?: is-selected)?">High<\/button>/);
  assert.match(editor, /data-priority="medium"[^>]*class="priority-option priority-medium(?: is-selected)?">Medium<\/button>/);
  assert.match(editor, /data-priority="low"[^>]*class="priority-option priority-low(?: is-selected)?">Low<\/button>/);
  assert.match(editor, /<legend>Distance from Main Accommodation<\/legend>/);
  assert.doesNotMatch(view, /place-priority-star/);
  assert.doesNotMatch(view, /class="place-meta"|class="priority-badge/);
  assert.doesNotMatch(view, /place-heading-row/);
  assert.doesNotMatch(view, /place-action-dot/);
  assert.match(view, /data-route-mode="driving"[^>]*>[\s\S]*?<span class="meal-route-value">9 m<\/span>/);
  assert.match(view, /data-route-mode="cycling"[^>]* hidden>[\s\S]*?<span class="meal-route-value">17 m<\/span>/);
  assert.doesNotMatch(view, /4\.2 km|3\.9 km/);
  assert.doesNotMatch(view, /data-route-mode="walking"/);
  assert.doesNotMatch(view, /place-route-mode|place-route-modes/);
  assert.doesNotMatch(view, /<small>(?:De carro|De bicicleta|A pé)<\/small>/);
  assert.doesNotMatch(view, />0(?: km| m)?</);
  assert.equal((editor.match(/data-place-field="(?:driving|walking|cycling)(?:Distance|Time)"/g) ?? []).length, block.data.places.length * 6);
  assert.match(editor, /value="0 km" data-place-field="walkingDistance"/);
  assert.match(editor, /value="0" data-place-field="walkingTime"/);
  assert.equal(validateDocument(createDefaultDocument()), true);
});

test("Agenda places expose editable descriptions and render the Acquamotion example", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => (
    entry.type === "day" && entry.data.places.some((place) => place.name === "Acquamotion")
  ));
  const place = block.data.places.find((entry) => entry.name === "Acquamotion");
  const view = agendaConfig.render(block, false);
  const editor = agendaConfig.render(block, true);

  assert.equal(place.comment, "Brazil's only covered themed water park, combining warm thermal pools, slides, wave areas and attractions for all ages.");
  assert.match(view, /class="place-row priority-(?:high|medium|low) has-comment has-routes"/);
  assert.match(view, /<div class="agenda-place-main">[\s\S]*?<span class="agenda-place-heading">[\s\S]+?<span class="place-priority-pill[^>]+>[\s\S]+?<small class="place-comment">/);
  assert.match(view, /<small class="place-comment">Brazil&#39;s only covered themed water park, combining warm thermal pools, slides, wave areas and attractions for all ages\.<\/small>/);
  assert.ok(view.indexOf('class="place-copy"') < view.indexOf('class="place-comment"'));
  assert.ok(view.indexOf('class="place-comment"') < view.indexOf('class="meal-route-toggle place-route-toggle"'));
  assert.equal((editor.match(/data-place-field="comment"/g) ?? []).length, block.data.places.length);
  assert.match(editor, /data-place-field="comment" placeholder="Descrição" aria-label="Descrição">Brazil&#39;s only covered themed water park/);
});

test("default agenda places include Maps links and all house-based travel modes", () => {
  const days = createDefaultDocument().sections.agenda.filter((block) => block.type === "day");
  const places = days.flatMap((block) => block.data.places ?? []);
  assert.ok(places.length > 15);
  for (const place of places) {
    assert.match(place.mapUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    for (const mode of ["driving", "cycling", "walking"]) {
      assert.match(place[`${mode}Distance`], /^\d/);
      assert.match(place[`${mode}Time`], /^\d/);
    }
  }
});

test("every populated default place and meal has a complete route from the house", () => {
  const agenda = createDefaultDocument().sections.agenda;
  const entries = agenda.flatMap((block) => {
    const places = block.data.places ?? [];
    if (block.type !== "day") return places;
    const meals = Object.values(block.data.meals ?? {}).flat().filter((entry) => entry.name.trim());
    return [...places, ...meals];
  });

  assert.ok(entries.length > 30);
  for (const entry of entries) {
    for (const mode of ["driving", "cycling", "walking"]) {
      assert.match(entry[`${mode}Distance`], /^\d/, `${entry.name} should have a ${mode} distance`);
      assert.match(entry[`${mode}Time`], /^\d/, `${entry.name} should have a ${mode} time`);
    }
  }

  const houseEntries = entries.filter((entry) => entry.name === "Casa do Sol");
  assert.ok(houseEntries.length > 1);
  for (const entry of houseEntries) {
    assert.deepEqual([
      entry.drivingDistance,
      entry.drivingTime,
      entry.cyclingDistance,
      entry.cyclingTime,
      entry.walkingDistance,
      entry.walkingTime,
    ], ["0", "0", "0", "0", "0", "0"]);
  }
});

test("every default agenda and Other Places entry has a concise description", () => {
  const places = createDefaultDocument().sections.agenda.flatMap((block) => block.data.places ?? []);
  assert.ok(places.length > 20);
  for (const place of places) {
    assert.ok(place.comment.trim(), `${place.name} should have a description`);
    assert.ok(place.comment.length <= 165, `${place.name} should stay concise`);
  }
});

test("default meal cards use cuisine-only copy instead of place descriptions", () => {
  const meals = createDefaultDocument().sections.agenda
    .filter((block) => block.type === "day")
    .flatMap((block) => Object.values(block.data.meals).flat())
    .filter((entry) => entry.name.trim());
  const waterPark = meals.find((entry) => entry.name === "Acquamotion");
  const pizza = meals.find((entry) => entry.name === "BOSKO PIZZERIA Napoletana");

  assert.equal(waterPark.comment, "Burgers, hot dogs & pizza");
  assert.equal(pizza.comment, "Neapolitan pizza");
  assert.equal(meals.every((entry) => entry.comment && !entry.comment.endsWith(".")), true);
});

test("saved places render as editable restaurant and landmark shortlists", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "saved-places");
  block.data.places[0].comment = "A memorable restaurant worth adding to the plan.";
  block.data.places[0].priority = "high";
  const view = agendaConfig.render(block, false);
  const editor = agendaConfig.render(block, true);

  assert.match(view, /<h3>Other Places<\/h3>/);
  assert.match(view, /saved-place-group-restaurant/);
  assert.match(view, /saved-place-group-landmark/);
  assert.match(view, /<h4>Restaurants<\/h4>/);
  assert.match(view, /<h4>Landmarks<\/h4>/);
  assert.doesNotMatch(view, /saved-places-emblem|saved-place-group-icon|saved-place-count|Local Shortlist/);
  assert.equal((view.match(/class="food-row saved-place-card"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="food-card-copy"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="meal-card-main"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="meal-card-footer/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="place-priority-pill/g) ?? []).length, block.data.places.length);
  assert.match(view, /<small class="meal-card-description">A memorable restaurant worth adding to the plan\.<\/small>/);
  const routeReadyPlaces = block.data.places.filter((place) => (
    [place.drivingTime, place.cyclingTime, place.walkingTime].filter(Boolean).length > 1
  ));
  assert.equal((view.match(/data-meal-route-toggle/g) ?? []).length, routeReadyPlaces.length);
  assert.doesNotMatch(view, /meal-heading-icon|food-row-open/);
  assert.doesNotMatch(view, /place-route-mode|place-priority-star|place-comment|meal-heading-icon/);
  assert.equal((view.match(/class="transport-attachment-button is-unavailable"/g) ?? []).length, block.data.places.length);
  assert.equal((editor.match(/data-place-field="category"/g) ?? []).length, block.data.places.length);
  assert.match(editor, /option value="restaurant" selected/);
  assert.match(editor, /option value="landmark" selected/);
});

test("agenda places always expose Maps, Website and attachment actions", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day" && entry.data.places.length);
  block.data.places.forEach((place) => {
    place.mapUrl = "";
    place.websiteUrl = "";
  });

  const view = agendaConfig.render(block, false);
  assert.equal((view.match(/class="map-link is-unavailable"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="website-link is-unavailable"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="transport-attachment-button is-unavailable"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/class="entry-links"/g) ?? []).length, block.data.places.length);
  assert.equal((view.match(/Nenhuma refeição planejada\./g) ?? []).length, 1);
  assert.doesNotMatch(view, /class="meal-group"/);
  assert.doesNotMatch(view, /food-row-open/);
  assert.match(view, /data-section="agenda"[^>]+data-block-id="agenda-/);
});
