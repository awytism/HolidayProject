import { escapeHtml, initials } from "../utils/html.js";
import { formatClockTime, formatDisplayDate, getDateLocale } from "../../shared/date-utils.mjs";
import { deriveTransportDuration } from "../../shared/transport-duration.mjs";
import {
  normaliseDirectionMode,
  transportSeatCount,
  transportServiceType,
  transportStopCount,
} from "../editor/inline-transport-editor.js";
import { editField, newNote, renderEntryImage, renderEntryLinks, renderNote } from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";
import { renderFlightCard } from "./flight-card.js";
import { createTravelEssentialsBlock, renderTravelEssentials } from "./travel-essentials.js";

const planeIcon = renderIcon("airplane");
const busIcon = '<svg viewBox="0 0 24 24"><path d="M5 16V6c0-2 1.7-3 7-3s7 1 7 3v10m-14 0h14v3H5v-3Zm2-9h10M8 19v2m8-2v2"/></svg>';

export const transportConfig = {
  eyebrow: "Transit",
  title: "Transit",
  addTypes: [
    { type: "travel-essentials", label: "Information" },
    { type: "flight", label: "Transport" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "transport");
    if (type === "note") return newNote("transport");
    if (type === "travel-essentials") return createTravelEssentialsBlock();
    return createTransportRouteBlock(type);
  },
  render(block, editing, context = {}) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (block.type === "note") return renderNote(block, editing);
    if (block.type === "travel-essentials") return renderTravelEssentials(block);
    return editing ? renderTransportEditor(block) : renderTransportCard(block, context);
  },
};

function createTransportRouteBlock(type) {
const flight = type === "flight";
return {
  id: `transport-${crypto.randomUUID()}`,
  type,
  cover: null,
  data: {
    direction: "Outbound", directionMode: "outbound", date: "", provider: flight ? "Airline" : "Provider",
    flightNumber: flight ? "Flight number" : undefined, aircraft: flight ? "Aircraft type" : undefined,
    origin: "Departure airport or city (CODE)", originCity: "Origin city",
    destination: "Arrival airport or city (CODE)", destinationCity: "Destination city",
    departure: "00:00", arrival: "00:00", duration: "0 m",
    departureDate: "", arrivalDate: "",
    departureTimeZone: "America/Sao_Paulo", arrivalTimeZone: "America/Sao_Paulo",
    stop: flight ? "Direct" : "Transfer Terrestre", serviceType: flight ? "direct" : undefined,
    stopCount: flight ? 0 : undefined, segments: [], details: "Adicionar detalhes", seats: "Adicionar assentos", seatCount: flight ? 1 : 0,
    notes: "",
    notesVisible: true,
    mapUrl: "", websiteUrl: "",
    providerCover: null, originCover: null, destinationCover: null,
  },
};

}

function renderTransportCard(block, context) {
  if (block.type === "flight") return renderFlightCard(block, context);
  const data = block.data;
  const transfer = block.type === "transfer";
  const directionMode = normaliseDirectionMode(data.directionMode ?? data.direction);
  const direction = localisedDirection(directionMode);
  const attachmentButton = context.attachments?.renderDownloadButton(block.id, context.section, "Download transport attachment")
    ?? `<button class="transport-attachment-button" type="button" data-transport-attachment data-section="${escapeHtml(context.section ?? "transport")}" data-block-id="${escapeHtml(block.id)}" aria-label="Download transport attachment" title="Download transport attachment">${renderActionIcon("file")}</button>`;
  const links = renderEntryLinks(data, `${data.origin} para ${data.destination}`, attachmentButton, { showMissing: true });
  const notes = escapeHtml(data.notes || "Nenhuma observação adicional.");
  return `<article class="content-block transport-card ${transfer ? "transfer" : "flight"}"><div class="block-topline"><div class="provider" data-inline-image-field="providerCover">${renderProviderVisual(block)}<div><small><span class="transport-direction-view" data-inline-transport-view="directionMode">${escapeHtml(direction)}</span>${renderDirectionEditor(directionMode)}<span aria-hidden="true" data-inline-static> · </span><span class="transport-date" data-inline-date-action="block" data-inline-date-field="date" data-inline-date-label="Transport Date">${escapeHtml(formatDisplayDate(data.date))}</span></small><strong>${escapeHtml(data.provider)}</strong></div></div>${links}</div><div class="route-grid"><div class="route-timeline">${renderRouteEndpoint(data, "origin")}<div class="route-line"><span></span><div class="route-mode"><i>${transportIcon(transfer)}</i><small class="route-duration" data-inline-static>${escapeHtml(deriveTransportDuration(data))}</small></div><span></span></div>${renderRouteEndpoint(data, "destination")}</div></div><div class="detail-strip"><span class="transport-details">${renderServiceDetails(block)}<br>${escapeHtml(data.details)}</span>${renderSeats(data)}</div><p class="day-note transport-note"><strong data-inline-static>Observações:</strong> ${notes}</p></article>`;
}

function renderDirectionEditor(directionMode) {
  return `<label class="transport-inline-control transport-direction-control"><span class="sr-only">Direction</span><select data-inline-transport-field="directionMode" aria-label="Direction"><option value="outbound" ${directionMode === "outbound" ? "selected" : ""}>Outbound</option><option value="inbound" ${directionMode === "inbound" ? "selected" : ""}>Inbound</option></select></label>`;
}

