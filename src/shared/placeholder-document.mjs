export const PLACEHOLDER_TEXT = "Add details";
export const PLACEHOLDER_SENTENCE = "Add a helpful note or description.";

const LEGACY_PLACEHOLDER_COPY = new Set(["Lorem ipsum", "Lorem ipsum dolor sit amet.", "Lorem ipsum dolor sit amet, consectetur adipiscing elit."]);
const AMENITY_GROUP_PLACEHOLDERS = Object.freeze([
  ["Kitchen & Dining", "Add a kitchen or dining feature"],
  ["Sleep and Laundry", "Add a sleep or laundry feature"],
  ["Bath and Spa", "Add a bathroom or wellness feature"],
  ["Home Comforts", "Add a comfort or essential feature"],
  ["Work and Play", "Add a work or entertainment feature"],
  ["Outdoor Living", "Add an outdoor feature"],
]);

const GENERIC_TEXT_PLACEHOLDERS = new Map([
  ["title", "Card title"],
  ["name", "Name"],
  ["label", "Label"],
  ["value", "Add information"],
  ["address", "Address"],
]);

const BLOCK_PLACEHOLDERIZERS = new Map([
  ["travel-essentials", placeholderizeTravelEssentials],
  ["flight", placeholderizeFlight],
  ["stay-summary", placeholderizeStaySummary],
  ["stay-amenities", placeholderizeAmenities],
  ["stay-distances", placeholderizeDistances],
  ["stay-anatomy", placeholderizeAnatomy],
  ["essentials", placeholderizeEssentials],
  ["day", placeholderizeDay],
  ["saved-places", placeholderizeSavedPlaces],
  ["note", (data) => ({ ...data, title: "Note title", text: "Add a useful travel note." })],
  ["image-card", (data) => ({ ...data, title: "Photo highlight", text: "Describe this photo or memory." })],
  ["link", placeholderizeLink],
  ["link-card", placeholderizeLink],
  ["table", (data) => ({ ...data, title: "Planning table" })],
  ["icon-list", (data) => placeholderizeCollection(data, "Highlights", "List item")],
  ["checklist", (data) => placeholderizeCollection(data, "Travel checklist", "Checklist item")],
  ["facts", placeholderizeFacts],
]);

const IMAGE_FIELDS = new Set([
  "cover",
  "heroCover",
  "providerCover",
  "originCover",
  "destinationCover",
  "image",
  "media",
]);

const STRUCTURAL_TEXT_FIELDS = new Set([
  "id",
  "type",
  "iconKey",
  "presetId",
  "position",
  "category",
  "priority",
  "directionMode",
  "serviceType",
  "departureTimeZone",
  "arrivalTimeZone",
]);

const DATE_FIELDS = new Set([
  "date",
  "startDate",
  "endDate",
  "checkin",
  "checkout",
  "departureDate",
  "arrivalDate",
]);

const CLOCK_FIELDS = new Set(["departure", "arrival", "checkinTime", "checkoutTime"]);
const LONG_TEXT_FIELDS = new Set(["comment", "description", "details", "notes", "subtitle", "text"]);
const ZERO_TEXT_FIELDS = new Set([
  "area",
  "days",
  "duration",
  "legs",
  "nights",
  "drivingDistance",
  "drivingTime",
  "walkingDistance",
  "walkingTime",
  "cyclingDistance",
  "cyclingTime",
]);

export function placeholderizeDocument(document) {
  const result = structuredClone(document);
  result.meta = placeholderizeMeta(result.meta);
  result.sections = Object.fromEntries(Object.entries(result.sections).map(([section, blocks]) => [
    section,
    blocks.map(placeholderizeBlock),
  ]));
  return result;
}

export function upgradeLegacyPlaceholderCopy(document) {
  const contextual = placeholderizeDocument(document);
  return replaceLegacyCopy(structuredClone(document), contextual);
}

function replaceLegacyCopy(value, contextual) {
  if (typeof value === "string") return LEGACY_PLACEHOLDER_COPY.has(value) ? contextual : value;
  if (Array.isArray(value)) return value.map((entry, index) => replaceLegacyCopy(entry, contextual?.[index]));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    replaceLegacyCopy(entry, contextual?.[key]),
  ]));
}

