import { escapeHtml } from "../utils/html.js";
import { formatFullDate } from "../../shared/date-utils.mjs";
import { editField, newNote, renderNote } from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";

const planeIcon = '<svg viewBox="0 0 24 24"><path d="m21 16-8-4.8V5.5c0-1.2-.4-3.5-1-3.5s-1 2.3-1 3.5v5.7L3 16v2l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L13 19v-3.5l8 2.5v-2Z"/></svg>';
const busIcon = '<svg viewBox="0 0 24 24"><path d="M5 16V6c0-2 1.7-3 7-3s7 1 7 3v10m-14 0h14v3H5v-3Zm2-9h10M8 19v2m8-2v2"/></svg>';

export const transportConfig = {
  eyebrow: "Full Itinerary",
  title: "Your Route at a Glance",
  addTypes: [
    { type: "flight", label: "Flight" },
    { type: "transfer", label: "Ground Transfer" },
    { type: "note", label: "Note" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "transport");
    if (type === "note") return newNote("transport");
    const flight = type === "flight";
    return {
      id: `transport-${crypto.randomUUID()}`,
      type,
      cover: null,
      data: {
        direction: "New Leg", date: "", provider: flight ? "Airline" : "Provider",
        origin: "Origin", originCity: "", destination: "Destination", destinationCity: "",
        departure: "00:00", arrival: "00:00", duration: "Add duration",
        stop: flight ? "Direct" : "Ground Transfer", details: "Add details", seats: "Add seats",
      },
    };
  },
  render(block, editing) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (block.type === "note") return renderNote(block, editing);
    return editing ? renderTransportEditor(block) : renderTransportCard(block);
  },
};

function renderTransportCard(block) {
  const data = block.data;
  const transfer = block.type === "transfer";
  return `<article class="content-block transport-card ${transfer ? "transfer" : "flight"}"><div class="block-topline"><div class="provider"><span class="provider-icon">${transfer ? busIcon : planeIcon}</span><div><small>${escapeHtml(data.direction)} · ${escapeHtml(formatFullDate(data.date))}</small><strong>${escapeHtml(data.provider)}</strong></div></div><span class="duration-pill">${escapeHtml(data.duration)}</span></div><div class="route-grid"><div class="route-point"><strong>${escapeHtml(data.departure)}</strong><b>${escapeHtml(data.origin)}</b><small>${escapeHtml(data.originCity)}</small></div><div class="route-line"><span></span><i>${transfer ? busIcon : planeIcon}</i><span></span></div><div class="route-point"><strong>${escapeHtml(data.arrival)}</strong><b>${escapeHtml(data.destination)}</b><small>${escapeHtml(data.destinationCity)}</small></div></div><div class="detail-strip"><span><strong>${escapeHtml(data.stop)}</strong><br>${escapeHtml(data.details)}</span><span>${escapeHtml(data.seats)}</span></div></article>`;
}

function renderTransportEditor(block) {
  const data = block.data;
  return `<div class="content-block edit-form two-column">${editField("Direction", "direction", data.direction)}${editField("Date", "date", data.date, { type: "date" })}${editField("Provider", "provider", data.provider)}${editField("Duration", "duration", data.duration)}${editField("Departure Time", "departure", data.departure)}${editField("Arrival Time", "arrival", data.arrival)}${editField("Origin", "origin", data.origin)}${editField("Destination", "destination", data.destination)}${editField("Origin City", "originCity", data.originCity)}${editField("Destination City", "destinationCity", data.destinationCity)}${editField("Stop", "stop", data.stop)}${editField("Seats", "seats", data.seats)}${editField("Details", "details", data.details, { multiline: true, full: true })}</div>`;
}
