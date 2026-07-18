import { clone } from "../utils/html.js";
import { normalizeAmenitySearch } from "../domain/amenity-catalog.js";
import { hasTrustedIcon } from "../ui/icon-registry.js";

export function addBlock(document, section, block) {
  getBlocks(document, section).push(block);
}

export function addBlockAfter(document, section, block, afterId = null) {
  const blocks = getBlocks(document, section);
  if (!afterId) return blocks.push(block);
  blocks.splice(findIndex(blocks, afterId) + 1, 0, block);
}

export function deleteBlock(document, section, blockId) {
  const blocks = getBlocks(document, section);
  const index = findIndex(blocks, blockId);
  blocks.splice(index, 1);
}

export function duplicateBlock(document, section, blockId, idFactory = crypto.randomUUID) {
  const blocks = getBlocks(document, section);
  const index = findIndex(blocks, blockId);
  const duplicate = clone(blocks[index]);
  regenerateIds(duplicate, idFactory);
  duplicate.id = `${section}-${idFactory()}`;
  blocks.splice(index + 1, 0, duplicate);
}

export function setBlockCover(document, section, blockId, cover) {
  findBlock(document, section, blockId).cover = cover;
}

export function setBlockSpan(document, section, blockId, span) {
  findBlock(document, section, blockId).layout = { span: Number(span) };
}

export function toggleBlockColorHeader(document, section, blockId) {
  const block = findBlock(document, section, blockId);
  block.appearance = { colorHeader: !block.appearance?.colorHeader };
}

export function setPlaceCover(document, context, cover) {
  findPlace(document, context).cover = cover;
}

export function setFoodCover(document, context, cover) {
  findFoodOption(document, context).cover = cover;
}

export function updateTable(document, context, value) {
  const block = findBlock(document, context.section, context.blockId);
  if (context.kind === "column") block.data.columns[context.column].label = value;
  if (context.kind === "cell") block.data.rows[context.row].cells[context.column] = value;
}

export function changeTable(document, context) {
  const data = findBlock(document, context.section, context.blockId).data;
  if (context.action === "add-row" && data.rows.length < 50) data.rows.push(newTableRow(data.columns.length));
  if (context.action === "delete-row") data.rows.splice(context.row, 1);
  if (context.action === "add-column" && data.columns.length < 12) addTableColumn(data);
  if (context.action === "delete-column" && data.columns.length > 1) deleteTableColumn(data);
}

export function changeGenericList(document, context, value) {
  const block = findBlock(document, context.section, context.blockId);
  if (context.action === "add") return block.data.items.push(newGenericItem(block.type));
  if (context.action === "delete") return block.data.items.splice(context.index, 1);
  block.data.items[context.index][context.property] = value;
}

export function updateAmenityGroup(document, context, value) {
  findAmenityGroup(document, context).label = value;
}

export function changeAmenities(document, context, preset) {
  const block = findBlock(document, context.section, context.blockId);
  if (context.action === "add-group") return block.data.groups.push({ id: `group-${crypto.randomUUID()}`, label: "New Category", items: [] });
  const group = findAmenityGroup(document, context);
  if (context.action === "delete-group") return block.data.groups.splice(findIndex(block.data.groups, context.groupId), 1);
  if (context.action === "delete-item") return group.items.splice(findIndex(group.items, context.itemId), 1);
  if (context.action === "add-custom") return addCustomAmenity(block, group, preset);
  if (context.action === "add-item") group.items.push({ id: `amenity-${crypto.randomUUID()}`, presetId: preset.id, label: preset.label, iconKey: preset.iconKey });
}

function addCustomAmenity(block, group, custom) {
  const label = String(custom?.label ?? "").trim().replace(/\s+/g, " ");
  if (!label || label.length > 500 || !hasTrustedIcon(custom?.iconKey) || group.items.length >= 100) return false;
  const normalized = normalizeAmenitySearch(label);
  const existing = block.data.groups.flatMap((item) => item.items)
    .find((item) => normalizeAmenitySearch(item.label) === normalized);
  if (existing) {
    if (existing.presetId === "custom") existing.iconKey = custom.iconKey;
    return false;
  }
  group.items.push({ id: `amenity-${crypto.randomUUID()}`, presetId: "custom", label, iconKey: custom.iconKey });
  return true;
}

export function updateAnatomy(document, context, value) {
  const space = findSpace(document, context);
  if (context.kind === "space") space.label = value;
  if (context.kind === "bed") {
    const bed = space.beds[findIndex(space.beds, context.bedId)];
    bed[context.property] = context.property === "quantity" ? Math.max(1, Number(value) || 1) : value;
  }
}

export function changeAnatomy(document, context) {
  const block = findBlock(document, context.section, context.blockId);
  if (context.action === "add-space") return block.data.spaces.push({ id: `space-${crypto.randomUUID()}`, label: "New Room", beds: [] });
  const space = findSpace(document, context);
  if (context.action === "delete-space") return block.data.spaces.splice(findIndex(block.data.spaces, context.spaceId), 1);
  if (context.action === "add-bed") return space.beds.push({ id: `bed-${crypto.randomUUID()}`, label: "Double Bed", quantity: 1 });
  if (context.action === "delete-bed") space.beds.splice(findIndex(space.beds, context.bedId), 1);
}

export function moveBlock(document, section, blockId, offset) {
  const blocks = getBlocks(document, section);
  const source = findIndex(blocks, blockId);
  const destination = Math.max(0, Math.min(blocks.length - 1, source + offset));
  if (source === destination) return;
  blocks.splice(destination, 0, blocks.splice(source, 1)[0]);
}

