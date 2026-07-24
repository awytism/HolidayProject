import { formatClockTime, formatDisplayDate, getDateLocale } from "../../shared/date-utils.mjs";

import {
  normaliseDirectionMode,
  transportSeatCount,
  transportServiceType,
  transportStopCount,
} from "../editor/inline-transport-editor.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";
import { escapeHtml, initials } from "../utils/html.js";
import { renderEntryImage, renderEntryLinks } from "./shared.js";
import { deriveFlightItineraryDuration, deriveFlightPathDuration, renderLayoverFlightPaths } from "./flight-segments.js";

const planeIcon = renderIcon("airplane");
const seatIcon = renderIcon("airline-seat");
const mapPinIcon = renderIcon("map-pin");

export function renderFlightCard(block, context = {}) {
  const data = block.data;
  const directionMode = normaliseDirectionMode(data.directionMode ?? data.direction);
  const duration = deriveFlightPathDuration(data);
  const totalDuration = deriveFlightItineraryDuration(data);
  const copy = flightCopy(data);
  const resources = renderFlightResources(block, context);

  return `<article class="content-block transport-card flight flight-information-card"><header class="flight-summary"><div class="flight-summary-title"><span class="transport-direction-view" data-inline-transport-view="directionMode">${escapeHtml(localisedDirection(directionMode))}</span>${renderDirectionEditor(directionMode)}<span aria-hidden="true" data-inline-static> · </span><span class="flight-travel-date" data-inline-date-action="block" data-inline-date-field="date" data-inline-date-label="Transport Date">${escapeHtml(copy.date)}</span></div><strong class="flight-total-duration" data-inline-static>${escapeHtml(totalDuration)}</strong></header><div class="flight-card-body"><section class="flight-path flight-path-primary"><div class="flight-carrier-row"><div class="provider flight-carrier" data-inline-image-field="providerCover">${renderProviderVisual(data)}<div class="flight-carrier-copy"><strong class="flight-airline">${escapeHtml(copy.airline)}</strong><span class="flight-number">${escapeHtml(flightNumber(data))}</span><span class="flight-aircraft">${escapeHtml(aircraft(data))}</span></div></div></div><div class="flight-timeline">${renderEndpoint(data, "origin")}<div class="flight-journey"><span class="flight-journey-icon" aria-hidden="true">${planeIcon}</span><div class="flight-journey-copy"><strong class="route-duration" data-inline-static>${escapeHtml(duration)}</strong>${renderServiceDetails(data)}${renderOvernight(data)}</div></div>${renderEndpoint(data, "destination")}</div></section>${renderLayoverFlightPaths(data)}<div class="flight-information-strip"><span class="flight-seat-information"><span class="flight-seat-heading" data-inline-static>${seatIcon}<strong>Seat(s)</strong></span>${renderSeatCount(data)}<span class="flight-seat-copy">${escapeHtml(copy.seats)}</span></span><span class="flight-booking-detail"><strong data-inline-static>Details</strong><span>${escapeHtml(copy.details)}</span></span></div>${renderNotes(data, resources)}</div></article>`;
}

function renderFlightResources(block, context) {
  const attachmentButton = context.attachments?.renderDownloadButton(block.id, context.section, "Download transport attachment")
    ?? `<button class="transport-attachment-button is-unavailable" type="button" data-transport-attachment data-section="${escapeHtml(context.section ?? "transport")}" data-block-id="${escapeHtml(block.id)}" aria-label="Download transport attachment" title="Download transport attachment">${renderActionIcon("file")}</button>`;
  const routeName = `${block.data.origin || "Origin"} to ${block.data.destination || "Destination"}`;
  const links = renderEntryLinks(block.data, routeName, attachmentButton, { showMissing: true });
  const hasLiveResources = ["map-link", "website-link", "transport-attachment-button"]
    .some((className) => links.includes(`class="${className}"`));
  return `<div class="flight-resource-row${hasLiveResources ? " has-live-resources" : ""}">${links}</div>`;
}

function renderNotes(data, resources) {
  if (data.notesVisible === false) {
    return `<div class="flight-note-region is-notes-hidden"><button class="flight-note-restore" type="button" data-inline-transport-action="restore-notes" data-inline-ignore>${renderActionIcon("plus")}<span>Add notes</span></button>${resources}</div>`;
  }
  return `<div class="flight-note-region"><p class="day-note transport-note"><strong data-inline-static>Notes:</strong> ${escapeHtml(data.notes || "Add a helpful flight note.")}</p>${resources}<button class="flight-note-remove" type="button" data-inline-transport-action="remove-notes" data-inline-ignore aria-label="Remove notes" title="Remove notes">${renderActionIcon("trash")}<span class="sr-only">Remove notes</span></button></div>`;
}

function flightCopy(data) {
  return {
    date: formatDisplayDate(data.date) || "Travel date",
    airline: data.provider || "Airline",
    seats: data.seats || "Seat assignment",
    details: data.details || "Cabin, fare or booking details",
  };
}

function renderDirectionEditor(directionMode) {
  return `<label class="transport-inline-control transport-direction-control"><span class="sr-only">Direction</span><select data-inline-transport-field="directionMode" aria-label="Direction"><option value="outbound" ${directionMode === "outbound" ? "selected" : ""}>Departing</option><option value="inbound" ${directionMode === "inbound" ? "selected" : ""}>Returning</option></select></label>`;
}

