import { isIsoDate, parseIsoDate } from "./date-utils.mjs";

export const DOCUMENT_SCHEMA_VERSION = 5;

const LIMITS = Object.freeze({
  blocks: 200,
  collection: 200,
  id: 160,
  label: 500,
  text: 10_000,
  url: 2_048,
  tableColumns: 12,
  tableRows: 50,
});

const GENERIC_TYPES = ["table", "image-card", "icon-list", "checklist", "facts", "link-card", "note"];
const BLOCK_SPANS = new Set([4, 6, 8, 12]);
const PRIORITIES = new Set(["high", "medium", "low"]);
const SECTION_TYPES = Object.freeze({
  transport: new Set([...GENERIC_TYPES, "flight", "transfer"]),
  stay: new Set([...GENERIC_TYPES, "stay-summary", "stay-amenities", "stay-anatomy", "essentials", "link"]),
  agenda: new Set([...GENERIC_TYPES, "day", "saved-places"]),
});

const TEXT_FIELDS = Object.freeze({
  flight: ["direction", "date", "provider", "origin", "originCity", "destination", "destinationCity", "departure", "arrival", "duration", "stop", "details", "seats"],
  transfer: ["direction", "date", "provider", "origin", "destination", "departure", "arrival", "duration", "seats"],
  "stay-summary": ["name", "subtitle", "checkin", "checkout", "nights", "link"],
  link: ["title", "description", "url"],
  note: ["title", "text"],
  "link-card": ["title", "description", "url"],
});

const TYPE_VALIDATORS = Object.freeze({
  flight: validateTextBlock,
  transfer: validateTextBlock,
  "stay-summary": validateTextBlock,
  "stay-amenities": validateStayAmenities,
  "stay-anatomy": validateStayAnatomy,
  essentials: validateEssentials,
  link: validateTextBlock,
  day: validateDay,
  "saved-places": validateSavedPlaces,
  table: validateTable,
  "image-card": validateImageCard,
  "icon-list": validateIconList,
  checklist: validateChecklist,
  facts: validateFacts,
  "link-card": validateTextBlock,
  note: validateTextBlock,
});

export function validateDocument(document) {
  assertRecord(document, "document");
  if (document.schemaVersion !== DOCUMENT_SCHEMA_VERSION) throw new TypeError("Unsupported document schema");
  assertRecord(document.meta, "meta");
  assertTextFields(document.meta, ["destination", "region", "startDate", "endDate", "days", "legs"], "meta", LIMITS.label);
  assertDate(document.meta.startDate, "meta start date");
  assertDate(document.meta.endDate, "meta end date");
  assertDateOrder(document.meta.startDate, document.meta.endDate, "trip dates");
  assertRecord(document.sections, "sections");
  for (const section of Object.keys(SECTION_TYPES)) validateSection(document.sections[section], section);
  return true;
}

export function validateCustomBlock(block, section) {
  const allowedTypes = SECTION_TYPES[section];
  if (!allowedTypes) throw new TypeError(`Unknown section: ${section}`);
  validateBlock(block, section, allowedTypes, new Set());
  return true;
}

export function validateMedia(media, label = "media") {
  assertRecord(media, label);
  assertText(media.alt, `${label} alt`, LIMITS.label);
  assertText(media.position, `${label} position`, 100);
  const hasUrl = Object.hasOwn(media, "url");
  const hasMediaId = Object.hasOwn(media, "mediaId");
  if (hasUrl === hasMediaId) throw new TypeError(`Invalid ${label} source`);
  if (hasUrl) assertHttpsUrl(media.url, `${label} URL`);
  else assertId(media.mediaId, `${label} media ID`);
  return true;
}

function validateSection(blocks, section) {
  assertCollection(blocks, `${section} blocks`, LIMITS.blocks);
  const ids = new Set();
  for (const block of blocks) validateBlock(block, section, SECTION_TYPES[section], ids);
}

function validateBlock(block, section, allowedTypes, ids) {
  assertRecord(block, `${section} block`);
  assertUniqueId(block, ids, `${section} block`);
  if (!allowedTypes.has(block.type)) throw new TypeError(`Invalid ${section} block type`);
  if (block.layout !== undefined) validateBlockLayout(block.layout, `${section} block layout`);
  if (block.appearance !== undefined) validateBlockAppearance(block.appearance, `${section} block appearance`);
  validateCover(block.cover, `${section} block cover`);
  assertRecord(block.data, `${section} block data`);
  TYPE_VALIDATORS[block.type](block.data, block.type);
}

function validateBlockAppearance(appearance, label) {
  assertRecord(appearance, label);
  if (typeof appearance.colorHeader !== "boolean") throw new TypeError(`Invalid ${label}`);
}

