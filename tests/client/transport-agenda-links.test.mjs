import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { updateTransportNotesVisibility, updateTransportStructuredField } from "../../src/client/editor/inline-transport-editor.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { deriveFlightPathDuration, updateFlightSegmentField } from "../../src/client/sections/flight-segments.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

test("flight cards place accommodation-sized Maps, Website and attachment actions inside the Notes row", async () => {
  const block = createDefaultDocument().sections.transport.find((entry) => entry.type === "flight");
  block.data.mapUrl = "https://maps.google.com/?q=GIG";
  block.data.websiteUrl = "https://www.latamairlines.com/";
  block.data.providerCover = {
    url: "https://example.com/latam.jpg",
    alt: "LATAM aircraft",
    position: "top",
  };

  const view = transportConfig.render(block, false);
  const editor = transportConfig.render(block, true);
  assert.match(view, /class="content-block transport-card flight flight-information-card"/);
  assert.match(view, /class="flight-summary"/);
  assert.match(view, /class="flight-carrier-row"/);
  assert.match(view, /class="flight-timeline"/);
  assert.match(view, /class="flight-information-strip"/);
  assert.doesNotMatch(view, /flight-journey-line/);
  assert.match(view, /<strong data-inline-static>Details<\/strong>/);
  assert.match(view, /class="flight-note-region"><p class="day-note transport-note">[\s\S]*?<\/p><div class="flight-resource-row has-live-resources"><span class="entry-links">/);
  assert.equal((view.match(/class="map-link"/g) ?? []).length, 1);
  assert.equal((view.match(/class="website-link"/g) ?? []).length, 1);
  assert.equal((view.match(/class="transport-attachment-button is-unavailable"/g) ?? []).length, 1);
  assert.match(view, /class="provider-icon flight-airline-mark has-provider-image position-top"><img src="https:\/\/example\.com\/latam\.jpg"/);
  assert.doesNotMatch(view, /route-location-media|wifi|entertainment|power outlet/i);
  assert.ok(view.indexOf('class="flight-carrier-row"') < view.indexOf('class="flight-timeline"'));
  assert.ok(view.indexOf('class="flight-timeline"') < view.indexOf('class="flight-information-strip"'));
  assert.ok(view.indexOf('class="flight-information-strip"') < view.indexOf('class="flight-note-region"'));
  assert.ok(view.indexOf('class="flight-note-region"') < view.indexOf('class="flight-resource-row has-live-resources"'));
  assert.match(view, /class="flight-seat-heading" data-inline-static><svg[^>]*>.*?<\/svg><strong>Seat\(s\)<\/strong><\/span>/s);
  assert.match(editor, /data-block-field="mapUrl"/);
  assert.match(editor, /data-block-field="websiteUrl"/);
  assert.equal((editor.match(/type="url"/g) ?? []).length, 2);
  assert.equal((editor.match(/data-transport-cover=/g) ?? []).length, 3);
  const [flightStyles, polish] = await Promise.all([
    readFile("src/client/styles/flight-card.css", "utf8"),
    readFile("src/client/styles/polish.css", "utf8"),
  ]);
  assert.match(polish, /--content-icon-size:\s*34px/);
  assert.match(polish, /--content-icon-glyph-size:\s*17px/);
  assert.match(flightStyles, /\.flight-resource-row \.map-link,[\s\S]+width:\s*var\(--content-icon-size\)[^}]+height:\s*var\(--content-icon-size\)[^}]+border-radius:\s*9px/);
  assert.match(flightStyles, /\.flight-resource-row \.map-link svg,[\s\S]+width:\s*var\(--content-icon-glyph-size\)[^}]+height:\s*var\(--content-icon-glyph-size\)/);
  assert.match(flightStyles, /body:not\(\.is-inline-editing\) \.flight-resource-row \.is-unavailable,[\s\S]+\.flight-resource-row:not\(\.has-live-resources\)\s*\{\s*display:\s*none/);
  assert.match(flightStyles, /@media \(max-width:600px\)[\s\S]+\.flight-note-region \.transport-note\s*\{[^}]+grid-row:\s*1[^}]*\}[\s\S]+\.flight-note-region \.flight-resource-row\s*\{[^}]+grid-row:\s*2/);

  block.data.websiteUrl = "";
  const mapOnlyView = transportConfig.render(block, false);
  assert.match(mapOnlyView, /class="flight-resource-row has-live-resources"/);
  assert.match(mapOnlyView, /<a class="map-link"/);
  assert.match(mapOnlyView, /class="website-link is-unavailable"/);
  assert.match(mapOnlyView, /class="transport-attachment-button is-unavailable"/);

  block.data.mapUrl = "";
  const emptyView = transportConfig.render(block, false);
  assert.match(emptyView, /class="flight-resource-row"><span class="entry-links">/);
  assert.doesNotMatch(emptyView, /flight-resource-row has-live-resources/);
});

