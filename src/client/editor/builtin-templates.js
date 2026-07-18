import { createGenericBlock } from "../sections/generic.js";

const DEFINITIONS = [
  ["description", "Caixa de descrição", "note"],
  ["table", "Tabela", "table"],
  ["amenity-list", "Lista de comodidades", "icon-list"],
  ["image-card", "Cartão com imagem e texto", "image-card"],
  ["checklist", "Lista de tarefas", "checklist"],
  ["facts", "Informações principais", "facts"],
  ["link-card", "Cartão de link", "link-card"],
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
