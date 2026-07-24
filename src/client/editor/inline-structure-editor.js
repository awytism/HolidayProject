import { addBlock, deleteBlock, setBlockSpan } from "./commands.js";
import { createCardBlock, getCardTypes, SECTION_ORDER } from "../sections/registry.js";
import { renderActionIcon } from "../ui/icon-registry.js";

export function inlineCardTypes(section) {
  return SECTION_ORDER.includes(section) ? getCardTypes() : [];
}

export function createInlineStructureEditor({ store, attachments, language, render, root = document }) {
  root.addEventListener("click", handleClick, true);
  root.addEventListener("change", handleSizeChange, true);

  return { apply };

  function apply() {
    root.querySelectorAll("[data-inline-card-control]").forEach((control) => control.remove());
    if (!store.getState().editing) return;

    for (const section of SECTION_ORDER) {
      const sectionRoot = root.querySelector(`[data-section-root="${section}"]`);
      if (!sectionRoot) continue;
      for (const block of sectionRoot.querySelectorAll(".editor-block[data-block-id]")) {
        const source = store.getDocument().sections[section].find((entry) => entry.id === block.dataset.blockId);
        block.append(createCardControls(source?.layout?.span));
      }
      sectionRoot.append(createAddControl(section));
    }
  }

  function createCardControls(value) {
    const controls = root.createElement("div");
    controls.className = "inline-card-controls";
    controls.dataset.inlineCardControl = "";
    controls.dataset.inlineIgnore = "";
    controls.append(createSizeControl(value), createRemoveButton());
    return controls;
  }

  function createSizeControl(value) {
    const label = root.createElement("label");
    label.className = "inline-card-size";
    label.dataset.inlineCardControl = "";
    label.dataset.inlineIgnore = "";

    const copy = root.createElement("span");
    copy.textContent = language.translate("Size");
    const select = root.createElement("select");
    select.dataset.inlineCardSpan = "";
    select.setAttribute("aria-label", language.translate("Card size"));
    const span = [4, 6, 12].includes(value) ? value : 12;
    for (const [optionValue, optionLabel] of [[4, "1/3"], [6, "1/2"], [12, "Full"]]) {
      const option = root.createElement("option");
      option.value = String(optionValue);
      option.textContent = language.translate(optionLabel);
      option.selected = optionValue === span;
      select.append(option);
    }
    label.append(copy, select);
    return label;
  }
  function createRemoveButton() {
    const label = language.translate("Remove card");
    const button = root.createElement("button");
    button.type = "button";
    button.className = "inline-card-remove";
    button.dataset.inlineCardAction = "remove";
    button.dataset.inlineCardControl = "";
    button.dataset.inlineIgnore = "";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = `${renderActionIcon("trash")}<span class="sr-only">${label}</span>`;
    return button;
  }

  function createAddControl(section) {
    const label = language.translate("Add card");
    const details = root.createElement("details");
    details.className = "inline-card-add";
    details.dataset.inlineCardControl = "";
    details.dataset.inlineIgnore = "";

    const summary = root.createElement("summary");
    summary.innerHTML = `${renderActionIcon("plus")}<span>${label}</span>`;
    summary.setAttribute("aria-label", label);
    details.append(summary);

    const options = root.createElement("div");
    options.className = "inline-card-add-options";
    for (const item of inlineCardTypes(section)) {
      const button = root.createElement("button");
      button.type = "button";
      button.dataset.inlineCardAction = "add";
      button.dataset.section = section;
      button.dataset.cardType = item.type;
      button.textContent = language.translate(item.label);
      options.append(button);
    }
    details.append(options);
    return details;
  }

  function handleClick(event) {
    const button = event.target.closest?.("[data-inline-card-action]");
    if (!button || !store.getState().editing) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.inlineCardAction === "remove") removeCard(button);
    else addCard(button);
  }

  function handleSizeChange(event) {
    const select = event.target.closest?.("[data-inline-card-span]");
    if (!select || !store.getState().editing) return;
    const block = select.closest(".editor-block[data-block-id]");
    const section = block?.closest("[data-section-root]")?.dataset.sectionRoot;
    const span = Number(select.value);
    if (!block || !section || ![4, 6, 12].includes(span)) return;
    store.setActive(section);
    store.mutate((document) => setBlockSpan(document, section, block.dataset.blockId, span));
    render();
  }
  function removeCard(button) {
    const block = button.closest(".editor-block[data-block-id]");
    const section = block?.closest("[data-section-root]")?.dataset.sectionRoot;
    if (!block || !section || !attachments.confirmBlockDeletion(section, block.dataset.blockId)) return;
    store.setActive(section);
    store.mutate((document) => deleteBlock(document, section, block.dataset.blockId));
    render();
  }

  function addCard(button) {
    const section = button.dataset.section;
    const item = inlineCardTypes(section).find(({ type }) => type === button.dataset.cardType);
    if (!item) return;
    store.setActive(section);
    store.mutate((document) => addBlock(document, section, createCardBlock(item.type, section)));
    render();
  }
}
