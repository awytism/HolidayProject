import { escapeHtml } from "../utils/html.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";

const VISA_LABELS = Object.freeze({
  "not-required": "Not Required",
  required: "Required",
  arrival: "Visa on Arrival",
  check: "Check Requirements",
});

const DRIVING_SIDE_LABELS = Object.freeze({
  right: "Right",
  left: "Left",
});

const FACTS = Object.freeze([
  { field: "visa", label: "Visa", icon: "passport", choices: VISA_LABELS },
  { field: "language", label: "Language", icon: "globe" },
  { field: "currency", label: "Currency", icon: "money" },
  { field: "timeZone", label: "Time Zone", icon: "clock" },
  { field: "drivingSide", label: "Driving Side", icon: "car", choices: DRIVING_SIDE_LABELS },
  { field: "plugType", label: "Plug", icon: "plug" },
  { field: "voltage", label: "Voltage", icon: "voltage" },
  { field: "frequency", label: "Frequency", icon: "frequency" },
]);

export function informationFactIconKey(blockId, factId) {
  return `information-fact:${blockId}:${factId}`;
}

export function additionalTravelFacts(data, materialize = false) {
  if (Array.isArray(data.additionalFacts)) return data.additionalFacts;
  if (materialize) data.additionalFacts = [];
  return data.additionalFacts ?? [];
}

export function createTravelEssentialsBlock(id = `travel-essentials-${crypto.randomUUID()}`) {
  return {
    id,
    type: "travel-essentials",
    cover: null,
    layout: { span: 12 },
    data: {
      title: "INFORMATION",
      visa: "not-required",
      currency: "Brazilian Real (BRL)",
      drivingSide: "right",
      plugType: "Type N",
      voltage: "127 / 220 V",
      frequency: "60 Hz",
      language: "Portuguese",
      timeZone: "BRT (UTC−3)",
      healthPrecautions: "Travel insurance recommended",
      vaccines: "Routine vaccines up to date",
      additionalFacts: [],
    },
  };
}

export function renderTravelEssentials(block) {
  const standardFacts = FACTS.map((fact) => renderFact(block.data, fact)).join("");
  const customFacts = additionalTravelFacts(block.data).map((fact) => renderAdditionalFact(block.id, fact)).join("");
  const title = informationTitle(block.data.title);
  const titleIcon = `<span class="feature-title-icon information-title-icon" data-inline-ignore aria-hidden="true">${renderIcon("information-circle")}</span>`;
  const addControl = `<button class="inline-entry-add travel-essential-add" type="button" data-inline-essential-action="add-fact" data-inline-ignore>${renderActionIcon("plus")}<span>Add information</span></button>`;
  return `<article class="content-block travel-essentials-card"><header class="feature-card-header information-card-header"><h3>${titleIcon}<span data-inline-essential-field="title" data-inline-ignore>${escapeHtml(title)}</span></h3></header><div class="travel-essentials-card-body"><div class="travel-essential-facts">${standardFacts}${customFacts}</div>${addControl}<div class="travel-health"><div class="travel-health-line"><span class="travel-health-icon" aria-hidden="true">${renderIcon("shield")}</span><span class="travel-health-copy"><small data-inline-static>SAFETY</small><span data-inline-essential-field="healthPrecautions" data-inline-ignore>${escapeHtml(block.data.healthPrecautions)}</span></span></div><div class="travel-health-line"><span class="travel-health-icon" aria-hidden="true">${renderIcon("syringe")}</span><span class="travel-health-copy"><small data-inline-static>VACCINES</small><span data-inline-essential-field="vaccines" data-inline-ignore>${escapeHtml(block.data.vaccines)}</span></span></div></div></div></article>`;
}

function renderAdditionalFact(blockId, fact) {
  const id = escapeHtml(fact.id);
  const iconKey = escapeHtml(informationFactIconKey(blockId, fact.id));
  const icon = renderIcon("information-circle").replace("<svg ", `<svg data-inline-icon-key="${iconKey}" data-inline-icon-name="information-circle" `);
  const remove = `<button class="inline-entry-remove travel-essential-fact-remove" type="button" data-inline-essential-action="remove-fact" data-travel-essential-fact-id="${id}" data-inline-ignore aria-label="Remove information" title="Remove information">${renderActionIcon("trash")}<span class="sr-only">Remove information</span></button>`;
  return `<div class="travel-essential-pill travel-essential-pill-custom" data-travel-essential-fact-id="${id}">${remove}<span class="travel-essential-icon" aria-hidden="true">${icon}</span><span class="travel-essential-copy"><small data-inline-essential-fact-field="label" data-inline-essential-fact-id="${id}" data-inline-ignore>${escapeHtml(fact.label)}</small><strong data-inline-essential-fact-field="value" data-inline-essential-fact-id="${id}" data-inline-ignore>${escapeHtml(fact.value)}</strong></span></div>`;
}
function renderFact(data, fact) {
  const value = fact.choices?.[data[fact.field]] ?? data[fact.field];
  const control = fact.choices ? renderChoice(fact.field, data[fact.field], fact.choices) : "";
  const editable = fact.choices
    ? `<strong class="travel-essential-choice-view" data-inline-static>${escapeHtml(value)}</strong>${control}`
    : `<strong data-inline-essential-field="${escapeHtml(fact.field)}" data-inline-ignore>${escapeHtml(value)}</strong>`;
  return `<div class="travel-essential-pill"><span class="travel-essential-icon" aria-hidden="true">${renderIcon(fact.icon)}</span><span class="travel-essential-copy"><small data-inline-static>${escapeHtml(fact.label)}</small>${editable}</span></div>`;
}

function informationTitle(value) {
  const title = String(value ?? "").trim();
  return ["", "Information", "Travel Essentials", "Itens Essenciais de Viagem", "Inboundge"].includes(title)
    ? "INFORMATION"
    : title;
}

function renderChoice(field, value, choices) {
  const options = Object.entries(choices).map(([key, label]) => (
    `<option value="${escapeHtml(key)}"${key === value ? " selected" : ""}>${escapeHtml(label)}</option>`
  )).join("");
  return `<label class="travel-essential-choice"><span class="sr-only">${escapeHtml(field)}</span><select data-inline-essential-choice="${escapeHtml(field)}" data-inline-ignore>${options}</select></label>`;
}
