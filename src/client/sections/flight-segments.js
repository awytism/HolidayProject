import { formatClockTime, formatDisplayDate } from "../../shared/date-utils.mjs";
import { deriveTransportDuration } from "../../shared/transport-duration.mjs";
import { renderIcon } from "../ui/icon-registry.js";
import { escapeHtml, initials } from "../utils/html.js";

const planeIcon = renderIcon("airplane");
const mapPinIcon = renderIcon("map-pin");
const SEGMENT_FIELDS = new Set([
  "provider", "flightNumber", "aircraft", "origin", "originCity", "destination", "destinationCity",
  "departure", "arrival", "departureDate", "arrivalDate", "departureTimeZone", "arrivalTimeZone",
  "layoverDuration", "layoverNote",
]);

export function syncFlightSegments(data, count) {
  const target = Math.max(0, Math.min(9, Number(count) || 0));
  const existing = Array.isArray(data.segments) ? data.segments.slice(0, target) : [];
  while (existing.length < target) {
    const previous = existing.at(-1) ?? data;
    existing.push(createFlightSegment(existing.length, previous));
  }
  data.segments = existing;
  return existing;
}

export function createFlightSegment(index, previous = {}) {
  return {
    id: `flight-segment-${index + 2}`,
    provider: "Airline",
    flightNumber: "Flight number",
    aircraft: "Aircraft type",
    origin: previous.destination || "Layover airport or city (CODE)",
    originCity: previous.destinationCity || "Layover city",
    destination: "Arrival airport or city (CODE)",
    destinationCity: "Destination city",
    departure: "00:00",
    arrival: "00:00",
    departureDate: previous.arrivalDate || "",
    arrivalDate: "",
    departureTimeZone: previous.arrivalTimeZone || "America/Sao_Paulo",
    arrivalTimeZone: "America/Sao_Paulo",
    layoverDuration: "Layover duration",
    layoverNote: "Change planes at layover airport",
  };
}

export function updateFlightSegmentField(block, index, field, value) {
  if (block?.type !== "flight" || !SEGMENT_FIELDS.has(field)) return false;
  const segment = block.data.segments?.[index];
  if (!segment) return false;
  segment[field] = String(value ?? "").trim();
  return true;
}

export function deriveFlightItineraryDuration(data) {
  const finalSegment = activeFlightSegments(data).at(-1);
  if (!finalSegment || !finalSegment.arrivalDate) return deriveFlightPathDuration(data);
  return deriveTransportDuration({
    ...data,
    arrival: finalSegment.arrival,
    arrivalDate: finalSegment.arrivalDate || data.departureDate || data.date || "",
    arrivalTimeZone: finalSegment.arrivalTimeZone,
  });
}

export function deriveFlightPathDuration(data) {
  return deriveTransportDuration({
    ...data,
    arrivalDate: data.arrivalDate || data.departureDate || data.date || "",
  });
}

export function renderLayoverFlightPaths(data) {
  return activeFlightSegments(data).map((segment, index) => (
    `${renderLayoverDivider(segment, index)}${renderFlightPath(segment, index)}`
  )).join("");
}

function activeFlightSegments(data) {
  if (data.serviceType !== "layover" || !Array.isArray(data.segments)) return [];
  return data.segments.slice(0, Math.max(0, Number(data.stopCount) || 0));
}

function renderLayoverDivider(segment, index) {
  return `<div class="flight-layover-divider" data-flight-layover-index="${index}"><strong data-inline-flight-segment-field="layoverDuration" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment.layoverDuration || "Layover duration")}</strong><span aria-hidden="true">•</span><span data-inline-flight-segment-field="layoverNote" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment.layoverNote || "Change planes at layover airport")}</span></div>`;
}

function renderFlightPath(segment, index) {
  return `<section class="flight-path flight-path-extra" data-flight-segment-index="${index}"><div class="flight-carrier-row"><div class="provider flight-carrier"><span class="provider-icon flight-airline-mark">${escapeHtml(initials(segment.provider || "Airline"))}</span><div class="flight-carrier-copy"><strong class="flight-airline" data-inline-flight-segment-field="provider" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment.provider || "Airline")}</strong><span class="flight-number" data-inline-flight-segment-field="flightNumber" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment.flightNumber || "Flight number")}</span><span class="flight-aircraft" data-inline-flight-segment-field="aircraft" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment.aircraft || "Aircraft type")}</span></div></div></div><div class="flight-timeline">${renderEndpoint(segment, index, "origin")}<div class="flight-journey"><span class="flight-journey-icon" aria-hidden="true">${planeIcon}</span><div class="flight-journey-copy"><strong class="route-duration" data-inline-static>${escapeHtml(deriveFlightPathDuration(segment))}</strong>${renderOvernight(segment)}</div></div>${renderEndpoint(segment, index, "destination")}</div></section>`;
}

function renderEndpoint(segment, index, kind) {
  const origin = kind === "origin";
  const timeField = origin ? "departure" : "arrival";
  const dateField = origin ? "departureDate" : "arrivalDate";
  const locationField = origin ? "origin" : "destination";
  const cityField = origin ? "originCity" : "destinationCity";
  const fallbackCity = origin ? "Layover city" : "Destination city";
  const arrivalDate = origin ? "" : renderArrivalDate(segment);
  return `<div class="flight-endpoint flight-${kind}"><span class="flight-time flight-segment-time-view">${escapeHtml(formatClockTime(segment[timeField]))}</span><input class="flight-segment-time-control" type="time" value="${escapeHtml(segment[timeField])}" data-inline-flight-segment-field="${timeField}" data-flight-segment-index="${index}" data-inline-ignore aria-label="${origin ? "Departure" : "Arrival"} time"><span class="flight-airport-copy"><strong data-inline-flight-segment-field="${locationField}" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment[locationField])}</strong><small class="flight-city">${mapPinIcon}<span data-inline-flight-segment-field="${cityField}" data-flight-segment-index="${index}" data-inline-ignore>${escapeHtml(segment[cityField] || fallbackCity)}</span></small>${arrivalDate}<input class="flight-segment-date-control" type="date" value="${escapeHtml(segment[dateField])}" data-inline-flight-segment-field="${dateField}" data-flight-segment-index="${index}" data-inline-ignore aria-label="${origin ? "Departure" : "Arrival"} date"></span></div>`;
}

function renderArrivalDate(segment) {
  const rawDate = String(segment.arrivalDate ?? "").trim();
  const departureDate = String(segment.departureDate ?? "").trim();
  if (!rawDate || rawDate === departureDate) return "";
  const date = formatDisplayDate(rawDate);
  if (!date) return "";
  return `<small class="flight-arrival-date" data-inline-static><span>Arrives</span> ${escapeHtml(date)}</small>`;
}
function renderOvernight(segment) {
  if (!segment.departureDate || !segment.arrivalDate || segment.arrivalDate <= segment.departureDate) return "";
  return `<span class="flight-overnight" data-inline-static>Overnight flight</span>`;
}
