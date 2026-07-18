import { escapeHtml, initials } from "../utils/html.js";
import { formatFullDate } from "../../shared/date-utils.mjs";
import { editField, newNote, renderEntryImage, renderEntryLinks, renderNote } from "./shared.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const planeIcon = '<svg viewBox="0 0 24 24"><path d="m21 16-8-4.8V5.5c0-1.2-.4-3.5-1-3.5s-1 2.3-1 3.5v5.7L3 16v2l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L13 19v-3.5l8 2.5v-2Z"/></svg>';
const busIcon = '<svg viewBox="0 0 24 24"><path d="M5 16V6c0-2 1.7-3 7-3s7 1 7 3v10m-14 0h14v3H5v-3Zm2-9h10M8 19v2m8-2v2"/></svg>';

export const transportConfig = {
  eyebrow: "Itinerário Completo",
  title: "Itinerário Completo",
  addTypes: [
    { type: "flight", label: "Voo" },
    { type: "transfer", label: "Transfer Terrestre" },
    { type: "note", label: "Nota" },
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
        direction: "Novo Trecho", date: "", provider: flight ? "Companhia Aérea" : "Empresa",
        origin: "Origem", originCity: "", destination: "Destino", destinationCity: "",
        departure: "00:00", arrival: "00:00", duration: "Adicionar duração",
        stop: flight ? "Direto" : "Transfer Terrestre", details: "Adicionar detalhes", seats: "Adicionar assentos",
        mapUrl: "", websiteUrl: "",
        originCover: null, destinationCover: null,
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
  const links = renderEntryLinks(data, `${data.origin} para ${data.destination}`);
  return `<article class="content-block transport-card ${transfer ? "transfer" : "flight"}"><div class="block-topline"><div class="provider"><span class="provider-icon">${transportIcon(transfer)}</span><div><small>${escapeHtml(data.direction)} · ${escapeHtml(formatFullDate(data.date))}</small><strong>${escapeHtml(data.provider)}</strong></div></div>${links}</div><div class="route-grid"><div class="route-timeline">${renderRouteEndpoint(data, "origin")}<div class="route-line"><span></span><div class="route-mode"><i>${transportIcon(transfer)}</i><small class="route-duration">${escapeHtml(data.duration)}</small></div><span></span></div>${renderRouteEndpoint(data, "destination")}</div></div><div class="detail-strip"><span><strong>${escapeHtml(data.stop)}</strong><br>${escapeHtml(data.details)}</span><span class="transport-seats">${renderIcon("airline-seat")}<span>${escapeHtml(data.seats)}</span></span></div></article>`;
}

function renderTransportEditor(block) {
  const data = block.data;
  return `<div class="content-block edit-form two-column">${editField("Direção", "direction", data.direction)}${editField("Data", "date", data.date, { type: "date" })}${editField("Empresa", "provider", data.provider)}${editField("Duração", "duration", data.duration)}${editField("Horário de Partida", "departure", data.departure)}${editField("Horário de Chegada", "arrival", data.arrival)}${editField("Origem", "origin", data.origin)}${editField("Destino", "destination", data.destination)}${editField("Cidade de Origem", "originCity", data.originCity)}${editField("Cidade de Destino", "destinationCity", data.destinationCity)}${editField("Paradas", "stop", data.stop)}${editField("Assentos", "seats", data.seats)}${editField("URL do Google Maps", "mapUrl", data.mapUrl ?? "", { type: "url" })}${editField("URL do Site", "websiteUrl", data.websiteUrl ?? "", { type: "url" })}${editField("Detalhes", "details", data.details, { multiline: true, full: true })}<div class="transport-cover-editor">${renderTransportImageControl("originCover", "Imagem da Origem", data.originCover)}${renderTransportImageControl("destinationCover", "Imagem do Destino", data.destinationCover)}</div></div>`;
}


function renderRouteEndpoint(data, kind) {
  const origin = kind === "origin";
  const time = origin ? data.departure : data.arrival;
  const city = origin ? data.originCity : data.destinationCity;
  const location = origin ? data.origin : data.destination;
  const image = renderEntryImage({ cover: data[`${kind}Cover`] });
  const media = `<span class="route-location-media"><span>${escapeHtml(initials(location))}</span>${image}</span>`;
  const copy = `<span class="route-endpoint-copy"><strong class="route-time">${escapeHtml(time)}</strong><b class="route-location-name">${escapeHtml(location)}</b><small class="route-city">${escapeHtml(city ?? "")}</small></span>`;
  return `<div class="route-endpoint route-${kind}-endpoint">${origin ? `${media}${copy}` : `${copy}${media}`}</div>`;
}

function renderTransportImageControl(property, label, cover) {
  const action = cover ? "Trocar" : "Adicionar";
  return `<button class="transport-cover-button" type="button" data-transport-cover="${property}" aria-label="${action} ${label}">${renderActionIcon("image")}<span>${action} ${label}</span></button>`;
}

function transportIcon(transfer) {
  return transfer ? busIcon : planeIcon;
}
