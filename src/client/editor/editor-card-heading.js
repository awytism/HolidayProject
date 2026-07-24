import { escapeHtml } from "../utils/html.js";

const CARD_TITLES = Object.freeze({
  "travel-essentials": "Information",
  flight: "Flight",
  transfer: "Ground Transfer",
  "stay-summary": "Accommodation Summary",
  "stay-amenities": "Listing Highlights",
  "stay-distances": "Distances",
  "stay-anatomy": "House Layout",
  essentials: "Essential Information",
  link: "Link",
  day: "Day Plan",
  "saved-places": "Places",
  table: "Table",
  "image-card": "Image Card",
  "icon-list": "Icon List",
  checklist: "Checklist",
  facts: "Key Facts",
  "link-card": "Link Card",
  note: "Note",
});

const SECTION_TITLES = Object.freeze({
  transport: "Transport",
  stay: "Accommodation",
  agenda: "Agenda",
  places: "Other",
});

export function editorCardTitle(type, section) {
  return CARD_TITLES[type] ?? SECTION_TITLES[section] ?? "Content";
}

export function renderEditorCardHeading(type, section) {
  const title = editorCardTitle(type, section);
  const removeButton = section === "transport"
    ? '<button class="editor-card-delete editor-remove-button" type="button" data-block-action="delete" aria-label="Remove Card">Remove Card</button>'
    : "";
  return `<header class="editor-card-heading"><h3>${escapeHtml(title)}</h3>${removeButton}</header>`;
}
