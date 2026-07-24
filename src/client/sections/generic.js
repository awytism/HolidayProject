import { escapeHtml, safeUrl } from "../utils/html.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";
import { editField } from "./shared.js";

export const GENERIC_TYPES = new Set(["table", "image-card", "icon-list", "checklist", "facts", "link-card", "note"]);

export function renderGenericBlock(block, editing) {
  if (editing) return renderGenericEditor(block);
  const renderers = {
    table: renderTable,
    "image-card": renderImageCard,
    "icon-list": renderIconList,
    checklist: renderChecklist,
    facts: renderFacts,
    "link-card": renderLinkCard,
    note: renderNote,
  };
  return renderers[block.type](block.data);
}

export function createGenericBlock(type, section = "generic") {
  const dataFactories = {
    table: () => ({ title: "Nova Tabela", columns: [column("Coluna 1"), column("Coluna 2")], rows: [row(2)] }),
    "image-card": () => ({ title: "Cartão com Imagem", text: "Adicione uma descrição.", media: null }),
    "icon-list": () => ({ title: "Lista com Ícones", items: [iconItem()] }),
    checklist: () => ({ title: "Lista de Tarefas", items: [checkItem()] }),
    facts: () => ({ title: "Informações Principais", items: [factItem()] }),
    "link-card": () => ({ title: "Link Útil", description: "Adicionar contexto", url: "https://" }),
    note: () => ({ title: "Descrição", text: "Adicione os detalhes aqui." }),
  };
  return { id: `${section}-${crypto.randomUUID()}`, type, cover: null, data: dataFactories[type]() };
}

function renderGenericEditor(block) {
  const data = block.data;
  if (block.type === "table") return renderTableEditor(data);
  if (["icon-list", "checklist", "facts"].includes(block.type)) return renderCollectionEditor(block.type, data);
  const textField = ["note", "image-card"].includes(block.type) ? "text" : "description";
  const value = data[textField] ?? data.text ?? "";
  const url = block.type === "link-card" ? editField("URL", "url", data.url, { type: "url", full: true }) : "";
  return `<div class="content-block edit-form">${editField("Título", "title", data.title)}${editField("Descrição", textField, value, { multiline: true, full: true })}${url}</div>`;
}

function renderTable(data) {
  const head = data.columns.map((item) => `<th>${escapeHtml(typeof item === "string" ? item : item.label)}</th>`).join("");
  const body = data.rows.map((item) => `<tr>${item.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  return `<article class="content-block generic-card table-block"><h3>${escapeHtml(data.title)}</h3><div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></article>`;
}

function renderTableEditor(data) {
  const headers = data.columns.map((item, index) => `<input value="${escapeHtml(item.label)}" data-table-column="${index}" aria-label="Coluna ${index + 1}">`).join("");
  const rows = data.rows.map((item, rowIndex) => `<div class="table-edit-row" data-row-index="${rowIndex}">${item.cells.map((cell, columnIndex) => `<input value="${escapeHtml(cell)}" data-table-cell="${columnIndex}" aria-label="Linha ${rowIndex + 1} coluna ${columnIndex + 1}">`).join("")}<button type="button" data-table-action="delete-row" aria-label="Excluir linha" title="Excluir linha">${renderActionIcon("trash")}<span class="sr-only">Excluir linha</span></button></div>`).join("");
  return `<div class="content-block edit-form table-editor">${editField("Título", "title", data.title)}<div class="table-edit-columns">${headers}</div>${rows}<div class="inline-actions"><button type="button" data-table-action="add-row">+ Linha</button><button type="button" data-table-action="add-column">+ Coluna</button><button type="button" data-table-action="delete-column">− Coluna</button></div></div>`;
}

function renderCollectionEditor(type, data) {
  const rows = data.items.map((item, index) => collectionEditRow(type, item, index)).join("");
  return `<div class="content-block edit-form">${editField("Título", "title", data.title)}<div class="list-editor">${rows}</div><button class="inline-add" type="button" data-generic-list-action="add">+ Adicionar Item</button></div>`;
}

function collectionEditRow(type, item, index) {
  if (type === "facts") return `<div class="list-edit-row two-fields" data-generic-index="${index}"><input value="${escapeHtml(item.label)}" data-generic-field="label" aria-label="Rótulo"><input value="${escapeHtml(item.value)}" data-generic-field="value" aria-label="Valor"><button type="button" data-generic-list-action="delete" aria-label="Excluir item" title="Excluir item">${renderActionIcon("trash")}<span class="sr-only">Excluir item</span></button></div>`;
  if (type === "checklist") return `<div class="list-edit-row checklist-edit" data-generic-index="${index}"><input type="checkbox" ${item.checked ? "checked" : ""} data-generic-field="checked" aria-label="Concluído"><input value="${escapeHtml(item.label)}" data-generic-field="label" aria-label="Item da lista"><button type="button" data-generic-list-action="delete" aria-label="Excluir item" title="Excluir item">${renderActionIcon("trash")}<span class="sr-only">Excluir item</span></button></div>`;
  return `<div class="list-edit-row two-fields" data-generic-index="${index}"><input value="${escapeHtml(item.label)}" data-generic-field="label" aria-label="Item"><input value="${escapeHtml(item.iconKey)}" data-generic-field="iconKey" aria-label="Chave do ícone"><button type="button" data-generic-list-action="delete" aria-label="Excluir item" title="Excluir item">${renderActionIcon("trash")}<span class="sr-only">Excluir item</span></button></div>`;
}

function renderImageCard(data) {
  return `<article class="content-block generic-card image-text-card"><div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.text)}</p></div></article>`;
}

function renderIconList(data) {
  const items = data.items.map((item) => `<li><span class="trusted-icon">${renderIcon(item.iconKey)}</span><span>${escapeHtml(item.label)}</span></li>`).join("");
  return `<article class="content-block generic-card"><h3>${escapeHtml(data.title)}</h3><ul class="icon-grid">${items}</ul></article>`;
}

function renderChecklist(data) {
  const items = data.items.map((item) => `<li><span>${item.checked ? "✓" : "○"}</span>${escapeHtml(item.label)}</li>`).join("");
  return `<article class="content-block generic-card"><h3>${escapeHtml(data.title)}</h3><ul class="check-list">${items}</ul></article>`;
}

function renderFacts(data) {
  const items = data.items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("");
  return `<article class="content-block generic-card"><h3>${escapeHtml(data.title)}</h3><dl class="facts-grid">${items}</dl></article>`;
}

function renderLinkCard(data) {
  const url = safeUrl(data.url);
  return `<article class="content-block link-block"><div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></div>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir Link ↗</a>` : ""}</article>`;
}

function renderNote(data) {
  return `<article class="content-block note-block"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.text)}</p></article>`;
}

function column(label) { return { id: `column-${crypto.randomUUID()}`, label }; }
function row(count) { return { id: `row-${crypto.randomUUID()}`, cells: Array(count).fill("") }; }
function iconItem() { return { id: `item-${crypto.randomUUID()}`, label: "Novo Item", iconKey: "check", text: "" }; }
function checkItem() { return { id: `item-${crypto.randomUUID()}`, label: "Nova Tarefa", checked: false }; }
function factItem() { return { id: `item-${crypto.randomUUID()}`, label: "Detalhe", value: "Valor" }; }
