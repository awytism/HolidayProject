import { createGenericBlock } from "../sections/generic.js";

const DEFINITIONS = [
  ["description", "Description box", "note"],
  ["table", "Table", "table"],
  ["amenity-list", "Amenities list", "icon-list"],
  ["image-card", "Image & text card", "image-card"],
  ["checklist", "Checklist", "checklist"],
  ["facts", "Key facts", "facts"],
  ["link-card", "Link card", "link-card"],
];

export const BUILTIN_TEMPLATES = Object.freeze(DEFINITIONS.map(([id, name, type]) => ({
  id,
  name,
  type,
  sectionScope: "all",
  create: (section) => createGenericBlock(type, section),
})));

export function getBuiltinTemplate(id) {
  return BUILTIN_TEMPLATES.find((item) => item.id === id);
}
