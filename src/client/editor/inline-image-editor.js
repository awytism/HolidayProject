import {
  setBlockCover,
  setBlockField,
  setFoodCover,
  setListItem,
  setPlaceCover,
} from "./commands.js";
import { renderActionIcon } from "../ui/icon-registry.js";

const IMAGE_TARGET_SELECTOR = "[data-inline-image-field],[data-inline-image-entry]";
const IMAGE_READERS = Object.freeze({
  hero: (tripDocument) => tripDocument.meta.heroCover ?? null,
  field: (tripDocument, descriptor) => {
    const block = findBlock(tripDocument, descriptor);
    if (!block) return null;
    return descriptor.field === "cover" ? block.cover : block.data[descriptor.field];
  },
  place: (tripDocument, descriptor) => findBlock(tripDocument, descriptor)?.data.places
    ?.find((item) => item.id === descriptor.placeId)?.cover ?? null,
  food: (tripDocument, descriptor) => findBlock(tripDocument, descriptor)?.data.meals
    ?.[descriptor.meal]?.find((item) => item.id === descriptor.foodId)?.cover ?? null,
  list: (tripDocument, descriptor) => findBlock(tripDocument, descriptor)?.data.items
    ?.[descriptor.index]?.cover ?? null,
});

export function createInlineImageEditor({ store, imagePicker, language, render, root = document }) {
  root.addEventListener("click", handleClick, true);

  return {
    apply() {
      clearDynamicControls();
      const editing = store.getState().editing;
      const heroButton = root.querySelector("#heroCoverButton");
      if (heroButton) configureHeroButton(heroButton, editing);
      if (!editing) return;
      for (const target of root.querySelectorAll(IMAGE_TARGET_SELECTOR)) addControl(target);
    },
  };

  function clearDynamicControls() {
    root.querySelectorAll("[data-inline-image-control]").forEach((control) => control.remove());
    root.querySelectorAll(".is-inline-image-target").forEach((target) => target.classList.remove("is-inline-image-target"));
  }

  function configureHeroButton(button, editing) {
    const hero = root.querySelector(".hero");
    if (hero && button.parentElement !== hero) hero.append(button);
    button.hidden = !editing;
    button.dataset.inlineImageAction = "hero";
    button.dataset.inlineIgnore = "";
    if (!editing) return;
    const hasImage = Boolean(store.getDocument()?.meta?.heroCover);
    updateButtonCopy(button, hasImage);
  }

  function addControl(target) {
    const surface = imageSurface(target);
    if (!surface) return;
    surface.classList.add("is-inline-image-target");
    const hasImage = Boolean(surface.querySelector("img"));
    const button = root.createElement("button");
    button.type = "button";
    button.className = "inline-image-button";
    button.dataset.inlineImageAction = "target";
    button.dataset.inlineImageControl = "";
    button.dataset.inlineIgnore = "";
    button.innerHTML = `${renderActionIcon("plus")}<span class="sr-only"></span>`;
    updateButtonCopy(button, hasImage);
    surface.append(button);
  }

  function imageSurface(target) {
    if (target.matches(".block-frame")) return target.querySelector(":scope > .block-cover");
    if (target.matches(".provider")) return target.querySelector(":scope > .provider-icon");
    if (target.matches(".route-endpoint")) return target.querySelector(".route-location-media");
    if (target.matches(".place-row,.food-row")) return target.querySelector(".place-media");
    if (target.matches(".distance-landmark")) return target.querySelector(".distance-landmark-media");
    return target;
  }

  function updateButtonCopy(button, hasImage) {
    const label = language.translate(hasImage ? "Change image" : "Add image");
    const copy = button.querySelector("span");
    if (copy) copy.textContent = label;
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  async function handleClick(event) {
    const button = event.target.closest?.("[data-inline-image-action]");
    if (!button || !store.getState().editing) return;
    event.preventDefault();
    event.stopPropagation();
    const descriptor = button.dataset.inlineImageAction === "hero"
      ? { kind: "hero" }
      : describeTarget(button.closest(IMAGE_TARGET_SELECTOR));
    if (!descriptor) return;
    const current = currentImage(descriptor);
    const image = await imagePicker.open(current);
    if (image === undefined || !store.getState().editing) return;
    store.mutate((tripDocument) => updateImage(tripDocument, descriptor, image));
    render();
  }

  function describeTarget(target) {
    const blockElement = target?.closest(".editor-block[data-block-id]");
    const sectionRoot = target?.closest("[data-section-root]");
    if (!target || !blockElement || !sectionRoot) return null;
    const base = {
      section: sectionRoot.dataset.sectionRoot,
      blockId: blockElement.dataset.blockId,
    };
    if (target.dataset.inlineImageField) {
      return { ...base, kind: "field", field: target.dataset.inlineImageField };
    }
    const kind = target.dataset.inlineImageEntry;
    if (kind === "place") return { ...base, kind, placeId: target.dataset.inlineImageId };
    if (kind === "food") {
      return {
        ...base,
        kind,
        foodId: target.dataset.inlineImageId,
        meal: target.dataset.inlineImageMeal,
      };
    }
    if (kind === "list") {
      return { ...base, kind, index: Number(target.dataset.inlineImageIndex) };
    }
    return null;
  }

  function currentImage(descriptor) {
    const tripDocument = store.getDocument();
    return IMAGE_READERS[descriptor.kind]?.(tripDocument, descriptor) ?? null;
  }

  function updateImage(tripDocument, descriptor, image) {
    if (descriptor.kind === "hero") {
      tripDocument.meta.heroCover = image;
      return;
    }
    if (descriptor.kind === "field") {
      if (descriptor.field === "cover") {
        setBlockCover(tripDocument, descriptor.section, descriptor.blockId, image);
      } else {
        setBlockField(tripDocument, descriptor.section, descriptor.blockId, descriptor.field, image);
      }
      return;
    }
    if (descriptor.kind === "place") setPlaceCover(tripDocument, descriptor, image);
    if (descriptor.kind === "food") setFoodCover(tripDocument, descriptor, image);
    if (descriptor.kind === "list") {
      setListItem(tripDocument, { ...descriptor, property: "cover" }, image);
    }
  }
}

function findBlock(tripDocument, descriptor) {
  return tripDocument.sections[descriptor.section]
    ?.find((item) => item.id === descriptor.blockId);
}