function placeholderizeTravelEssentials(data, source) {
  return {
    ...data,
    title: "INFORMATION",
    visa: source.visa,
    drivingSide: source.drivingSide,
    currency: "Currency and code",
    plugType: "Plug type",
    voltage: "Voltage",
    frequency: "Frequency",
    language: "Primary language",
    timeZone: "Time zone",
    healthPrecautions: "Add health precautions.",
    vaccines: "Add vaccine guidance.",
  };
}

function placeholderizeMeta(meta) {
  const result = placeholderizeValue(meta);
  result.brandName = "Itinerary";
  result.destination = "Trip title";
  result.region = "City, state or country";
  result.startDate = "";
  result.endDate = "";
  result.days = "0";
  result.legs = "0";
  result.placeholderMode = true;
  if (meta.heroCover !== undefined) result.heroCover = structuredClone(meta.heroCover);
  if (meta.inlineIcons !== undefined) result.inlineIcons = structuredClone(meta.inlineIcons);
  return result;
}

function placeholderizeBlock(block) {
  const result = {
    ...structuredClone(block),
    cover: structuredClone(block.cover),
    data: placeholderizeValue(block.data),
  };
  result.data = placeholderizeBlockData(block.type, result.data, block.data, block.id);
  return result;
}

function placeholderizeBlockData(type, data, source, blockId) {
  const placeholderize = BLOCK_PLACEHOLDERIZERS.get(type);
  return placeholderize ? placeholderize(data, source, blockId) : data;
}

function placeholderizeStaySummary(data) {
  const pillLabels = ["Property type", "Bedrooms and beds", "Bathroom details", "Size or setting"];
  return {
    ...data,
    name: "Accommodation name",
    subtitle: "Add a short description of your stay.",
    propertyPills: Array.isArray(data.propertyPills)
      ? data.propertyPills.map((pill, index) => ({ ...pill, label: pillLabels[index] ?? "Property highlight" }))
      : data.propertyPills,
  };
}

function placeholderizeAmenities(data) {
  return {
    ...data,
    title: "Listing Highlights",
    groups: Array.isArray(data.groups) ? data.groups.map((group, index) => {
      const [label, itemLabel] = AMENITY_GROUP_PLACEHOLDERS[index] ?? ["Amenity category", "Add an amenity highlight"];
      return {
        ...group,
        label,
        items: Array.isArray(group.items) ? group.items.map((item) => ({ ...item, label: itemLabel })) : group.items,
      };
    }) : data.groups,
  };
}

function placeholderizeDistances(data) {
  return {
    ...data,
    title: "Nearby Places",
    origin: "Accommodation address",
    items: Array.isArray(data.items) ? data.items.map((item) => ({
      ...item,
      name: "Landmark or destination",
      address: "Destination address",
    })) : data.items,
  };
}

function placeholderizeAnatomy(data) {
  return {
    ...data,
    title: "Accommodation Layout",
    spaces: Array.isArray(data.spaces) ? data.spaces.map((space) => ({
      ...space,
      label: "Room or space",
      beds: Array.isArray(space.beds) ? space.beds.map((bed) => ({ ...bed, label: "Bed type" })) : space.beds,
    })) : data.spaces,
  };
}

function placeholderizeEssentials(data) {
  return {
    ...data,
    title: "Booking Essentials",
    items: Array.isArray(data.items) ? data.items.map((item) => ({
      ...item,
      label: "Booking detail",
      value: "Add booking information",
    })) : data.items,
  };
}

function placeholderizeDay(data) {
  return {
    ...data,
    title: "Day plan title",
    notes: "Add plans, reminders or booking notes.",
    places: Array.isArray(data.places) ? data.places.map((place) => placeholderizePlace(place, "Place or activity", "Add a useful note about this stop.")) : data.places,
    meals: data.meals && typeof data.meals === "object"
      ? Object.fromEntries(Object.entries(data.meals).map(([meal, options]) => [
        meal,
        Array.isArray(options) ? options.map((option) => ({
          ...option,
          name: meal.charAt(0).toUpperCase() + meal.slice(1) + " plan",
          comment: "Add cuisine, booking or dietary notes.",
        })) : options,
      ]))
      : data.meals,
  };
}

