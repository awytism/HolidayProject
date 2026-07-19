import { renderIcon, TRUSTED_ICON_KEYS } from "../ui/icon-registry.js";
import { translateText } from "../app/i18n.js";

const TEXT_EXCLUSIONS = [
  "script", "style", "template", "svg", "input", "textarea", "select", "option",
  "[hidden]", "[aria-hidden=true]", ".sr-only", ".section-pill-measure",
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
    if (target.id === "brandName") {
      root.querySelector(".brand")?.setAttribute("aria-label", value.trim() || "Travel Plan");
    }
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
    const iconTarget = event.target.closest?.("[data-inline-icon-key]");
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
    store.mutate((tripDocument) => {
      tripDocument.meta.inlineIcons ??= {};
      tripDocument.meta.inlineIcons[overrideKey] = iconKey;
    });
    activeIcon = replaceIcon(activeIcon, iconKey, overrideKey);
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
    const brandName = root.querySelector("#brandName")?.textContent.trim();
    if (brandName) root.querySelector(".brand")?.setAttribute("aria-label", brandName);
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
      element.dataset.inlineIconKey = key;
      element.dataset.inlineIconName = overrides[key] ?? name;
      element.tabIndex = editing ? 0 : -1;
      if (editing) {
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", language.translate("Change icon"));
      } else {
        element.removeAttribute("role");
        element.setAttribute("aria-hidden", "true");
      }
      if (overrides[key]) replaceIcon(element, overrides[key], key);
    }
  }

  function collectTextScopes() {
    const scopes = [];
    const add = (key, selector, shared = false) => {
      const element = typeof selector === "string" ? root.querySelector(selector) : selector;
      if (element) scopes.push({ key, element, shared });
    };
    add("brand", "#brandName", true);
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
    for (const button of root.querySelectorAll(".main-nav [data-view]")) {
      const svg = button.querySelector("svg");
      if (svg) candidates.push({ element: svg, key: `nav:${button.dataset.view}`, name: iconName(svg) });
    }
    addScopedIcons(candidates, root.querySelector(".hero"), "hero");
    for (const section of ["transport", "stay", "agenda"]) {
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
    const icons = [...scope.querySelectorAll("svg")].filter((svg) => !svg.closest(ICON_EXCLUSIONS));
    icons.forEach((element, index) => candidates.push({
      element,
      key: `${scopeKey}:icon:${index}`,
      name: iconName(element),
    }));
  }
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
  const allowedInteractiveText = parent.matches(".meal-route-value") || parent.closest("#brandName");
  return !interactiveParent || Boolean(allowedInteractiveText);
}

function preserveEdgeWhitespace(source, value) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${value}${trailing}`;
}

function iconName(svg) {
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
  grid.innerHTML = TRUSTED_ICON_KEYS.map((key) => `<button type="button" data-icon-choice="${key}" aria-label="${labelForIcon(key)}" title="${labelForIcon(key)}">${renderIcon(key)}<span>${labelForIcon(key)}</span></button>`).join("");
  dialog.querySelector(".inline-icon-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
    const choice = event.target.closest("[data-icon-choice]");
    if (!choice) return;
    onSelect(choice.dataset.iconChoice);
    dialog.close();
  });
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    for (const button of grid.children) button.hidden = !button.dataset.iconChoice.includes(query);
  });

  return {
    open(selected) {
      dialog.querySelector("h2").textContent = language.translate("Choose an Icon");
      search.placeholder = language.translate("Search icons");
      grid.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", button.dataset.iconChoice === selected));
      search.value = "";
      for (const button of grid.children) button.hidden = false;
      dialog.showModal();
      search.focus();
    },
    close() {
      if (dialog.open) dialog.close();
    },
  };
}

function labelForIcon(key) {
  return key.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
