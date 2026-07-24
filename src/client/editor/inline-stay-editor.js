import { hasTrustedIcon } from "../ui/icon-registry.js";

const ACTIONS = Object.freeze({
  "remove-pill": removePropertyPill,
  "add-pill": addPropertyPill,
  "remove-group": removeAmenityGroup,
  "add-group": addAmenityGroup,
  "remove-item": removeAmenityItem,
  "add-item": addAmenityItem,
});

const LEGACY_PROPERTY_PILLS = Object.freeze([
  { id: "property-pill-home", iconKey: "home", label: "Entire holiday home" },
  { id: "property-pill-bed", iconKey: "bed", label: "Bedrooms and beds" },
  { id: "property-pill-bath", iconKey: "amenity-bathtub", label: "Bathroom details" },
  { id: "property-pill-view", iconKey: "mountain", label: "Size or setting" },
]);

const EDITABLE_SELECTOR = "[data-inline-stay-field]";

export function createInlineStayEditor({ store, render, root = document }) {
  root.addEventListener("click", handleClick, true);
  root.addEventListener("input", handleInput, true);
  root.addEventListener("keydown", handleKeydown, true);

  return { apply };

  function apply() {
    const editing = store.getState().editing;
    for (const target of root.querySelectorAll(EDITABLE_SELECTOR)) {
      target.contentEditable = String(editing);
      target.spellcheck = editing;
      if (editing) {
        target.setAttribute("role", "textbox");
        target.setAttribute("aria-label", "Edit text");
      } else {
        target.removeAttribute("role");
        target.removeAttribute("aria-label");
      }
    }
  }

  function handleClick(event) {
    const control = event.target.closest?.("[data-inline-stay-action]");
    if (!control || !store.getState().editing) return;
    const block = control.closest(".editor-block[data-block-id]");
    const section = block?.closest("[data-section-root]")?.dataset.sectionRoot;
    if (!block || !section) return;
    event.preventDefault();
    event.stopPropagation();
    store.setActive(section);
    store.mutate((tripDocument) => mutateStayBlock(tripDocument, block.dataset.blockId, control, section));
    render();
  }

  function handleInput(event) {
    const target = event.target.closest?.(EDITABLE_SELECTOR);
    if (!target || !store.getState().editing) return;
    const block = target.closest(".editor-block[data-block-id]");
    const section = block?.closest("[data-section-root]")?.dataset.sectionRoot;
    if (!block || !section) return;
    const value = target.textContent.replace(/\u00a0/gu, " ").trim();
    store.setActive(section);
    store.mutate((tripDocument) => updateStayNestedText(tripDocument, block.dataset.blockId, target, value, section));
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" || !event.target.closest?.(EDITABLE_SELECTOR)) return;
    event.preventDefault();
    event.target.blur();
  }
}

export function mutateStayBlock(tripDocument, blockId, control, section = "stay") {
  const block = findSectionBlock(tripDocument, section, blockId);
  const action = ACTIONS[control.dataset.inlineStayAction];
  if (!block || !action) return false;
  return action(block, control);
}

export function updateStayNestedText(tripDocument, blockId, target, value, section = "stay") {
  return updateStayNestedTextInSection(tripDocument, blockId, target, value, section);
}

function updateStayNestedTextInSection(tripDocument, blockId, target, value, section) {
  const block = findSectionBlock(tripDocument, section, blockId);
  if (!block) return false;
  const field = target.dataset.inlineStayField;
  if (field === "pill-label" && block.type === "stay-summary") {
    const pill = propertyPills(block.data, true).find((entry) => entry.id === target.dataset.stayPillId);
    if (!pill) return false;
    pill.label = value;
    return true;
  }
  if (block.type !== "stay-amenities") return false;
  const group = block.data.groups.find((entry) => entry.id === target.dataset.amenityGroupId);
  if (!group) return false;
  if (field === "group-label") {
    group.label = value;
    return true;
  }
  const item = group.items.find((entry) => entry.id === target.dataset.amenityItemId);
  if (field !== "item-label" || !item) return false;
  item.label = value;
  return true;
}

export function updateStayAmenityIcon(tripDocument, { blockId, groupId, itemId, iconKey, section = "stay" }) {
  if (!hasTrustedIcon(iconKey)) return false;
  const block = findSectionBlock(tripDocument, section, blockId);
  if (block?.type !== "stay-amenities") return false;
  const group = block.data.groups.find((entry) => entry.id === groupId);
  const item = group?.items.find((entry) => entry.id === itemId);
  if (!item) return false;
  item.iconKey = iconKey;
  return true;
}

export function propertyPills(data, materialize = false) {
  if (Array.isArray(data.propertyPills)) return data.propertyPills;
  const defaults = LEGACY_PROPERTY_PILLS.map((pill) => ({ ...pill }));
  if (materialize) data.propertyPills = defaults;
  return defaults;
}

function removePropertyPill(block, control) {
  if (block.type !== "stay-summary") return false;
  return removeById(propertyPills(block.data, true), control.dataset.stayPillId);
}

function addPropertyPill(block) {
  if (block.type !== "stay-summary") return false;
  propertyPills(block.data, true).push({ id: `property-pill-${crypto.randomUUID()}`, iconKey: "home", label: "Property detail" });
  return true;
}

function removeAmenityGroup(block, control) {
  if (block.type !== "stay-amenities") return false;
  return removeById(block.data.groups, control.dataset.amenityGroupId);
}

function addAmenityGroup(block) {
  if (block.type !== "stay-amenities") return false;
  block.data.groups.push({ id: `group-${crypto.randomUUID()}`, label: "New highlight group", items: [] });
  return true;
}

function removeAmenityItem(block, control) {
  if (block.type !== "stay-amenities") return false;
  const group = block.data.groups.find((entry) => entry.id === control.dataset.amenityGroupId);
  return group ? removeById(group.items, control.dataset.amenityItemId) : false;
}

function addAmenityItem(block, control) {
  if (block.type !== "stay-amenities") return false;
  const group = block.data.groups.find((entry) => entry.id === control.dataset.amenityGroupId);
  if (!group) return false;
  group.items.push({ id: `amenity-${crypto.randomUUID()}`, presetId: "custom", label: "New highlight", iconKey: "home" });
  return true;
}

function removeById(items, id) {
  const index = items.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  items.splice(index, 1);
  return true;
}

function findSectionBlock(tripDocument, section, blockId) {
  return tripDocument.sections[section]?.find((block) => block.id === blockId);
}