function validateBlockLayout(layout, label) {
  assertRecord(layout, label);
  if (!BLOCK_SPANS.has(layout.span)) throw new TypeError(`Invalid ${label}`);
}

function validateCover(cover, label) {
  if (cover !== null && cover !== undefined) validateMedia(cover, label);
}

function validatePlaces(places) {
  assertCollection(places, "places");
  const ids = new Set();
  for (const place of places) validatePlace(place, ids);
}

function validatePlace(place, ids) {
  assertRecord(place, "place");
  assertUniqueId(place, ids, "place");
  assertTextFields(place, ["name", "comment", "mapUrl", "websiteUrl"], "place");
  assertText(place.image, "place image", LIMITS.url);
  assertPriority(place.priority, "place priority");
  validateCover(place.cover, "place cover");
}

function validateTextBlock(data, type) {
  assertTextFields(data, TEXT_FIELDS[type], `${type} data`);
  if (type === "transfer") assertOptionalTextFields(data, ["originCity", "destinationCity", "stop", "details"], type);
  if (["stay-summary", "link", "link-card"].includes(type)) assertText(data[type === "stay-summary" ? "link" : "url"], `${type} URL`, LIMITS.url);
  if (["flight", "transfer"].includes(type)) assertDate(data.date, `${type} date`);
  if (type === "stay-summary") {
    assertDate(data.checkin, "stay-summary check-in date");
    assertDate(data.checkout, "stay-summary check-out date");
    assertDateOrder(data.checkin, data.checkout, "stay dates");
  }
}

function validateStayAmenities(data) {
  assertText(data.title, "stay amenities title", LIMITS.label);
  assertCollection(data.groups, "stay amenities groups", 20);
  const groupIds = new Set();
  for (const group of data.groups) validateAmenityGroup(group, groupIds);
}

function validateAmenityGroup(group, ids) {
  assertRecord(group, "stay amenity group");
  assertUniqueId(group, ids, "stay amenity group");
  assertText(group.label, "stay amenity group label", LIMITS.label);
  assertCollection(group.items, "stay amenity group items", 100);
  const itemIds = new Set();
  for (const item of group.items) validateIconItem(item, itemIds, "stay amenity item", true);
}

function validateStayAnatomy(data) {
  assertText(data.title, "stay anatomy title", LIMITS.label);
  assertText(data.area, "stay anatomy area", LIMITS.label);
  assertCollection(data.spaces, "stay anatomy spaces", 20);
  const spaceIds = new Set();
  for (const space of data.spaces) validateAnatomySpace(space, spaceIds);
}

function validateAnatomySpace(space, ids) {
  assertRecord(space, "stay anatomy space");
  assertUniqueId(space, ids, "stay anatomy space");
  assertText(space.label, "stay anatomy space label", LIMITS.label);
  assertCollection(space.beds, "stay anatomy beds", 10);
  const bedIds = new Set();
  for (const bed of space.beds) validateBed(bed, bedIds);
}

function validateBed(bed, ids) {
  assertRecord(bed, "stay anatomy bed");
  assertUniqueId(bed, ids, "stay anatomy bed");
  assertText(bed.label, "stay anatomy bed label", LIMITS.label);
  if (!Number.isInteger(bed.quantity) || bed.quantity < 1 || bed.quantity > 20) throw new TypeError("Invalid stay anatomy bed quantity");
}

function validateEssentials(data) {
  assertText(data.title, "essentials title", LIMITS.label);
  assertCollection(data.items, "essentials items");
  for (const item of data.items) {
    assertRecord(item, "essential item");
    assertTextFields(item, ["label", "value"], "essential item");
  }
}

function validateDay(data) {
  assertTextFields(data, ["date", "title", "notes"], "day data");
  assertDate(data.date, "day data date");
  validatePlaces(data.places);
  assertRecord(data.meals, "day meals");
  const ids = new Set();
  for (const meal of ["breakfast", "lunch", "dinner"]) validateFoodOptions(data.meals[meal], meal, ids);
}

function validateFoodOptions(options, meal, ids) {
  assertCollection(options, `${meal} food options`);
  for (const option of options) {
    assertRecord(option, `${meal} food option`);
    assertUniqueId(option, ids, `${meal} food option`);
    assertTextFields(option, ["name", "mapUrl", "websiteUrl"], `${meal} food option`);
    assertPriority(option.priority, `${meal} food option priority`);
    validateCover(option.cover, `${meal} food option cover`);
  }
}

function assertPriority(value, label) {
  if (!PRIORITIES.has(value)) throw new TypeError(`Invalid ${label}`);
}

