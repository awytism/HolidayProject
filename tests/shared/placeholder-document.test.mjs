import assert from "node:assert/strict";
import { createStore } from "../../src/client/app/store.js";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import {
  placeholderizeDocument,
  upgradeLegacyPlaceholderCopy,
} from "../../src/shared/placeholder-document.mjs";
import { validateDocument } from "../../src/shared/document-schema.mjs";

const IMAGE_FIELDS = new Set([
  "cover",
  "heroCover",
  "providerCover",
  "originCover",
  "destinationCover",
  "image",
  "media",
]);

test("replaces trip information while preserving every image field", () => {
  const source = createDefaultDocument();
  source.meta.heroCover = {
    url: "/assets/brand/gramado-logo.svg",
    alt: "Original hero description",
    position: "top",
  };
  const imagesBefore = collectImages(source);

  const result = placeholderizeDocument(source);

  assert.equal(validateDocument(result), true);
  assert.deepEqual(collectImages(result), imagesBefore);
  assert.equal(source.meta.destination, "Gramado");
  assert.equal(result.meta.destination, "Trip title");
  assert.equal(result.meta.brandName, "Itinerary");
  assert.equal(result.meta.region, "City, state or country");
  assert.equal(result.meta.startDate, "");
  assert.equal(result.meta.endDate, "");
  assert.equal(result.meta.placeholderMode, true);

  const flights = result.sections.transport.filter((block) => block.type === "flight");
  const flight = flights[0].data;
  assert.equal(flight.provider, "Airline");
  assert.equal(flight.flightNumber, "Flight number");
  assert.equal(flight.aircraft, "Aircraft type");
  assert.equal(flight.origin, "Departure airport or city (CODE)");
  assert.equal(flight.destination, "Arrival airport or city (CODE)");
  assert.equal(flight.seats, "Seat assignment");
  assert.equal(flight.details, "Cabin, fare or booking details");
  assert.equal(flight.notes, "Add a helpful flight note.");
  assert.equal(flight.departure, "00:00");
  assert.equal(flight.duration, "0");
  assert.equal(flight.mapUrl, "");
  assert.equal(flight.directionMode, "outbound");
  assert.equal(flights[1].data.directionMode, "inbound");
  assert.equal(flights[1].data.direction, "Returning");

  const day = result.sections.agenda.find((block) => block.type === "day").data;
  assert.equal(day.title, "Day plan title");
  assert.equal(day.notes, "Add plans, reminders or booking notes.");
  assert.equal(day.places[0].name, "Place or activity");
  assert.equal(day.places[0].drivingTime, "0");
});

test("upgrades only exact legacy placeholder copy and preserves real content", () => {
  const source = createDefaultDocument();
  const day = source.sections.agenda.find((block) => block.type === "day").data;
  source.meta.brandName = "Lorem ipsum";
  source.sections.stay.find((block) => block.type === "stay-summary").data.name = "Lorem ipsum";
  day.title = "Lorem ipsum";
  day.notes = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
  day.places[0].name = "A real booked activity";

  const result = upgradeLegacyPlaceholderCopy(source);

  assert.equal(validateDocument(result), true);
  assert.equal(result.meta.brandName, "Itinerary");
  assert.equal(result.sections.stay.find((block) => block.type === "stay-summary").data.name, "Accommodation name");
  assert.equal(result.sections.agenda.find((block) => block.type === "day").data.title, "Day plan title");
  assert.equal(result.sections.agenda.find((block) => block.type === "day").data.notes, "Add plans, reminders or booking notes.");
  assert.equal(result.sections.agenda.find((block) => block.type === "day").data.places[0].name, "A real booked activity");
  assert.doesNotMatch(JSON.stringify(result), /Lorem ipsum/u);
});

test("placeholder conversion is idempotent", () => {
  const once = placeholderizeDocument(createDefaultDocument());
  const twice = placeholderizeDocument(once);
  assert.deepEqual(twice, once);
});


test("the first real edit restores calculated trip statistics", () => {
  const store = createStore();
  const document = placeholderizeDocument(createDefaultDocument());
  store.load(document, 1);
  store.beginEdit();

  store.mutate((draft) => {
    draft.meta.destination = "A real destination";
  });

  assert.equal(store.getDocument().meta.placeholderMode, undefined);
  assert.equal(store.getDocument().meta.destination, "A real destination");
});
function collectImages(value, path = "document", result = {}) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectImages(entry, `${path}[${index}]`, result));
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;
    if (IMAGE_FIELDS.has(key)) result[entryPath] = structuredClone(entry);
    else collectImages(entry, entryPath, result);
  }
  return result;
}
