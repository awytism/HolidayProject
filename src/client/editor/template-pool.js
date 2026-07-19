import { addBlockAfter } from "./commands.js";
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from "./builtin-templates.js";
import { escapeHtml } from "../utils/html.js";

export function createTemplateController(api, auth, store, render, options = {}) {
  const showToast = options.showToast ?? (() => {});
  const translate = options.translate ?? ((value) => value);
  const dialog = document.createElement("dialog");
  dialog.className = "template-dialog";
  document.body.append(dialog);
  let customTemplates = [];
  let insertion = null;
  dialog.addEventListener("click", (event) => handleClick(event));
  dialog.addEventListener("input", (event) => {
    if (!event.target.matches(".template-search")) return;
    const query = event.target.value.trim().toLowerCase();
    dialog.querySelectorAll(".template-card").forEach((card) => {
      card.hidden = !card.textContent.toLowerCase().includes(query);
    });
  });

  return { open, saveBlock };

  async function open(section, afterId = null) {
    insertion = { section, afterId };
    try {
      customTemplates = (await api.listTemplates()).templates;
      dialog.innerHTML = renderPool(section, customTemplates, translate);
      dialog.showModal();
    } catch (error) { showToast(error.message); }
  }

  async function saveBlock(section, block) {
    const name = window.prompt(translate("Template name"));
    if (!name?.trim()) return;
    try {
      await api.createTemplate(name.trim(), { sectionScope: section, block: structuredClone(block) }, csrf());
      showToast(`${translate("Template")} “${name.trim()}” ${translate("saved")}`);
    } catch (error) { showToast(error.message); }
  }

  async function handleClick(event) {
    if (event.target.closest("[data-template-close]")) return dialog.close();
    const builtin = event.target.closest("[data-builtin-template]");
    if (builtin) return insertBuiltin(builtin.dataset.builtinTemplate);
    const custom = event.target.closest("[data-custom-template]");
    if (custom) return insertCustom(custom.dataset.customTemplate);
    const remove = event.target.closest("[data-delete-template]");
    if (remove) await deleteTemplate(remove.dataset.deleteTemplate);
    const rename = event.target.closest("[data-rename-template]");
    if (rename) await renameTemplate(rename.dataset.renameTemplate);
  }

  function insertBuiltin(id) {
    const template = getBuiltinTemplate(id);
    insertBlock(template.create(insertion.section));
  }

  function insertCustom(id) {
    const template = customTemplates.find((item) => item.id === id);
    insertBlock(instantiateTemplate(template.template.block, insertion.section));
  }

  function insertBlock(block) {
    store.mutate((document) => addBlockAfter(document, insertion.section, block, insertion.afterId));
    dialog.close();
    render();
  }

  async function deleteTemplate(id) {
    const template = customTemplates.find((item) => item.id === id);
    if (!window.confirm(`${translate("Delete template")} “${template.name}”?`)) return;
    try {
      await api.deleteTemplate(id, template.revision, csrf());
      customTemplates = customTemplates.filter((item) => item.id !== id);
      dialog.innerHTML = renderPool(insertion.section, customTemplates, translate);
    } catch (error) { showToast(error.message); }
  }

  async function renameTemplate(id) {
    const template = customTemplates.find((item) => item.id === id);
    const name = window.prompt(translate("Rename template"), template.name);
    if (!name?.trim()) return;
    try {
      const updated = await api.updateTemplate(id, template.revision, name.trim(), template.template, csrf());
      customTemplates = customTemplates.map((item) => item.id === id ? updated : item);
      dialog.innerHTML = renderPool(insertion.section, customTemplates, translate);
    } catch (error) { showToast(error.message); }
  }

  function csrf() { return auth.getSession().csrfToken; }
}

export function instantiateTemplate(block, section, idFactory = crypto.randomUUID) {
  const copy = structuredClone(block);
  replaceIds(copy, idFactory);
  copy.id = `${section}-${idFactory()}`;
  return copy;
}

function replaceIds(value, idFactory) {
  if (Array.isArray(value)) return value.forEach((item) => replaceIds(item, idFactory));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "id") value[key] = `item-${idFactory()}`;
    else replaceIds(item, idFactory);
  }
}

function renderPool(section, customTemplates, translate) {
  const builtins = BUILTIN_TEMPLATES.map((item) => templateCard(item, "builtin", translate)).join("");
  const custom = customTemplates.filter((item) => scopeAllows(item.template.sectionScope, section))
    .map((item) => customCard(item, translate)).join("");
  return `<div class="template-pool"><button type="button" class="dialog-close" data-template-close aria-label="${translate("Close")}">×</button><small>${translate("Block Library")}</small><h2>${translate("Insert a Template")}</h2><input class="template-search" type="search" placeholder="${translate("Search templates")}" aria-label="${translate("Search templates")}"><h3>${translate("Included")}</h3><div class="template-grid">${builtins}</div><h3>${translate("Your Templates")}</h3><div class="template-grid">${custom || `<p class="template-empty">${translate("No custom templates yet.")}</p>`}</div></div>`;
}

function templateCard(item, kind, translate) {
  return `<button type="button" class="template-card" data-${kind}-template="${escapeHtml(item.id)}">${renderTemplatePrototype(item.type)}<strong>${escapeHtml(translate(item.name))}</strong><span class="template-action">${translate("Insert Block")}</span></button>`;
}

export function renderTemplatePrototype(type) {
  const shapes = {
    note: '<i class="prototype-heading"></i><i></i><i class="short"></i>',
    table: Array(9).fill("<i></i>").join(""),
    "icon-list": Array(4).fill('<i><b></b><em></em></i>').join(""),
    "image-card": '<i class="prototype-image"></i><i class="prototype-heading"></i><i class="short"></i>',
    checklist: Array(3).fill('<i><b></b><em></em></i>').join(""),
    facts: Array(4).fill('<i><b></b><em></em></i>').join(""),
    "link-card": '<i class="prototype-heading"></i><i class="short"></i><b class="prototype-button"></b>',
  };
  return `<span class="template-prototype is-${escapeHtml(type)}" aria-hidden="true">${shapes[type] ?? ""}</span>`;
}

function customCard(item, translate) {
  return `<div class="template-card custom"><button type="button" data-custom-template="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><span>${translate("Insert Block")}</span></button><div><button type="button" data-rename-template="${escapeHtml(item.id)}">${translate("Rename")}</button><button type="button" data-delete-template="${escapeHtml(item.id)}">${translate("Delete")}</button></div></div>`;
}

function scopeAllows(scope, section) { return scope === "all" || scope === section; }
