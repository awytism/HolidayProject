import { agendaConfig, placesConfig } from "./agenda.js";
import { stayConfig } from "./stay.js";
import { transportConfig } from "./transport.js";

export const SECTION_ORDER = Object.freeze(["transport", "stay", "agenda", "places"]);

const configs = { transport: transportConfig, stay: stayConfig, agenda: agendaConfig, places: placesConfig };

const CARD_SECTIONS = Object.freeze({
  "travel-essentials": "transport",
  flight: "transport",
  transfer: "transport",
  "stay-summary": "stay",
  "stay-amenities": "stay",
  "stay-distances": "stay",
  "stay-anatomy": "stay",
  essentials: "stay",
  link: "stay",
  day: "agenda",
  "saved-places": "places",
});

const CARD_TYPES = Object.freeze([
  { type: "travel-essentials", label: "Information", section: "transport" },
  { type: "flight", label: "Transport", section: "transport" },
  { type: "stay-summary", label: "Accommodation Summary", section: "stay" },
  { type: "stay-amenities", label: "Listing Highlights", section: "stay" },
  { type: "day", label: "Day Plan", section: "agenda" },
  { type: "saved-places", label: "Places", section: "places" },
  { type: "link", label: "Link", section: "stay" },
  { type: "note", label: "Note", section: "agenda" },
]);

export function getSectionConfig(section) {
  const config = configs[section];
  if (!config) throw new TypeError(`Unknown section: ${section}`);
  return config;
}

export function getCardTypes() {
  return CARD_TYPES.map(({ type, label }) => ({ type, label }));
}

export function getCardConfig(type, fallbackSection) {
  return getSectionConfig(CARD_SECTIONS[type] ?? fallbackSection);
}

export function createCardBlock(type, fallbackSection) {
  return getCardConfig(type, fallbackSection).createBlock(type);
}