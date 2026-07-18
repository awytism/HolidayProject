import { escapeHtml, safeUrl } from "../utils/html.js";
import { formatFullDate } from "../../shared/date-utils.mjs";
import { renderIcon, TRUSTED_ICON_KEYS } from "../ui/icon-registry.js";
import { createGenericBlock, GENERIC_TYPES, renderGenericBlock } from "./generic.js";
import { editField } from "./shared.js";

export const stayConfig = {
  eyebrow: "Home Base",
  title: "Your Stay in Gramado",
  addTypes: [
    { type: "stay-summary", label: "Stay Summary" },
    { type: "stay-amenities", label: "Amenities" },
    { type: "stay-anatomy", label: "Room Anatomy" },
    { type: "essentials", label: "Essentials" },
    { type: "link", label: "Link" },
    { type: "note", label: "Description" },
  ],
  createBlock(type) {
    if (GENERIC_TYPES.has(type)) return createGenericBlock(type, "stay");
    if (type === "stay-amenities") return baseBlock(type, { title: "Amenities", groups: [newAmenityGroup()] });
    if (type === "stay-anatomy") return baseBlock(type, { title: "Property Anatomy", area: "Add area", spaces: [newSpace()] });
    if (type === "essentials") return baseBlock(type, { title: "New Essentials", items: [{ label: "Detail", value: "Add value" }] });
    if (type === "link") return baseBlock(type, { title: "Useful Link", description: "Add context", url: "https://" });
    return baseBlock(type, { name: "New Stay", subtitle: "Add description", checkin: "", checkout: "", nights: "Add nights", link: "https://" });
  },
  render(block, editing) {
    if (GENERIC_TYPES.has(block.type)) return renderGenericBlock(block, editing);
    if (editing) return renderStayEditor(block);
    return renderStayBlock(block);
  },
};

function baseBlock(type, data) {
  return { id: `stay-${crypto.randomUUID()}`, type, cover: null, data };
}

function renderStayBlock(block) {
  if (block.type === "stay-summary") return renderSummary(block.data);
  if (block.type === "stay-amenities") return renderAmenities(block.data);
  if (block.type === "stay-anatomy") return renderAnatomy(block.data);
  if (block.type === "essentials") return renderEssentials(block.data);
  return renderLink(block.data);
}

function renderSummary(data) {
  const link = safeUrl(data.link);
  return `<article class="content-block stay-summary"><div class="stay-art" aria-hidden="true"><svg viewBox="0 0 300 220"><path d="M36 185h228M68 185v-82l82-54 82 54v82M105 185v-43h42v43M174 112h30v30h-30zM82 91l68-45 68 45"/></svg><span>${escapeHtml(data.nights)}</span></div><div class="stay-copy"><small>Entire Holiday Home</small><h3>${escapeHtml(data.name)}</h3><p>${escapeHtml(data.subtitle)}</p><div class="property-pills"><span>3 bedrooms</span><span>4 beds</span><span>1 bathroom</span><span>90 m²</span></div><div class="stay-dates"><div><small>Check-In</small><strong>${escapeHtml(formatFullDate(data.checkin))}</strong></div><div><small>Check-Out</small><strong>${escapeHtml(formatFullDate(data.checkout))}</strong></div></div>${link ? `<a class="stay-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open Accommodation Link ↗</a>` : ""}</div></article>`;
}

function renderAmenities(data) {
  const groups = data.groups.map(renderAmenityGroup).join("");
  return `<article class="content-block amenity-card"><header><small>Accommodation Highlights</small><h3>${escapeHtml(data.title)}</h3></header><div class="amenity-groups">${groups}</div></article>`;
}

function renderAmenityGroup(group) {
  const items = group.items.map((item) => `<li><span class="amenity-icon">${renderIcon(item.iconKey)}</span><span>${escapeHtml(item.label)}</span></li>`).join("");
  return `<section class="amenity-group"><h4>${escapeHtml(group.label)}</h4><ul>${items}</ul></section>`;
}

function renderAnatomy(data) {
  const spaces = data.spaces.map((space) => `<li><strong>${escapeHtml(space.label)}</strong><span>${space.beds.map((bed) => `${bed.quantity} ${escapeHtml(bed.label)} ${bed.label.toLowerCase().includes("sofa") ? "🛋️" : "🛏️"}`).join(" · ")}</span></li>`).join("");
  return `<article class="content-block anatomy-card"><div><small>Stay Anatomy</small><h3>${escapeHtml(data.title)}</h3><span class="area-pill">${escapeHtml(data.area)}</span></div><ul>${spaces}</ul></article>`;
}

function renderEssentials(data) {
  return `<article class="content-block list-card"><h3>${escapeHtml(data.title)}</h3><dl class="essential-list">${data.items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl></article>`;
}