function placeholderizeSavedPlaces(data) {
  return {
    ...data,
    title: "Places of Interest",
    places: Array.isArray(data.places)
      ? data.places.map((place) => placeholderizePlace(place, "Place name", "Why this place belongs on your shortlist."))
      : data.places,
  };
}

function placeholderizePlace(place, name, comment) {
  return { ...place, name, comment };
}

function placeholderizeLink(data) {
  return { ...data, title: "Useful link", description: "Explain what this link is for." };
}

function placeholderizeCollection(data, title, label) {
  return {
    ...data,
    title,
    items: Array.isArray(data.items) ? data.items.map((item) => ({ ...item, label })) : data.items,
  };
}

function placeholderizeFacts(data) {
  return {
    ...data,
    title: "Key details",
    items: Array.isArray(data.items) ? data.items.map((item) => ({ ...item, label: "Detail", value: "Add information" })) : data.items,
  };
}

function placeholderizeFlight(data, source, blockId) {
  const directionMode = flightDirectionMode(source, blockId);
  return {
    ...data,
    direction: directionMode === "inbound" ? "Returning" : "Departing",
    directionMode,
    serviceType: source.serviceType === "layover" ? "layover" : "direct",
    stopCount: source.serviceType === "layover" ? Math.max(1, Number(source.stopCount) || 1) : 0,
    seatCount: Math.max(1, Number(source.seatCount) || 1),
    segments: Array.isArray(data.segments) ? data.segments.map(placeholderizeFlightSegment) : [],
    provider: "Airline",
    flightNumber: "Flight number",
    aircraft: "Aircraft type",
    origin: "Departure airport or city (CODE)",
    originCity: "Origin city",
    destination: "Arrival airport or city (CODE)",
    destinationCity: "Destination city",
    seats: "Seat assignment",
    details: "Cabin, fare or booking details",
    stop: source.serviceType === "layover" ? "Layover details" : "Direct",
    notes: "Add a helpful flight note.",
  };
}

function placeholderizeFlightSegment(segment, index) {
  return {
    ...segment,
    id: segment.id || `flight-segment-${index + 2}`,
    provider: "Airline",
    flightNumber: "Flight number",
    aircraft: "Aircraft type",
    origin: "Layover airport or city (CODE)",
    originCity: "Layover city",
    destination: "Arrival airport or city (CODE)",
    destinationCity: "Destination city",
    layoverDuration: "Layover duration",
    layoverNote: "Change planes at layover airport",
  };
}

function flightDirectionMode(source, blockId) {
  if (/return|inbound/iu.test(String(blockId ?? ""))) return "inbound";
  if (source.directionMode === "inbound" || source.directionMode === "outbound") return source.directionMode;
  return /volta|return|inbound/iu.test(String(source.direction ?? "")) ? "inbound" : "outbound";
}

function placeholderizeValue(value, field = "", parent = null) {
  if (IMAGE_FIELDS.has(field)) return structuredClone(value);
  if (Array.isArray(value)) return value.map((entry) => placeholderizeValue(entry, "", value));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      placeholderizeValue(entry, key, value),
    ]));
  }
  return placeholderPrimitive(value, field, parent);
}


function placeholderPrimitive(value, field, parent) {
  if (typeof value === "string") return placeholderString(field, value);
  if (typeof value === "number") return placeholderNumber(field, value, parent);
  if (typeof value === "boolean" && field === "checked") return false;
  return value;
}
function placeholderString(field, value) {
  if (STRUCTURAL_TEXT_FIELDS.has(field)) return value;
  if (DATE_FIELDS.has(field)) return "";
  if (CLOCK_FIELDS.has(field)) return "00:00";
  if (ZERO_TEXT_FIELDS.has(field)) return "0";
  if (isUrlField(field)) return "";
  if (GENERIC_TEXT_PLACEHOLDERS.has(field)) return GENERIC_TEXT_PLACEHOLDERS.get(field);
  if (LONG_TEXT_FIELDS.has(field)) return PLACEHOLDER_SENTENCE;
  return PLACEHOLDER_TEXT;
}

function placeholderNumber(field, value, parent) {
  if (field === "quantity") return Math.max(1, value);
  if (field === "stopCount" && parent?.serviceType === "layover") return 1;
  return 0;
}

function isUrlField(field) {
  return field === "link" || field.endsWith("Url");
}