function renderProviderVisual(data) {
  const cover = data.providerCover ?? null;
  const image = renderEntryImage({ cover });
  const position = ["center", "top", "bottom", "left", "right"].includes(cover?.position) ? cover.position : "center";
  return `<span class="provider-icon flight-airline-mark${image ? ` has-provider-image position-${position}` : ""}">${image || escapeHtml(initials(data.provider || "Airline"))}</span>`;
}

function renderEndpoint(data, kind) {
  const origin = kind === "origin";
  const timeField = origin ? "departure" : "arrival";
  const timeLabel = origin ? "Departure Time" : "Arrival Time";
  const location = origin ? data.origin : data.destination;
  const city = origin ? data.originCity : data.destinationCity;
  const dateNote = origin ? "" : renderArrivalDate(data);
  return `<div class="flight-endpoint flight-${kind}"><span class="flight-time" data-inline-time-field="${timeField}" data-inline-time-label="${timeLabel}">${escapeHtml(formatClockTime(data[timeField]))}</span><span class="flight-airport-copy"><strong>${escapeHtml(location)}</strong><small class="flight-city">${mapPinIcon}<span>${escapeHtml(city || (origin ? "Origin city" : "Destination city"))}</span></small>${dateNote}</span></div>`;
}

function renderArrivalDate(data) {
  const rawDate = String(data.arrivalDate ?? "").trim();
  const departureDate = String(data.date || data.departureDate || "").trim();
  const control = renderArrivalDateControl(Boolean(rawDate));
  if (!rawDate || rawDate === departureDate) return control;
  const date = formatDisplayDate(rawDate);
  if (!date) return control;
  return `<small class="flight-arrival-date" data-inline-static><span>Arrives</span> ${escapeHtml(date)}</small>${control}`;
}

function renderArrivalDateControl(hasDate) {
  const label = hasDate ? "Change arrival date" : "Add arrival date";
  return `<button class="flight-arrival-date-control" type="button" data-inline-date-action="block" data-inline-date-field="arrivalDate" data-inline-date-label="Arrival Date" data-inline-date-optional data-inline-ignore aria-label="${label}">${renderActionIcon("plus")}<span>${label}</span></button>`;
}
function renderServiceDetails(data) {
  const serviceType = transportServiceType(data);
  const stopCount = transportStopCount(data);
  const label = localisedServiceLabel(serviceType, stopCount);
  return `<span class="transport-service-view flight-service-badge" data-inline-transport-view="serviceType">${escapeHtml(label)}</span><span class="transport-inline-control transport-service-control"><label><span class="sr-only">Flight type</span><select data-inline-transport-field="serviceType" aria-label="Flight type"><option value="direct" ${serviceType === "direct" ? "selected" : ""}>Direct</option><option value="layover" ${serviceType === "layover" ? "selected" : ""}>Layover</option></select></label><label class="transport-stop-count-control${serviceType === "layover" ? "" : " is-hidden"}"><span>Stops</span><input type="number" min="1" max="9" step="1" value="${stopCount || 1}" data-inline-transport-field="stopCount" aria-label="Number of stops" ${serviceType === "layover" ? "" : "disabled"}></label></span>`;
}

function renderOvernight(data) {
  const departureDate = data.departureDate || data.date;
  if (!departureDate || !data.arrivalDate || data.arrivalDate <= departureDate) return "";
  return `<span class="flight-overnight" data-inline-static>Overnight flight</span>`;
}

function renderSeatCount(data) {
  const count = transportSeatCount(data);
  const view = count > 0 ? `<span class="transport-seat-count-view" data-inline-static>×${count}</span>` : "";
  return `<label class="transport-inline-control transport-seat-count-control"><span class="sr-only">Seat count</span><input type="number" min="0" max="20" step="1" value="${count}" data-inline-transport-field="seatCount" aria-label="Seat count"></label>${view}`;
}

function flightNumber(data) {
  if (String(data.flightNumber ?? "").trim()) return data.flightNumber;
  const candidate = legacyDetailParts(data)[0] ?? "";
  return /^[A-Z]{1,3}\s?\d{2,5}$/iu.test(candidate) ? candidate : "Flight number";
}

function aircraft(data) {
  if (String(data.aircraft ?? "").trim()) return data.aircraft;
  return legacyDetailParts(data)[1] || "Aircraft type";
}

function legacyDetailParts(data) {
  return String(data.details ?? "").split(/\s*[·|]\s*/u).map((value) => value.trim()).filter(Boolean);
}

function localisedDirection(directionMode) {
  if (getDateLocale() === "pt-BR") return directionMode === "inbound" ? "Volta" : "Ida";
  return directionMode === "inbound" ? "Returning" : "Departing";
}

function localisedServiceLabel(serviceType, stopCount) {
  if (serviceType === "direct") return getDateLocale() === "pt-BR" ? "Direto" : "Direct";
  if (getDateLocale() === "pt-BR") return `${stopCount} ${stopCount === 1 ? "escala" : "escalas"}`;
  return `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`;
}