function renderServiceDetails(block) {
  if (block.type !== "flight") return `<strong>${escapeHtml(block.data.stop)}</strong>`;
  const serviceType = transportServiceType(block.data);
  const stopCount = transportStopCount(block.data);
  const stopLabel = localisedServiceLabel(serviceType, stopCount);
  return `<strong class="transport-service-view" data-inline-transport-view="serviceType">${escapeHtml(stopLabel)}</strong><span class="transport-inline-control transport-service-control"><label><span class="sr-only">Flight type</span><select data-inline-transport-field="serviceType" aria-label="Flight type"><option value="direct" ${serviceType === "direct" ? "selected" : ""}>Direct</option><option value="layover" ${serviceType === "layover" ? "selected" : ""}>Layover</option></select></label><label class="transport-stop-count-control${serviceType === "layover" ? "" : " is-hidden"}"><span>Stops</span><input type="number" min="1" max="9" step="1" value="${stopCount || 1}" data-inline-transport-field="stopCount" aria-label="Number of stops" ${serviceType === "layover" ? "" : "disabled"}></label></span>`;
}

function renderSeats(data) {
  const count = transportSeatCount(data);
  const quantity = count > 0 ? `<span class="transport-seat-count-view" data-inline-static>x${count}</span>` : "";
  const countEditor = `<label class="transport-inline-control transport-seat-count-control"><span class="sr-only">Seat count</span><input type="number" min="0" max="20" step="1" value="${count}" data-inline-transport-field="seatCount" aria-label="Seat count"></label>`;
  return `<span class="transport-seats"><span class="transport-seat-summary">${countEditor}${quantity}${renderIcon("airline-seat")}</span><span class="transport-seat-copy">${escapeHtml(data.seats)}</span></span>`;
}

function localisedDirection(directionMode) {
  if (getDateLocale() === "pt-BR") return directionMode === "inbound" ? "Volta" : "Ida";
  return directionMode === "inbound" ? "Inbound" : "Outbound";
}

function localisedServiceLabel(serviceType, stopCount) {
  if (serviceType === "direct") return getDateLocale() === "pt-BR" ? "Direto" : "Direct";
  if (getDateLocale() === "pt-BR") return `Escala · ${stopCount} ${stopCount === 1 ? "parada" : "paradas"}`;
  return `Layover · ${stopCount} ${stopCount === 1 ? "stop" : "stops"}`;
}

function renderTransportEditor(block) {
  const data = block.data;
  return `<div class="content-block edit-form two-column">${editField("Direção", "direction", data.direction)}${editField("Data", "date", data.date, { type: "date" })}${editField("Empresa", "provider", data.provider)}${editField("Horário de Partida", "departure", data.departure)}${editField("Horário de Chegada", "arrival", data.arrival)}${editField("Origem", "origin", data.origin)}${editField("Destino", "destination", data.destination)}${editField("Cidade de Origem", "originCity", data.originCity)}${editField("Cidade de Destino", "destinationCity", data.destinationCity)}${editField("Paradas", "stop", data.stop)}${editField("Assentos", "seats", data.seats)}${editField("URL do Google Maps", "mapUrl", data.mapUrl ?? "", { type: "url" })}${editField("URL do site", "websiteUrl", data.websiteUrl ?? "", { type: "url" })}${editField("Detalhes", "details", data.details, { multiline: true, full: true })}${editField("Observações", "notes", data.notes ?? "", { multiline: true, full: true })}<div class="transport-cover-editor">${renderTransportImageControl("providerCover", "Provider Image", resolveProviderCover(block))}${renderTransportImageControl("originCover", "Origin Image", data.originCover)}${renderTransportImageControl("destinationCover", "Destination Image", data.destinationCover)}</div></div>`;
}

function renderProviderVisual(block) {
  const cover = resolveProviderCover(block);
  const image = renderEntryImage({ cover });
  if (!image) return `<span class="provider-icon">${transportIcon(block.type === "transfer")}</span>`;
  const position = ["center", "top", "bottom", "left", "right"].includes(cover.position) ? cover.position : "center";
  return `<span class="provider-icon has-provider-image position-${position}">${image}</span>`;
}

function resolveProviderCover(block) {
  return block.data.providerCover ?? null;
}


function renderRouteEndpoint(data, kind) {
  const origin = kind === "origin";
  const time = origin ? data.departure : data.arrival;
  const timeField = origin ? "departure" : "arrival";
  const timeLabel = origin ? "Departure Time" : "Arrival Time";
  const city = origin ? data.originCity : data.destinationCity;
  const location = origin ? data.origin : data.destination;
  const image = renderEntryImage({ cover: data[`${kind}Cover`] });
  const media = `<span class="route-location-media"><span>${escapeHtml(initials(location))}</span>${image}</span>`;
  const copy = `<span class="route-endpoint-copy"><strong class="route-time" data-inline-time-field="${timeField}" data-inline-time-label="${timeLabel}">${escapeHtml(formatClockTime(time))}</strong><b class="route-location-name">${escapeHtml(location)}</b><small class="route-city">${escapeHtml(city ?? "")}</small></span>`;
  return `<div data-inline-image-field="${kind}Cover" class="route-endpoint route-${kind}-endpoint">${origin ? `${media}${copy}` : `${copy}${media}`}</div>`;
}

function renderTransportImageControl(property, label, cover) {
  const action = cover ? "Change" : "Add";
  const image = renderEntryImage({ cover });
  const visual = image
    ? `<span class="transport-cover-preview">${image}</span>`
    : `<span class="transport-cover-placeholder">${renderActionIcon("image")}</span>`;
  return `<button class="transport-cover-button${cover ? " has-cover" : ""}" type="button" data-transport-cover="${property}" aria-label="${action}: ${label}">${visual}<span class="transport-cover-copy"><strong>${label}</strong><small>${action}</small></span></button>`;
}

function transportIcon(transfer) {
  return transfer ? busIcon : planeIcon;
}
