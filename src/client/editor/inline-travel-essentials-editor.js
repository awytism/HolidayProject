import { additionalTravelFacts, informationFactIconKey } from "../sections/travel-essentials.js";

const TEXT_SELECTOR = "[data-inline-essential-field]";
const FACT_TEXT_SELECTOR = "[data-inline-essential-fact-field]";
const EDITABLE_SELECTOR = `${TEXT_SELECTOR},${FACT_TEXT_SELECTOR}`;
const ACTION_SELECTOR = "[data-inline-essential-action]";
const MAX_ADDITIONAL_FACTS = 24;

export function createInlineTravelEssentialsEditor({ store, render = () => {}, root = document }) {
  root.addEventListener("click", handleAction, true);
  root.addEventListener("input", handleTextInput, true);
  root.addEventListener("change", handleChoiceChange, true);
  root.addEventListener("keydown", handleKeydown, true);

  return { apply };

  function apply() {
    const editing = store.getState().editing;
    for (const target of root.querySelectorAll(EDITABLE_SELECTOR)) {
      target.contentEditable = String(editing);
      target.spellcheck = editing;
      if (editing) {
        target.setAttribute("role", "textbox");
        target.setAttribute("aria-label", target.dataset.inlineEssentialFactField === "label"
          ? "Edit information label"
          : "Edit travel essential");
      } else {
        target.removeAttribute("role");
        target.removeAttribute("aria-label");
      }
    }
  }

  function handleAction(event) {
    const control = event.target.closest?.(ACTION_SELECTOR);
    if (!control || !store.getState().editing) return;
    const context = blockContext(control);
    if (!context) return;
    event.preventDefault();
    event.stopPropagation();
    store.setActive(context.section);
    store.mutate((tripDocument) => {
      if (control.dataset.inlineEssentialAction === "add-fact") {
        addTravelEssentialFact(tripDocument, context.blockId, context.section);
      } else if (control.dataset.inlineEssentialAction === "remove-fact") {
        removeTravelEssentialFact(
          tripDocument,
          context.blockId,
          control.dataset.travelEssentialFactId,
          context.section,
        );
      }
    });
    render();
  }

  function handleTextInput(event) {
    const target = event.target.closest?.(EDITABLE_SELECTOR);
    if (!target || !store.getState().editing) return;
    const value = target.textContent.replace(/\u00a0/gu, " ").trim();
    const context = blockContext(target);
    if (!context) return;
    store.setActive(context.section);
    store.mutate((tripDocument) => {
      if (target.matches(FACT_TEXT_SELECTOR)) {
        updateTravelEssentialFact(tripDocument, {
          blockId: context.blockId,
          factId: target.dataset.inlineEssentialFactId,
          field: target.dataset.inlineEssentialFactField,
          value,
          section: context.section,
        });
      } else {
        updateTravelEssentialField(
          tripDocument,
          context.blockId,
          target.dataset.inlineEssentialField,
          value,
          context.section,
        );
      }
    });
  }

  function handleChoiceChange(event) {
    const target = event.target.closest?.("[data-inline-essential-choice]");
    if (!target || !store.getState().editing) return;
    const context = blockContext(target);
    if (!context) return;
    store.setActive(context.section);
    store.mutate((tripDocument) => updateTravelEssentialField(
      tripDocument,
      context.blockId,
      target.dataset.inlineEssentialChoice,
      target.value,
      context.section,
    ));
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" || !event.target.closest?.(EDITABLE_SELECTOR)) return;
    event.preventDefault();
    event.target.blur();
  }
}

export function addTravelEssentialFact(tripDocument, blockId, section = "transport") {
  const block = findTravelEssentialsBlock(tripDocument, blockId, section);
  if (!block) return false;
  const facts = additionalTravelFacts(block.data, true);
  if (facts.length >= MAX_ADDITIONAL_FACTS) return false;
  facts.push({
    id: `information-${crypto.randomUUID()}`,
    label: "Detail",
    value: "Add information",
  });
  return true;
}

export function updateTravelEssentialFact(tripDocument, {
  blockId,
  factId,
  field,
  value,
  section = "transport",
}) {
  if (!factId || !["label", "value"].includes(field)) return false;
  const block = findTravelEssentialsBlock(tripDocument, blockId, section);
  const fact = additionalTravelFacts(block?.data ?? {}).find((entry) => entry.id === factId);
  if (!fact) return false;
  fact[field] = value;
  return true;
}

export function removeTravelEssentialFact(tripDocument, blockId, factId, section = "transport") {
  const block = findTravelEssentialsBlock(tripDocument, blockId, section);
  const facts = additionalTravelFacts(block?.data ?? {});
  const index = facts.findIndex((entry) => entry.id === factId);
  if (index < 0) return false;
  facts.splice(index, 1);
  const overrides = tripDocument.meta.inlineIcons;
  if (overrides) {
    delete overrides[informationFactIconKey(blockId, factId)];
    if (Object.keys(overrides).length === 0) delete tripDocument.meta.inlineIcons;
  }
  return true;
}

export function updateTravelEssentialField(tripDocument, blockId, field, value, section = "transport") {
  const block = findTravelEssentialsBlock(tripDocument, blockId, section);
  if (!block || !Object.hasOwn(block.data, field)) return false;
  block.data[field] = value;
  return true;
}

function blockContext(target) {
  const blockElement = target.closest(".editor-block[data-block-id]");
  const section = blockElement?.closest("[data-section-root]")?.dataset.sectionRoot;
  return blockElement && section ? { blockId: blockElement.dataset.blockId, section } : null;
}

function findTravelEssentialsBlock(tripDocument, blockId, section) {
  const block = tripDocument.sections[section]?.find((entry) => entry.id === blockId);
  return block?.type === "travel-essentials" ? block : null;
}