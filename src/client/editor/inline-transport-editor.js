const CONTROL_SELECTOR = "[data-inline-transport-field]";
const STRUCTURED_VIEWS = "[data-inline-transport-view]";

export function createInlineTransportEditor({ store, root = document }) {
  root.addEventListener("input", handleInput, true);

  return { apply };

  function apply() {
    const editing = store.getState().editing;
    for (const view of root.querySelectorAll(STRUCTURED_VIEWS)) lockView(view, editing);
    for (const control of root.querySelectorAll(CONTROL_SELECTOR)) {
      const hiddenStopCount = control.dataset.inlineTransportField === "stopCount"
        && control.closest(".transport-stop-count-control")?.classList.contains("is-hidden");
      control.disabled = !editing || hiddenStopCount;
    }
  }

  function handleInput(event) {
    const control = event.target.closest?.(CONTROL_SELECTOR);
    if (!control || !store.getState().editing) return;
    const blockElement = control.closest(".editor-block[data-block-id]");
    if (!blockElement) return;
    const section = blockElement.closest("[data-section-root]")?.dataset.sectionRoot;
    if (section !== "transport") return;

    store.mutate((tripDocument) => {
      const block = tripDocument.sections.transport.find((entry) => entry.id === blockElement.dataset.blockId);
      if (!block || !updateTransportStructuredField(block, control.dataset.inlineTransportField, control.value)) return;
      clearStructuredTextOverrides(tripDocument.meta, blockElement, control.dataset.inlineTransportField);
    });
    syncDependentControls(blockElement, control.dataset.inlineTransportField, control.value);
  }
}

export function updateTransportStructuredField(block, field, value) {
  if (!block?.data) return false;
  return STRUCTURED_FIELD_UPDATERS[field]?.(block, value) ?? false;
}

const STRUCTURED_FIELD_UPDATERS = Object.freeze({
  directionMode: updateDirectionMode,
  serviceType: updateServiceType,
  stopCount: updateStopCount,
  seatCount: updateSeatCount,
});

function updateDirectionMode(block, value) {
  const directionMode = normaliseDirectionMode(value);
  block.data.directionMode = directionMode;
  block.data.direction = directionMode === "inbound" ? "Inbound" : "Outbound";
  return true;
}

function updateServiceType(block, value) {
  if (block.type !== "flight") return false;
  const serviceType = value === "layover" ? "layover" : "direct";
  block.data.serviceType = serviceType;
  block.data.stopCount = serviceType === "layover" ? Math.max(1, transportStopCount(block.data)) : 0;
  updateLegacyStopCopy(block.data);
  return true;
}

function updateStopCount(block, value) {
  if (block.type !== "flight") return false;
  block.data.serviceType = "layover";
  block.data.stopCount = boundedInteger(value, 1, 9, 1);
  updateLegacyStopCopy(block.data);
  return true;
}

function updateSeatCount(block, value) {
  block.data.seatCount = boundedInteger(value, 0, 20, 0);
  return true;
}

export function normaliseDirectionMode(value) {
  const direction = String(value ?? "").trim().toLocaleLowerCase();
  return ["inbound", "return", "volta"].includes(direction) ? "inbound" : "outbound";
}

export function transportServiceType(data) {
  if (data?.serviceType === "layover") return "layover";
  if (data?.serviceType === "direct") return "direct";
  return /layover|connection|conex[aã]o|escala/iu.test(String(data?.stop ?? "")) ? "layover" : "direct";
}

export function transportStopCount(data) {
  if (Number.isInteger(data?.stopCount)) return boundedInteger(data.stopCount, 0, 9, 0);
  const count = Number.parseInt(String(data?.stop ?? "").match(/\d+/u)?.[0] ?? "", 10);
  return transportServiceType(data) === "layover" ? boundedInteger(count, 1, 9, 1) : 0;
}

export function transportSeatCount(data) {
  return boundedInteger(data?.seatCount, 0, 20, 0);
}

function updateLegacyStopCopy(data) {
  const count = transportStopCount(data);
  data.stop = data.serviceType === "layover"
    ? `Layover · ${count} ${count === 1 ? "stop" : "stops"}`
    : "Direct";
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function lockView(view, editing) {
  if (!editing) return;
  view.contentEditable = "false";
  view.removeAttribute("role");
  view.removeAttribute("aria-label");
  view.removeAttribute("spellcheck");
}

function clearStructuredTextOverrides(meta, blockElement, field) {
  const viewField = structuredViewField(field);
  if (!viewField || !meta?.inlineText) return;
  const view = blockElement.querySelector(`[data-inline-transport-view="${viewField}"]`);
  if (!view) return;
  for (const target of view.querySelectorAll("[data-inline-text-key]")) clearBilingualKey(meta.inlineText, target.dataset.inlineTextKey);
  if (view?.dataset.inlineTextKey) clearBilingualKey(meta.inlineText, view.dataset.inlineTextKey);
}

function structuredViewField(field) {
  if (field === "directionMode") return "directionMode";
  if (["serviceType", "stopCount"].includes(field)) return "serviceType";
  return null;
}

function clearBilingualKey(overrides, key) {
  if (!key) return;
  delete overrides[key];
  const match = /^(en-GB|pt-BR):(.*)$/u.exec(key);
  if (!match) return;
  const targetLocale = match[1] === "en-GB" ? "pt-BR" : "en-GB";
  delete overrides[`${targetLocale}:${match[2]}`];
}

function syncDependentControls(block, field, value) {
  if (field !== "serviceType") return;
  const stopControl = block.querySelector(".transport-stop-count-control");
  const stopInput = stopControl?.querySelector("input");
  const layover = value === "layover";
  stopControl?.classList.toggle("is-hidden", !layover);
  if (stopInput) {
    stopInput.disabled = !layover;
    if (layover && Number(stopInput.value) < 1) stopInput.value = "1";
  }
}
