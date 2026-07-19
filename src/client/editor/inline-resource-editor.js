import {
  setBlockField,
  setListItem,
  updateFoodOption,
  updatePlace,
} from "./commands.js";
import { renderActionIcon } from "../ui/icon-registry.js";
import { escapeHtml, safeUrl } from "../utils/html.js";

const LINK_SELECTOR = "[data-inline-link-field]";

export function createInlineResourceEditor({ store, language, showToast, render, root = document }) {
  const dialog = root.createElement("dialog");
  dialog.className = "resource-link-dialog media-dialog";
  dialog.setAttribute("aria-labelledby", "resourceLinkTitle");
  root.body.append(dialog);
  let active = null;

  root.addEventListener("click", handleClick, true);
  dialog.addEventListener("submit", handleSubmit);
  dialog.addEventListener("click", handleDialogClick);
  dialog.addEventListener("cancel", handleCancel);

  return {
    apply() {
      if (!store.getState().editing) close();
    },
    close,
  };

  function handleClick(event) {
    const trigger = event.target.closest?.(LINK_SELECTOR);
    if (!trigger || !store.getState().editing) return;
    event.preventDefault();
    event.stopPropagation();
    const descriptor = describeLink(trigger);
    if (!descriptor) return;
    open(descriptor, trigger);
  }

  function open(descriptor, trigger) {
    active = { descriptor, trigger };
    const fieldLabel = descriptor.field === "mapUrl" ? "Google Maps Link" : "Website Link";
    const current = currentLink(store.getDocument(), descriptor);
    dialog.innerHTML = renderLinkDialog(fieldLabel, current, language.translate);
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  }

  function handleDialogClick(event) {
    if (event.target.closest("[data-resource-link-cancel]")) close();
    if (event.target.closest("[data-resource-link-remove]")) saveLink("");
  }

  function handleCancel(event) {
    event.preventDefault();
    close();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const value = String(new FormData(event.target).get("url") ?? "").trim();
    if (value && !safeUrl(value)) {
      const error = dialog.querySelector("[data-resource-link-error]");
      error.textContent = language.translate("Enter a complete HTTP or HTTPS link");
      error.hidden = false;
      return;
    }
    saveLink(value ? safeUrl(value) : "");
  }

  function saveLink(value) {
    if (!active || !store.getState().editing) return;
    const { descriptor } = active;
    store.mutate((tripDocument) => updateLink(tripDocument, descriptor, value));
    close();
    render();
    showToast(language.translate(value ? "Link updated — save when you are ready" : "Link removed — save when you are ready"));
  }

  function close() {
    const trigger = active?.trigger;
    active = null;
    if (dialog.open) dialog.close();
    if (trigger?.isConnected) trigger.focus?.();
  }
}

export function describeInlineLink(target) {
  const blockElement = target?.closest(".editor-block[data-block-id]");
  const sectionRoot = target?.closest("[data-section-root]");
  const field = target?.dataset.inlineLinkField;
  if (!blockElement || !sectionRoot || !["mapUrl", "websiteUrl"].includes(field)) return null;
  const descriptor = {
    kind: "block",
    section: sectionRoot.dataset.sectionRoot,
    blockId: blockElement.dataset.blockId,
    field,
  };
  const entry = target.closest("[data-inline-image-entry]");
  if (!entry) return descriptor;
  return LINK_DESCRIPTOR_BUILDERS[entry.dataset.inlineImageEntry]?.(descriptor, entry) ?? descriptor;
}

function describeLink(target) {
  return describeInlineLink(target);
}

function currentLink(tripDocument, descriptor) {
  const block = findBlock(tripDocument, descriptor);
  if (!block) return "";
  return LINK_READERS[descriptor.kind]?.(block, descriptor) ?? "";
}

function updateLink(tripDocument, descriptor, value) {
  if (descriptor.kind === "place") return updatePlace(tripDocument, { ...descriptor, property: descriptor.field }, value);
  if (descriptor.kind === "food") return updateFoodOption(tripDocument, { ...descriptor, property: descriptor.field }, value);
  if (descriptor.kind === "list") return setListItem(tripDocument, { ...descriptor, property: descriptor.field }, value);
  return setBlockField(tripDocument, descriptor.section, descriptor.blockId, descriptor.field, value);
}

function findBlock(tripDocument, descriptor) {
  return tripDocument.sections[descriptor.section]?.find((block) => block.id === descriptor.blockId);
}

const LINK_DESCRIPTOR_BUILDERS = Object.freeze({
  place: (descriptor, entry) => ({ ...descriptor, kind: "place", placeId: entry.dataset.inlineImageId }),
  food: (descriptor, entry) => ({
    ...descriptor,
    kind: "food",
    foodId: entry.dataset.inlineImageId,
    meal: entry.dataset.inlineImageMeal,
  }),
  list: (descriptor, entry) => ({ ...descriptor, kind: "list", index: Number(entry.dataset.inlineImageIndex) }),
});

const LINK_READERS = Object.freeze({
  block: (block, descriptor) => block.data[descriptor.field]
    || (descriptor.field === "websiteUrl" ? block.data.link : "") || "",
  place: (block, descriptor) => block.data.places
    ?.find((entry) => entry.id === descriptor.placeId)?.[descriptor.field] ?? "",
  food: (block, descriptor) => block.data.meals?.[descriptor.meal]
    ?.find((entry) => entry.id === descriptor.foodId)?.[descriptor.field] ?? "",
  list: (block, descriptor) => block.data.items?.[descriptor.index]?.[descriptor.field] ?? "",
});

function renderLinkDialog(fieldLabel, current, translate) {
  const label = (value) => escapeHtml(translate(value));
  const icon = fieldLabel === "Google Maps Link" ? "map-pin" : "external-link";
  return `<form class="media-form resource-link-form" novalidate>
    <button type="button" class="dialog-close" data-resource-link-cancel aria-label="${label("Close")}">×</button>
    <small>${renderActionIcon(icon)}<span>${label("Link")}</span></small>
    <h2 id="resourceLinkTitle">${label(`Edit ${fieldLabel}`)}</h2>
    <p class="media-error" data-resource-link-error role="alert" hidden></p>
    <label>${label(fieldLabel)}<input type="url" name="url" maxlength="2000" value="${escapeHtml(current)}" placeholder="https://..." autocomplete="url"></label>
    <p class="resource-link-help">${label("Paste a complete web address, including https://")}</p>
    <div class="dialog-actions"><button type="button" data-resource-link-remove>${label("Remove link")}</button><button type="submit">${label("Save link")}</button></div>
  </form>`;
}