test("flight cards expose direction, service, stop and seat selectors in place", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  let view = transportConfig.render(flight, false);
  assert.match(view, /data-inline-transport-field="directionMode"/);
  assert.match(view, /<option value="outbound" selected>Departing<\/option>/);
  assert.match(view, /<option value="inbound" >Returning<\/option>/);
  assert.match(view, /data-inline-transport-field="serviceType"/);
  assert.match(view, /data-inline-transport-field="stopCount"/);
  assert.match(view, /data-inline-transport-field="seatCount"/);
  assert.match(view, /class="transport-seat-count-view" data-inline-static>×2<\/span>/);

  assert.equal(updateTransportStructuredField(flight, "directionMode", "inbound"), true);
  assert.equal(updateTransportStructuredField(flight, "serviceType", "layover"), true);
  assert.equal(updateTransportStructuredField(flight, "stopCount", "3"), true);
  assert.equal(updateTransportStructuredField(flight, "seatCount", "4"), true);
  assert.equal(flight.data.direction, "Inbound");
  assert.equal(flight.data.stop, "Layover · 3 stops");
  assert.equal(flight.data.seatCount, 4);

  view = transportConfig.render(flight, false);
  assert.match(view, /data-inline-transport-view="directionMode">Returning<\/span>/);
  assert.match(view, /data-inline-transport-view="serviceType">3 stops<\/span>/);
  assert.match(view, /class="transport-seat-count-view" data-inline-static>×4<\/span>/);
});