export function moveBlockBefore(document, section, blockId, targetId) {
  moveBlockRelative(document, section, blockId, targetId, false);
}

export function moveBlockRelative(document, section, blockId, targetId, after) {
  const blocks = getBlocks(document, section);
  const source = findIndex(blocks, blockId);
  const target = findIndex(blocks, targetId);
  if (source === target) return;
  const [block] = blocks.splice(source, 1);
  const adjustedTarget = source < target ? target - 1 : target;
  blocks.splice(adjustedTarget + (after ? 1 : 0), 0, block);
}

export function moveBlockToEnd(document, section, blockId) {
  const blocks = getBlocks(document, section);
  blocks.push(blocks.splice(findIndex(blocks, blockId), 1)[0]);
}

export function setBlockField(document, section, blockId, field, value) {
  const data = findBlock(document, section, blockId).data;
  const [group, property] = field.split(".");
  if (property) data[group][property] = value;
  else data[group] = value;
}

export function setListItem(document, context, value) {
  const block = findBlock(document, context.section, context.blockId);
  const item = block.data.items[context.index];
  if (context.property) item[context.property] = value;
  else block.data.items[context.index] = value;
}

export function addListItem(document, context) {
  const block = findBlock(document, context.section, context.blockId);
  const value = block.type === "essentials" ? { label: "New Detail", value: "Add value" } : "New Item";
  block.data.items.push(value);
}

export function deleteListItem(document, context) {
  findBlock(document, context.section, context.blockId).data.items.splice(context.index, 1);
}

export function updatePlace(document, context, value) {
  findPlace(document, context)[context.property] = value;
}

export function addPlace(document, section, blockId) {
  const block = findBlock(document, section, blockId);
  block.data.places.push(newPlace());
}

export function deletePlace(document, context) {
  const places = findBlock(document, context.section, context.blockId).data.places;
  places.splice(findIndex(places, context.placeId), 1);
}

export function movePlace(document, context, offset) {
  const places = findBlock(document, context.section, context.blockId).data.places;
  const source = findIndex(places, context.placeId);
  const destination = Math.max(0, Math.min(places.length - 1, source + offset));
  if (source !== destination) places.splice(destination, 0, places.splice(source, 1)[0]);
}

export function updateFoodOption(document, context, value) {
  findFoodOption(document, context)[context.property] = value;
}

export function addFoodOption(document, context) {
  findMeal(document, context).push(newFoodOption());
}

export function deleteFoodOption(document, context) {
  const options = findMeal(document, context);
  options.splice(findIndex(options, context.foodId), 1);
}

export function moveFoodOption(document, context, offset) {
  const options = findMeal(document, context);
  const source = findIndex(options, context.foodId);
  const destination = Math.max(0, Math.min(options.length - 1, source + offset));
  if (source !== destination) options.splice(destination, 0, options.splice(source, 1)[0]);
}

function newPlace() {
  return {
    id: `place-${crypto.randomUUID()}`,
    name: "New Place",
    mapUrl: "",
    websiteUrl: "",
    image: "",
    comment: "",
    cover: null,
    priority: "medium",
  };
}

function newFoodOption() {
  return {
    id: `food-${crypto.randomUUID()}`,
    name: "New Food Option",
    mapUrl: "",
    websiteUrl: "",
    cover: null,
    priority: "medium",
  };
}

function regenerateIds(value, idFactory) {
  if (Array.isArray(value)) return value.forEach((item) => regenerateIds(item, idFactory));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "id") value[key] = `item-${idFactory()}`;
    else regenerateIds(item, idFactory);
  }
}

function newTableRow(count) { return { id: `row-${crypto.randomUUID()}`, cells: Array(count).fill("") }; }
function addTableColumn(data) { data.columns.push({ id: `column-${crypto.randomUUID()}`, label: `Column ${data.columns.length + 1}` }); data.rows.forEach((item) => item.cells.push("")); }
function deleteTableColumn(data) { data.columns.pop(); data.rows.forEach((item) => item.cells.pop()); }
function newGenericItem(type) {
  if (type === "facts") return { id: `item-${crypto.randomUUID()}`, label: "Detail", value: "Value" };
  if (type === "checklist") return { id: `item-${crypto.randomUUID()}`, label: "New Task", checked: false };
  return { id: `item-${crypto.randomUUID()}`, label: "New Item", iconKey: "check", text: "" };
}

function findPlace(document, context) {
  const places = findBlock(document, context.section, context.blockId).data.places;
  return places[findIndex(places, context.placeId)];
}

function findMeal(document, context) {
  return findBlock(document, context.section, context.blockId).data.meals[context.meal];
}

function findFoodOption(document, context) {
  const options = findMeal(document, context);
  return options[findIndex(options, context.foodId)];
}

function findAmenityGroup(document, context) {
  const groups = findBlock(document, context.section, context.blockId).data.groups;
  return groups[findIndex(groups, context.groupId)];
}

function findSpace(document, context) {
  const spaces = findBlock(document, context.section, context.blockId).data.spaces;
  return spaces[findIndex(spaces, context.spaceId)];
}

function findBlock(document, section, blockId) {
  return getBlocks(document, section)[findIndex(getBlocks(document, section), blockId)];
}

function getBlocks(document, section) {
  const blocks = document.sections[section];
  if (!Array.isArray(blocks)) throw new TypeError(`Unknown section: ${section}`);
  return blocks;
}

function findIndex(items, id) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new TypeError(`Unknown block: ${id}`);
  return index;
}
