import { ICON_PICKER_CATEGORIES, iconPickerLabel, renderIcon } from "../ui/icon-registry.js";
import { updateStayAmenityIcon } from "./inline-stay-editor.js";
import { translateText } from "../app/i18n.js";

const TEXT_EXCLUSIONS = [
  "script", "style", "template", "svg", "input", "textarea", "select", "option",
  "[hidden]", "[aria-hidden=true]", ".sr-only",
  ".bilingual-layout-probe", ".hero-date-editor", ".hero-cover-button",
  ".workspace-actions", ".mobile-actions-toggle", ".scroll-top", ".inline-icon-dialog",
  "[data-inline-date-action]", "[data-inline-time-field]", "[data-inline-ignore]",
].join(",");

const ICON_EXCLUSIONS = [
  ".workspace-actions", ".mobile-actions-toggle", ".scroll-top", ".hero-cover-button",
  ".inline-icon-dialog", ".bilingual-layout-probe", ".entry-links", ".transport-attachment-button",
  "[data-inline-date-action]", "[data-inline-ignore]",
].join(",");

export function createInlineEditor({ store, language, showToast, root = document }) {
  const picker = createIconPicker({ language, onSelect: selectIcon });
  let activeIcon = null;

  root.addEventListener("input", handleTextInput, true);
  root.addEventListener("keydown", handleInlineKeydown, true);
  root.addEventListener("click", handleInlineClick, true);
  root.addEventListener("paste", handlePlainTextPaste, true);

  return {
    apply() {
      const editing = store.getState().editing;
      const tripDocument = store.getDocument();
      if (!tripDocument) return;
      applyTextOverrides(tripDocument.meta, editing, language.locale);
      applyIconOverrides(tripDocument.meta, editing);
      if (!editing) {
        activeIcon = null;
        picker.close();
      }
    },
    close: () => picker.close(),
  };

  function handleTextInput(event) {
    if (!store.getState().editing) return;
    const target = event.target.closest?.("[data-inline-text-key]");
    if (!target) return;
    const value = target.textContent.replace(/\u00a0/g, " ").trim();
    store.mutate((tripDocument) => {
      tripDocument.meta.inlineText ??= {};
      for (const [key, translatedValue] of buildBilingualInlineTextUpdates(target.dataset.inlineTextKey, value)) {
        tripDocument.meta.inlineText[key] = translatedValue;
      }
    });
    synchronizeTextContext(target, value);
  }

  function synchronizeTextContext(target, value) {

    if (target.closest?.("#destination") && "title" in root) root.title = value || "Travel Plan";
    const section = sectionFromTitleLabel(target);
    if (section) updateNavigationLabel(section, value);
  }

  function handleInlineKeydown(event) {
    if (!store.getState().editing) return;
    const textTarget = event.target.closest?.("[data-inline-text-key]");
    if (textTarget && event.key === "Enter") {
      event.preventDefault();
      textTarget.blur();
      return;
    }
    const iconTarget = event.target.closest?.("[data-inline-icon-key]");
    if (iconTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      event.stopPropagation();
      openPicker(iconTarget);
    }
  }

  function handleInlineClick(event) {
    if (!store.getState().editing) return;
    const iconTarget = event.target.closest?.("[data-inline-icon-key]")
      ?? event.target.closest?.("[data-amenity-item-icon]")?.querySelector("[data-inline-icon-key]");
    if (iconTarget) {
      event.preventDefault();
      event.stopPropagation();
      openPicker(iconTarget);
      return;
    }
    if (event.target.closest?.("[data-inline-text-key]")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handlePlainTextPaste(event) {
    if (!store.getState().editing || !event.target.closest?.("[data-inline-text-key]")) return;
    event.preventDefault();
    const value = event.clipboardData?.getData("text/plain") ?? "";
    root.execCommand?.("insertText", false, value);
  }

  function openPicker(iconTarget) {
    activeIcon = iconTarget;
    picker.open(iconTarget.dataset.inlineIconName ?? "");
  }

  function selectIcon(iconKey) {
    if (!activeIcon || !store.getState().editing) return;
    const overrideKey = activeIcon.dataset.inlineIconKey;
    const amenityContext = amenityIconContext(activeIcon);
    store.mutate((tripDocument) => {
      if (amenityContext) {
        updateStayAmenityIcon(tripDocument, { ...amenityContext, iconKey });
        return;
      }
      tripDocument.meta.inlineIcons ??= {};
      tripDocument.meta.inlineIcons[overrideKey] = iconKey;
    });
    activeIcon = replaceIcon(activeIcon, iconKey, overrideKey);
    const section = sectionFromTitleIconKey(overrideKey);
    if (section) mirrorNavigationIcon(section, activeIcon);
    showToast("Icon updated — save when you are ready");
  }

  function applyTextOverrides(meta, editing, locale) {
    lockStaticText();
    const overrides = meta.inlineText ?? {};
    for (const scope of collectTextScopes()) {
      const nodes = collectEditableTextNodes(scope.element);
      nodes.forEach((node, index) => {
        if (node.parentElement.closest("[data-inline-static]")) return;
        const shared = scope.shared || node.parentElement.closest("[data-no-translate]");
        const key = `${shared ? "shared" : locale}:${scope.key}:text:${index}`;
        const override = overrides[key];
        if (override !== undefined) node.nodeValue = preserveEdgeWhitespace(node.nodeValue, override);
        const target = editableTextTarget(node);
        target.dataset.inlineTextKey = key;
        target.contentEditable = String(editing);
        target.spellcheck = editing;
        if (editing) {
          target.setAttribute("role", "textbox");
          target.setAttribute("aria-label", language.translate("Edit text"));
        } else {
          target.removeAttribute("role");
          target.removeAttribute("aria-label");
        }
      });
    }

  }

  function lockStaticText() {
    const selector = "[data-inline-static],[data-inline-static] [data-inline-text-key]";
    for (const target of root.querySelectorAll(selector)) {
      target.contentEditable = "false";
      target.removeAttribute("role");
      target.removeAttribute("aria-label");
      target.removeAttribute("spellcheck");
      delete target.dataset.inlineTextKey;
    }
  }

  function applyIconOverrides(meta, editing) {
    const overrides = meta.inlineIcons ?? {};
    for (const candidate of collectIconCandidates()) {
      const { element, key, name } = candidate;
      const isAmenityItemIcon = Boolean(element.closest("[data-amenity-item-icon]"));
      const override = isAmenityItemIcon ? undefined : overrides[key] ?? legacyNavigationIconOverride(overrides, key);
      element.dataset.inlineIconKey = key;
      element.dataset.inlineIconName = override ?? name;
      element.tabIndex = editing ? 0 : -1;
      if (editing) {
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", language.translate("Change icon"));
      } else {
        element.removeAttribute("role");
        element.setAttribute("aria-hidden", "true");
      }
      if (override) replaceIcon(element, override, key);
    }
  }

  function updateNavigationLabel(section, value) {
    const label = value.trim() || "Travel section";
    const button = root.querySelector(`.main-nav [data-view="${section}"]`);
    button?.setAttribute("aria-label", label);
    if (button) button.title = label;
    button?.querySelector(".sr-only")?.replaceChildren(label);
  }

  function mirrorNavigationIcon(section, sourceIcon) {
    const target = root.querySelector(`.main-nav [data-view="${section}"] svg`);
    if (!target || !sourceIcon) return;
    const icon = sourceIcon.cloneNode(true);
    for (const attribute of ["data-inline-icon-key", "data-inline-icon-name", "tabindex", "role", "aria-label"]) {
      icon.removeAttribute(attribute);
    }
    icon.setAttribute("aria-hidden", "true");
    target.replaceWith(icon);
  }
  function collectTextScopes() {
    const scopes = [];
    const add = (key, selector, shared = false) => {
      const element = typeof selector === "string" ? root.querySelector(selector) : selector;
      if (element) scopes.push({ key, element, shared });
    };

    add("hero", ".hero");
    add("section-title:transport", "#transportTitleLabel");
    add("section-title:stay", "#stayTitleLabel");
    add("section-title:agenda", "#agendaTitleLabel");
    for (const block of root.querySelectorAll(".editor-block[data-block-id]")) {
      const section = block.closest("[data-section-root]")?.dataset.sectionRoot ?? "content";
      add(`block:${section}:${block.dataset.blockId}`, block);
    }
    return scopes;
  }

  function collectEditableTextNodes(scope) {
    const nodes = [];
    const walker = root.createTreeWalker(scope, globalThis.NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      const value = node.nodeValue;
      if (isEditableTextNode(parent, value)) nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  }

  function editableTextTarget(node) {
    const parent = node.parentElement;
    if (parent.childNodes.length === 1 && parent.firstChild === node) return parent;
    const wrapper = root.createElement("span");
    wrapper.className = "inline-text-segment";
    node.replaceWith(wrapper);
    wrapper.append(node);
    return wrapper;
  }

  function collectIconCandidates() {
    const candidates = [];
    addScopedIcons(candidates, root.querySelector(".hero"), "hero");
    for (const section of ["transport", "stay", "agenda", "places"]) {
      addScopedIcons(candidates, root.querySelector(`#${section}Title .section-pill-icon`), `section-title:${section}`);
    }
    for (const block of root.querySelectorAll(".editor-block[data-block-id]")) {
      const section = block.closest("[data-section-root]")?.dataset.sectionRoot ?? "content";
      addScopedIcons(candidates, block, `block:${section}:${block.dataset.blockId}`);
    }
    return candidates;
  }

  function addScopedIcons(candidates, scope, scopeKey) {
    if (!scope) return;
    const availableIcons = [...scope.querySelectorAll("svg")].filter((svg) => !svg.closest(ICON_EXCLUSIONS));
    const amenityIcons = availableIcons.filter((svg) => svg.closest("[data-amenity-item-icon]"));
    const icons = availableIcons.filter((svg) => !svg.closest("[data-amenity-item-icon]"));
    icons.forEach((element, index) => candidates.push({
      element,
      key: element.dataset.inlineIconKey || `${scopeKey}:icon:${index}`,
      name: iconName(element),
    }));
    amenityIcons.forEach((element) => {
      const target = element.closest("[data-amenity-item-icon]");
      candidates.push({
        element,
        key: `${scopeKey}:amenity-item:${target.dataset.amenityItemId}`,
        name: iconName(element),
      });
    });
  }
}

function sectionFromTitleLabel(target) {
  const match = /^(transport|stay|agenda|places)TitleLabel$/u.exec(target.id ?? "");
  return match?.[1] ?? "";
}

function sectionFromTitleIconKey(key) {
  return /^section-title:(transport|stay|agenda|places):icon:0$/u.exec(key)?.[1] ?? "";
}

function legacyNavigationIconOverride(overrides, key) {
  const section = sectionFromTitleIconKey(key);
  return section ? overrides[`nav:${section}`] : undefined;
}

function amenityIconContext(icon) {
  const target = icon.closest("[data-amenity-item-icon]");
  const block = target?.closest(".editor-block[data-block-id]");
  const section = block?.closest("[data-section-root]")?.dataset.sectionRoot;
  if (!target || !block || !section) return null;
  return {
    section,
    blockId: block.dataset.blockId,
    groupId: target.dataset.amenityGroupId,
    itemId: target.dataset.amenityItemId,
  };
}

export function buildBilingualInlineTextUpdates(key, value) {
  const match = /^(en-GB|pt-BR):(.*)$/.exec(key);
  if (!match) return [[key, value]];
  const [, sourceLocale, scope] = match;
  const targetLocale = sourceLocale === "en-GB" ? "pt-BR" : "en-GB";
  return [
    [key, value],
    [`${targetLocale}:${scope}`, translateText(value, targetLocale)],
  ];
}

function isEditableTextNode(parent, value) {
  if (!parent || !value.trim() || parent.closest(TEXT_EXCLUSIONS)) return false;
  const interactiveParent = parent.closest("button,a");
  const allowedInteractiveText = parent.matches(".meal-route-value");
  return !interactiveParent || Boolean(allowedInteractiveText);
}

function preserveEdgeWhitespace(source, value) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${value}${trailing}`;
}

function iconName(svg) {
  if (svg.dataset.inlineIconName) return svg.dataset.inlineIconName;
  if (svg.dataset.icon) return svg.dataset.icon;
  const className = svg.getAttribute("class") ?? "";
  const matchingClass = className.split(/\s+/).find((name) => name.startsWith("nav-") && name.endsWith("-icon"));
  return matchingClass?.replace(/^nav-/, "").replace(/-icon$/, "") ?? "";
}

function replaceIcon(svg, iconKey, overrideKey) {
  const markup = renderIcon(iconKey);
  if (!markup) return svg;
  const template = document.createElement("template");
  template.innerHTML = markup;
  const replacement = template.content.firstElementChild;
  for (const attribute of ["class", "role", "aria-label", "aria-hidden"]) {
    if (svg.hasAttribute(attribute)) replacement.setAttribute(attribute, svg.getAttribute(attribute));
  }
  replacement.dataset.inlineIconKey = overrideKey;
  replacement.dataset.inlineIconName = iconKey;
  replacement.tabIndex = svg.tabIndex;
  svg.replaceWith(replacement);
  return replacement;
}

function createIconPicker({ language, onSelect }) {
  const dialog = document.createElement("dialog");
  dialog.className = "inline-icon-dialog";
  dialog.setAttribute("aria-labelledby", "inlineIconTitle");
  dialog.innerHTML = `<div class="inline-icon-panel" data-no-translate>
    <div class="inline-icon-heading"><div><small>ICON</small><h2 id="inlineIconTitle">Choose an Icon</h2></div><button class="inline-icon-close" type="button" aria-label="Close">×</button></div>
    <label class="inline-icon-search"><span class="sr-only">Search icons</span><input type="search" placeholder="Search icons" autocomplete="off"></label>
    <div class="inline-icon-grid"></div>
  </div>`;
  document.body.append(dialog);
  const grid = dialog.querySelector(".inline-icon-grid");
  const search = dialog.querySelector("input");
  grid.innerHTML = ICON_PICKER_CATEGORIES.map((category) => renderIconCategory(category, language)).join("");
  dialog.querySelector(".inline-icon-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
    const choice = event.target.closest("[data-icon-choice]");
    if (!choice) return;
    onSelect(choice.dataset.iconChoice);
    dialog.close();
  });
  search.addEventListener("input", () => filterIconChoices(grid, search.value));

  return {
    open(selected) {
      dialog.querySelector("h2").textContent = language.translate("Choose an Icon");
      search.placeholder = language.translate("Search icons");
      updateIconCategoryLabels(grid, language);
      const selectedMarkup = renderIcon(selected);
      grid.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-selected", renderIcon(button.dataset.iconChoice) === selectedMarkup);
      });
      search.value = "";
      filterIconChoices(grid, "");
      dialog.showModal();
      search.focus();
    },
    close() {
      if (dialog.open) dialog.close();
    },
  };
}

function renderIconCategory(category, language) {
  const categoryLabel = language.translate(category.label);
  const buttons = category.keys.map((key) => {
    const label = iconPickerLabel(key);
    return `<button type="button" data-icon-choice="${key}" data-icon-search="${key} ${label.toLowerCase()}" aria-label="${label}" title="${label}">${renderIcon(key)}<span>${label}</span></button>`;
  }).join("");
  return `<section class="inline-icon-category" data-icon-category="${category.id}" data-icon-category-search="${category.id}"><h3>${categoryLabel}</h3><div class="inline-icon-category-grid">${buttons}</div></section>`;
}

function filterIconChoices(grid, value) {
  const query = value.trim().toLowerCase();
  for (const category of grid.querySelectorAll("[data-icon-category]")) {
    const categoryMatches = category.dataset.iconCategorySearch.includes(query);
    for (const button of category.querySelectorAll("button")) {
      button.hidden = Boolean(query) && !categoryMatches && !button.dataset.iconSearch.includes(query);
    }
    category.hidden = ![...category.querySelectorAll("button")].some((button) => !button.hidden);
  }
}

function updateIconCategoryLabels(grid, language) {
  ICON_PICKER_CATEGORIES.forEach((category) => {
    const section = grid.querySelector(`[data-icon-category="${category.id}"]`);
    const translatedLabel = language.translate(category.label);
    if (!section) return;
    section.querySelector("h3").textContent = translatedLabel;
    section.dataset.iconCategorySearch = `${category.id} ${category.label.toLowerCase()} ${translatedLabel.toLowerCase()}`;
  });
}