test("layover count creates exactly one additional editable flight path per stop", () => {
  const document = createDefaultDocument();
  const flight = document.sections.transport.find((block) => block.type === "flight");

  assert.equal(updateTransportStructuredField(flight, "serviceType", "layover"), true);
  assert.equal(flight.data.segments.length, 1);
  assert.equal(updateTransportStructuredField(flight, "stopCount", "2"), true);
  assert.equal(flight.data.segments.length, 2);
  assert.equal(updateFlightSegmentField(flight, 1, "provider", "Second connection airline"), true);
  assert.equal(flight.data.segments[1].provider, "Second connection airline");
  assert.equal(validateDocument(document), true);

  const view = transportConfig.render(flight, false);
  assert.equal((view.match(/class="flight-path /g) ?? []).length, 3);
  assert.equal((view.match(/class="flight-layover-divider"/g) ?? []).length, 2);
  assert.equal((view.match(/class="flight-timeline"/g) ?? []).length, 3);
  assert.match(view, /class="flight-total-duration" data-inline-static>2 h 10 m<\/strong>/);
  assert.match(view, /data-flight-segment-index="1"/);
  assert.match(view, /Second connection airline/);

  assert.equal(updateTransportStructuredField(flight, "stopCount", "1"), true);
  assert.equal(flight.data.segments.length, 1);
  assert.equal(updateTransportStructuredField(flight, "serviceType", "direct"), true);
  assert.deepEqual(flight.data.segments, []);
});

test("direct flights offer an optional arrival date and hide it for same-day arrivals", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  flight.data.serviceType = "direct";
  flight.data.originCity = "";
  flight.data.destinationCity = "";
  flight.data.date = "2026-10-24";
  flight.data.departureDate = "2026-10-24";
  flight.data.arrivalDate = "";
  flight.data.departure = "23:00";
  flight.data.arrival = "01:00";

  let view = transportConfig.render(flight, false);
  assert.equal((view.match(/class="flight-city"><svg/g) ?? []).length, 2);
  assert.match(view, /class="flight-city"><svg[^>]*>[\s\S]*?<span>Origin city<\/span><\/small>/);
  assert.match(view, /class="flight-city"><svg[^>]*>[\s\S]*?<span>Destination city<\/span><\/small>/);
  assert.match(view, /class="flight-arrival-date-control"[^>]+data-inline-date-field="arrivalDate"[^>]*>[\s\S]*?<span>Add arrival date<\/span><\/button>/);
  assert.doesNotMatch(view, /class="flight-arrival-date"|<span>Arrives<\/span>/);
  assert.equal(deriveFlightPathDuration(flight.data), "0 m");

  flight.data.arrivalDate = flight.data.date;
  view = transportConfig.render(flight, false);
  assert.match(view, /class="flight-arrival-date-control"[^>]*>[\s\S]*?<span>Change arrival date<\/span><\/button>/);
  assert.doesNotMatch(view, /class="flight-arrival-date"|<span>Arrives<\/span>/);

  flight.data.arrival = "23:30";
  assert.equal(deriveFlightPathDuration(flight.data), "30 m");
});
test("flight duration is derived from endpoint timing and shown in the summary and timeline", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  flight.data.duration = "99 h";
  flight.data.originCity = "";
  flight.data.destinationCity = "";
  flight.data.departureDate = "2026-10-24";
  flight.data.arrivalDate = "2026-10-25";
  flight.data.departure = "23:00";
  flight.data.arrival = "01:15";
  const view = transportConfig.render(flight, false);
  assert.equal((view.match(/>2 h 15 m</g) ?? []).length, 2);
  assert.match(view, /class="flight-overnight" data-inline-static>Overnight flight<\/span>/);
  assert.match(view, /class="flight-arrival-date" data-inline-static><span>Arrives<\/span> 25\/10\/2026<\/small>/);
  assert.match(view, /class="flight-arrival-date-control"[^>]*>[\s\S]*?<span>Change arrival date<\/span><\/button>/);
  assert.doesNotMatch(view, />99 h</);
});

test("flight cards expose editable information and optional Notes without discarding copy", () => {
  const block = createDefaultDocument().sections.transport.find((entry) => entry.type === "flight");
  block.data.notes = "Meet at Terminal 2.";
  let view = transportConfig.render(block, false);
  assert.match(view, /class="flight-airline">LATAM Airlines Brasil<\/strong>/);
  assert.match(view, /class="flight-number">LA3962<\/span>/);
  assert.match(view, /class="flight-aircraft">Airbus A320<\/span>/);
  assert.match(view, /class="flight-note-region"><p class="day-note transport-note"><strong data-inline-static>Notes:<\/strong> Meet at Terminal 2\.<\/p>/);
  assert.match(view, /data-inline-transport-action="remove-notes"/);

  assert.equal(updateTransportNotesVisibility(block, false), true);
  assert.equal(block.data.notes, "Meet at Terminal 2.");
  view = transportConfig.render(block, false);
  assert.doesNotMatch(view, /class="day-note transport-note"/);
  assert.match(view, /data-inline-transport-action="restore-notes"/);

  assert.equal(updateTransportNotesVisibility(block, true), true);
  assert.match(transportConfig.render(block, false), /Meet at Terminal 2\./);
});

test("agenda note labels stay fixed while their note text remains available for inline editing", () => {
  const block = createDefaultDocument().sections.agenda.find((entry) => entry.type === "day");
  const view = agendaConfig.render(block, false);
  assert.match(view, /<p class="day-note"><strong data-inline-static>Observações:<\/strong>\s+[^<]+<\/p>/);
});

test("flight cards keep one optional airline image control and omit airport imagery", () => {
  const flight = createDefaultDocument().sections.transport.find((block) => block.type === "flight");
  assert.equal(flight.data.providerCover, null);
  const view = transportConfig.render(flight, false);
  assert.match(view, /class="provider flight-carrier" data-inline-image-field="providerCover"/);
  assert.match(view, /class="provider-icon flight-airline-mark">LA<\/span>/);
  assert.doesNotMatch(view, /rio-de-janeiro-airport|route-location-media/);
  assert.match(transportConfig.render(flight, true), /data-transport-cover="providerCover"/);
});

test("legacy transfer cards remain schema-compatible but are not offered by the add menu", () => {
  const transfer = transportConfig.createBlock("transfer");
  assert.deepEqual(transportConfig.addTypes, [{ type: "travel-essentials", label: "Information" }, { type: "flight", label: "Transport" }]);
  assert.equal(validateDocument({
    ...createDefaultDocument(),
    sections: { ...createDefaultDocument().sections, transport: [transfer] },
  }), true);
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
  const food = view.split('<div class="meal-grid">')[1].split('<p class="day-note">')[0];
  const editor = agendaConfig.render(block, true);
  assert.equal((editor.match(/>\+ Add Meal<\/button>/g) ?? []).length, 3);
  assert.match(view, /data-agenda-group-label="places">[\s\S]*?<p class="block-label">Place\(s\)<\/p>/);
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
  const untitledMeals = agendaConfig.render(block, false).split('<div class="meal-grid">')[1];
  assert.doesNotMatch(untitledMeals, /class="place-priority-pill/);
});

test("transport URLs and legacy food presentation fields remain optional in the schema", () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport.find((block) => block.type === "flight").data;
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
  const document = createDefaultDocument();
  const places = [...document.sections.agenda, ...document.sections.places].flatMap((block) => block.data.places ?? []);
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

test("saved places render as one editable flat shortlist", () => {
  const block = createDefaultDocument().sections.places.find((entry) => entry.type === "saved-places");
  block.data.places[0].comment = "A memorable restaurant worth adding to the plan.";
  block.data.places[0].priority = "high";
  const view = agendaConfig.render(block, false);
  const editor = agendaConfig.render(block, true);

  assert.match(view, new RegExp(`data-inline-icon-key="saved-places-title:${block.id}"[^>]+data-inline-icon-name="compass-needle"`));
  assert.doesNotMatch(view, /saved-places-title-icon"[^>]+data-inline-ignore/);
  assert.match(view, /<span class="saved-places-title-copy">Places of Interest<\/span>/);
  assert.match(view, /saved-place-group saved-place-group-all/);
  assert.doesNotMatch(view, /saved-place-group-(?:restaurant|landmark)|<h4>Restaurants<\/h4>|<h4>Landmarks<\/h4>|data-place-category/);
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
  assert.doesNotMatch(editor, /data-place-field="category"|option value="restaurant"|option value="landmark"/);
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
  assert.equal((view.match(/No meals planned\./g) ?? []).length, 1);
  assert.doesNotMatch(view, /class="meal-group"/);
  assert.doesNotMatch(view, /food-row-open/);
  assert.match(view, /data-section="agenda"[^>]+data-block-id="agenda-/);
});