function validateSavedPlaces(data) {
  assertText(data.title, "saved places title", LIMITS.label);
  validatePlaces(data.places);
}

function validateTable(data) {
  assertText(data.title, "table title", LIMITS.label);
  assertCollection(data.columns, "table columns", LIMITS.tableColumns);
  assertCollection(data.rows, "table rows", LIMITS.tableRows);
  validateTableColumns(data.columns);
  for (const row of data.rows) validateTableRow(row, data.columns.length);
}

function validateTableColumns(columns) {
  const ids = new Set();
  for (const column of columns) {
    if (typeof column === "string") assertText(column, "table column", LIMITS.label);
    else validateTableColumn(column, ids);
  }
}

function validateTableColumn(column, ids) {
  assertRecord(column, "table column");
  assertUniqueId(column, ids, "table column");
  assertText(column.label, "table column label", LIMITS.label);
}

function validateTableRow(row, columnCount) {
  const cells = Array.isArray(row) ? row : tableRowCells(row);
  assertCollection(cells, "table cells", LIMITS.tableColumns);
  if (cells.length !== columnCount) throw new TypeError("Invalid table cell count");
  for (const cell of cells) assertText(cell, "table cell", 2_000);
}

function tableRowCells(row) {
  assertRecord(row, "table row");
  assertId(row.id, "table row ID");
  return row.cells;
}

function validateImageCard(data) {
  assertText(data.title, "image card title", LIMITS.label);
  const text = data.text ?? data.description;
  assertText(text, "image card text");
  if (data.media !== undefined && data.media !== null) validateMedia(data.media, "image card media");
}

function validateIconList(data) {
  assertText(data.title, "icon list title", LIMITS.label);
  assertCollection(data.items, "icon list items");
  const ids = new Set();
  for (const item of data.items) validateIconItem(item, ids, "icon list item", false);
}

function validateIconItem(item, ids, label, requirePreset) {
  assertRecord(item, label);
  assertUniqueId(item, ids, label);
  assertText(item.label, `${label} label`, LIMITS.label);
  assertText(item.iconKey, `${label} icon key`, 100);
  if (requirePreset || item.presetId !== undefined) assertId(item.presetId, `${label} preset ID`);
  if (item.text !== undefined) assertText(item.text, `${label} text`);
}

function validateChecklist(data) {
  assertText(data.title, "checklist title", LIMITS.label);
  assertCollection(data.items, "checklist items");
  const ids = new Set();
  for (const item of data.items) validateChecklistItem(item, ids);
}

function validateChecklistItem(item, ids) {
  assertRecord(item, "checklist item");
  assertUniqueId(item, ids, "checklist item");
  assertText(item.label, "checklist item label", LIMITS.label);
  if (typeof item.checked !== "boolean") throw new TypeError("Invalid checklist item checked");
}

function validateFacts(data) {
  assertText(data.title, "facts title", LIMITS.label);
  assertCollection(data.items, "facts items");
  const ids = new Set();
  for (const item of data.items) validateFact(item, ids);
}

function validateFact(item, ids) {
  assertRecord(item, "fact item");
  assertUniqueId(item, ids, "fact item");
  assertTextFields(item, ["label", "value"], "fact item");
}

function assertCollection(value, label, max = LIMITS.collection) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
}

function assertTextFields(record, fields, label, max = LIMITS.text) {
  for (const field of fields) assertText(record[field], `${label} ${field}`, max);
}

function assertOptionalTextFields(record, fields, label) {
  for (const field of fields) {
    if (record[field] !== undefined) assertText(record[field], `${label} ${field}`);
  }
}

function assertText(value, label, max = LIMITS.text) {
  if (typeof value !== "string" || value.length > max) throw new TypeError(`Invalid ${label}`);
}

function assertDate(value, label) {
  assertText(value, label, 10);
  if (!isIsoDate(value)) throw new TypeError(`Invalid ${label}`);
}

function assertDateOrder(startValue, endValue, label) {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (start && end && end < start) throw new TypeError(`Invalid ${label}`);
}

function assertHttpsUrl(value, label) {
  assertText(value, label, LIMITS.url);
  let url;
  try { url = new URL(value); } catch { throw new TypeError(`Invalid ${label}`); }
  if (url.protocol !== "https:") throw new TypeError(`Invalid ${label}`);
}

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`Invalid ${label}`);
}

function assertUniqueId(record, ids, label) {
  assertId(record.id, `${label} ID`);
  if (ids.has(record.id)) throw new TypeError(`Invalid ${label} ID`);
  ids.add(record.id);
}

function assertId(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > LIMITS.id) throw new TypeError(`Invalid ${label}`);
}