function renderLink(data) {
  const link = safeUrl(data.url);
  return `<article class="content-block link-block"><div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></div>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open Link ↗</a>` : ""}</article>`;
}

function renderStayEditor(block) {
  if (block.type === "stay-summary") return renderSummaryEditor(block.data);
  if (block.type === "stay-amenities") return renderAmenitiesEditor(block.data);
  if (block.type === "stay-anatomy") return renderAnatomyEditor(block.data);
  if (block.type === "essentials") return renderEssentialsEditor(block.data);
  return `<div class="content-block edit-form">${editField("Title", "title", block.data.title)}${editField("Description", "description", block.data.description)}${editField("URL", "url", block.data.url, { type: "url" })}</div>`;
}

function renderSummaryEditor(data) {
  return `<div class="content-block edit-form two-column">${editField("Property Name", "name", data.name)}${editField("Subtitle", "subtitle", data.subtitle)}${editField("Check-In", "checkin", data.checkin, { type: "date" })}${editField("Check-Out", "checkout", data.checkout, { type: "date" })}${editField("Duration", "nights", data.nights)}${editField("Booking Link", "link", data.link, { type: "url" })}</div>`;
}

function renderAmenitiesEditor(data) {
  const groups = data.groups.map(renderAmenityGroupEditor).join("");
  return `<div class="content-block edit-form amenity-editor">${editField("Title", "title", data.title)}${groups}<button class="inline-add" type="button" data-amenity-action="add-group">+ Add Category</button></div>`;
}

function renderAmenityGroupEditor(group) {
  const selected = group.items.map((item) => `<span data-amenity-item="${escapeHtml(item.id)}">${renderIcon(item.iconKey)} ${escapeHtml(item.label)} <button type="button" data-amenity-action="delete-item" aria-label="Remove ${escapeHtml(item.label)}">×</button></span>`).join("");
  return `<section class="amenity-group-editor" data-amenity-group="${escapeHtml(group.id)}"><div class="collection-title"><input value="${escapeHtml(group.label)}" data-amenity-group-label aria-label="Group Name"><button type="button" data-amenity-action="delete-group">Delete Group</button></div><div class="amenity-selected">${selected}</div><label>Find Amenities<input type="search" data-amenity-search placeholder="Search kitchen, views, parking..."></label><div class="amenity-results" role="listbox"></div>${renderCustomAmenity()}</section>`;
}

function renderCustomAmenity() {
  const options = TRUSTED_ICON_KEYS.map((key) => `<option value="${escapeHtml(key)}" ${key === "home" ? "selected" : ""}>${escapeHtml(iconLabel(key))}</option>`).join("");
  return `<details class="custom-amenity"><summary>Add Custom Highlight</summary><div><label>Highlight Text<input data-custom-amenity-label maxlength="500" placeholder="e.g. Late checkout"></label><label>Icon<span class="custom-icon-choice"><span class="custom-icon-preview" aria-hidden="true">${renderIcon("home")}</span><select data-custom-amenity-icon aria-label="Highlight Icon">${options}</select></span></label><button type="button" data-amenity-action="add-custom">Add Highlight</button></div></details>`;
}

function iconLabel(key) {
  return key.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function renderAnatomyEditor(data) {
  const spaces = data.spaces.map((space) => `<section class="space-editor" data-space-id="${escapeHtml(space.id)}"><div class="collection-title"><input value="${escapeHtml(space.label)}" data-space-field="label" aria-label="Space Name"><button type="button" data-anatomy-action="delete-space">Delete Space</button></div>${space.beds.map((bed) => `<div class="bed-editor" data-bed-id="${escapeHtml(bed.id)}"><input value="${escapeHtml(bed.label)}" data-bed-field="label" aria-label="Bed Type"><input type="number" min="1" max="20" value="${bed.quantity}" data-bed-field="quantity" aria-label="Bed Quantity"><button type="button" data-anatomy-action="delete-bed">×</button></div>`).join("")}<button class="inline-add" type="button" data-anatomy-action="add-bed">+ Add Bed</button></section>`).join("");
  return `<div class="content-block edit-form anatomy-editor">${editField("Title", "title", data.title)}${editField("Area", "area", data.area)}${spaces}<button class="inline-add" type="button" data-anatomy-action="add-space">+ Add Room</button></div>`;
}

function renderEssentialsEditor(data) {
  const rows = data.items.map((item, index) => `<div class="list-edit-row two-fields" data-item-index="${index}"><input value="${escapeHtml(item.label)}" data-list-property="label" aria-label="Label"><input value="${escapeHtml(item.value)}" data-list-property="value" aria-label="Value"><button class="mini-action" type="button" data-list-action="delete" aria-label="Delete Item">×</button></div>`).join("");
  return `<div class="content-block edit-form"><label>Title<input value="${escapeHtml(data.title)}" data-block-field="title"></label><div class="list-editor">${rows}</div><button class="inline-add" type="button" data-list-action="add">+ Add Item</button></div>`;
}

function newAmenityGroup() { return { id: `group-${crypto.randomUUID()}`, label: "New Category", items: [] }; }
function newSpace() { return { id: `space-${crypto.randomUUID()}`, label: "New Room", beds: [] }; }
