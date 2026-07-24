import { createStore } from "./app/store.js";
import { initializePreferences } from "./app/preferences.js";
import { initializeDateTimePreferences } from "./app/date-time-preferences.js";
import { initializeLanguage, translateText } from "./app/i18n.js";
import { initializeScrollTop } from "./app/scroll-top.js";
import { calculateSectionScrollTop, synchronizeSectionNavigation } from "./app/section-navigation.js";
import { createAuthController } from "./auth/auth-dialog.js";
import { createAttachmentController } from "./attachments/attachment-controller.js";
import { renderBlockEditor } from "./editor/block-editor.js";
import { SECTION_ORDER } from "./sections/registry.js";
import { getElements } from "./app/elements.js";
import { createImagePicker } from "./editor/image-picker.js";
import { isHeroVisible, isSectionTitleVisible, setHeroVisible, setSectionTitleVisible } from "./app/section-title-visibility.js";

import { createInlineEditor } from "./editor/inline-editor.js";
import { createInlineImageEditor } from "./editor/inline-image-editor.js";
import { createInlineResourceEditor } from "./editor/inline-resource-editor.js";
import { createInlineDateTimeEditor } from "./editor/inline-date-time-editor.js";
import { createInlineTransportEditor } from "./editor/inline-transport-editor.js";
import { createInlineStructureEditor } from "./editor/inline-structure-editor.js";
import { createInlineAgendaEditor } from "./editor/inline-agenda-editor.js"; import { createInlineStayEditor } from "./editor/inline-stay-editor.js";
import { createInlineTravelEssentialsEditor } from "./editor/inline-travel-essentials-editor.js";
import { mediaUrl } from "./sections/shared.js";
import { markLegacyMigrationComplete, prepareLoadedState } from "./domain/migrations.js";
import { ApiError, createApi } from "./services/api.js";
import {
  formatDisplayDateRange,
  formatDisplayDateRangeForLocale,
  getDateDisplayFormat,
  setDateLocale,
} from "/shared/date-utils.mjs";
import { validateDocument } from "/shared/document-schema.mjs";
import { deriveTripStats, synchronizeTripStats } from "/shared/trip-stats.mjs";

const SECTION_TITLE_DEFAULTS = Object.freeze({
  transportTitle: "Transit",
  stayTitle: "Accommodation",
  agendaTitle: "Agenda",
  placesTitle: "Other",
});

const api = createApi();
const store = createStore();
const elements = getElements();
const language = initializeLanguage({
  buttons: elements.language,
  onChange(locale) {
    setDateLocale(locale);
    if (store.getDocument()) render();
  },
});
setDateLocale(language.locale);
const dateTimePreferences = initializeDateTimePreferences();
const auth = createAuthController(api);
const attachments = createAttachmentController(api, auth, showToast, (value) => language.translate(value));
const imagePicker = createImagePicker(api, auth, showToast, (value) => language.translate(value));
const inlineEditor = createInlineEditor({ store, language, showToast });
const inlineImageEditor = createInlineImageEditor({ store, imagePicker, language, render });
const inlineResourceEditor = createInlineResourceEditor({ store, language, showToast, render });
const inlineDateTimeEditor = createInlineDateTimeEditor({
  store,
  language,
  preferences: dateTimePreferences,
  render,
  showToast,
});
const inlineTransportEditor = createInlineTransportEditor({ store, render });
const inlineStructureEditor = createInlineStructureEditor({
  store,
  attachments,
  language,
  render,
});
const inlineAgendaEditor = createInlineAgendaEditor({ store, render }); const inlineStayEditor = createInlineStayEditor({ store, render });
const inlineTravelEssentialsEditor = createInlineTravelEssentialsEditor({ store, render });

let toastTimer;
let heroStatsFrame;
let placeRouteWidthFrame;
let bilingualLayoutFrame;

initializePreferences(elements.preferences);
initializeScrollTop(elements.scrollTop);
window.addEventListener("resize", scheduleHeroStatsWidth, { passive: true });
window.addEventListener("resize", schedulePlaceRouteWidths, { passive: true });
window.addEventListener("resize", scheduleBilingualLayout, { passive: true });
window.addEventListener("fontscalechange", scheduleHeroStatsWidth);
window.addEventListener("fontscalechange", schedulePlaceRouteWidths);
window.addEventListener("fontscalechange", scheduleBilingualLayout);
document.fonts?.ready.then(() => {
  scheduleHeroStatsWidth();
  schedulePlaceRouteWidths();
  scheduleBilingualLayout();
});
attachments.bind(elements.sectionsRoot, render);
bindEvents();
initializeMobileActionsMenu();
initializeMealRouteToggles();
initializeSectionTracking();
await loadDashboard();

async function loadDashboard() {
  setSectionStatus('<div class="loading-state">Loading your trip…</div>');
  try {
    const state = await api.getDocument();
    const migration = prepareLoadedState(state);
    store.load(migration.document, state.revision, migration.legacyMigrated);
    setInitialSection();
    render();
  } catch (error) {
    setSectionStatus('<div class="empty-state"><strong>Could not load Travel Plan</strong><span></span></div>', error.message);
  }
}

function setSectionStatus(markup, message = "") {
  for (const root of Object.values(elements.sectionRoots)) {
    root.innerHTML = markup;
    if (message) root.querySelector("span").textContent = message;
  }
}
function bindEvents() {
  elements.nav.forEach((button) => {
    button.addEventListener("click", () => switchSection(button.dataset.view));
  });
  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    switchSection("transport", elements.hero.hidden ? navigationTarget("transport") : elements.hero);
  });
  elements.edit.addEventListener("click", () => {
    if (store.getState().editing) saveInlineEditing();
    else startInlineEditing();
  });
  elements.sectionsRoot.addEventListener("click", handleSectionTitleAction);
  elements.sectionsRoot.addEventListener("click", handleHeroAction);
}

function handleSectionTitleAction(event) {
  const button = event.target.closest("[data-section-title-action]");
  if (!button || !store.getState().editing) return;
  const section = button.dataset.section;
  const visible = button.dataset.sectionTitleAction === "restore";
  store.mutate((document) => setSectionTitleVisible(document, section, visible));
  render();
  if (visible) elements.sectionTitleLabels[`${section}Title`]?.focus();
}

function handleHeroAction(event) {
  const button = event.target.closest("[data-hero-action]");
  if (!button || !store.getState().editing) return;
  const visible = button.dataset.heroAction === "restore";
  store.mutate((document) => setHeroVisible(document, visible));
  render();
  if (visible) elements.destination.focus();
}

async function startInlineEditing() {
  elements.edit.disabled = true;
  try {
    await auth.ensureAuthenticated();
    store.beginEdit();
    render();
    elements.destination.focus();
    showToast("Edit text directly or select any icon");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.edit.disabled = false;
  }
}

async function saveInlineEditing() {
  elements.edit.disabled = true;
  try {
    const tripDocument = store.getDocument();
    synchronizeTripStats(tripDocument);
    validateDocument(tripDocument);
    const session = auth.getSession() ?? await auth.ensureAuthenticated();
    const hadLegacyMigration = store.getState().legacyMigration;
    const saved = await api.saveDocument(store.getState().revision, tripDocument, session.csrfToken);
    await imagePicker.commit(saved.document);
    store.commit(saved.document, saved.revision);
    if (hadLegacyMigration) markLegacyMigrationComplete();
    render();
    showToast("Changes saved securely");
  } catch (error) {
    handleSaveError(error);
  } finally {
    elements.edit.disabled = false;
  }
}

function handleSaveError(error) {
  if (error instanceof ApiError && error.code === "revision_conflict") {
    showToast("This trip was changed elsewhere. Reload before saving.");
    return;
  }
  if (error instanceof ApiError && error.status === 401) {
    store.cancelEdit();
    inlineEditor.close();
    inlineDateTimeEditor.close();
    imagePicker.cancel();
    render();
    showToast("Your editing session expired. Start editing again.");
    return;
  }
  showToast(error.message);
}

function initializeMobileActionsMenu() {
  const toggle = elements.mobileActionsToggle;
  const actions = elements.workspaceActions;
  if (!toggle || !actions) return;
  const mobile = window.matchMedia("(max-width: 600px)");

  const setOpen = (open, { restoreFocus = false } = {}) => {
    const nextOpen = mobile.matches && open;
    actions.hidden = mobile.matches && !nextOpen;
    toggle.setAttribute("aria-expanded", String(nextOpen));
    elements.workspace.classList.toggle("is-mobile-menu-open", nextOpen);
    if (restoreFocus) toggle.focus();
  };
  const syncViewport = () => setOpen(false);

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("click", (event) => {
    if (mobile.matches && toggle.getAttribute("aria-expanded") === "true" && !elements.workspace.contains(event.target)) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setOpen(false, { restoreFocus: true });
  });
  mobile.addEventListener("change", syncViewport);
  syncViewport();
}

function initializeMealRouteToggles() {
  elements.sectionsRoot.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-meal-route-toggle]");
    if (!toggle) return;
    const options = [...toggle.querySelectorAll("[data-meal-route-option]")];
    const currentIndex = options.findIndex((option) => option.dataset.routeMode === toggle.dataset.mode);
    const next = options[(currentIndex + 1) % options.length];
    if (!next) return;
    options.forEach((option) => { option.hidden = option !== next; });
    toggle.dataset.mode = next.dataset.routeMode;
    const routeLabel = language.translate(next.dataset.routeLabel);
    const routeValue = next.querySelector(".meal-route-value")?.textContent ?? "";
    const changeLabel = language.translate("Change travel mode");
    toggle.setAttribute("aria-label", `${routeLabel}: ${routeValue}. ${changeLabel}`);
    toggle.title = changeLabel;
  });
}

function switchSection(section, target = navigationTarget(section)) {
  if (!target) return;
  store.setActive(section);
  history.replaceState(null, "", "#" + section);
  elements.nav.forEach((button) => setNavState(button, section));
  attachments.ensureSection(section).catch((error) => showToast(error.message));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = calculateSectionScrollTop({
    pageScroll: window.scrollY,
    targetViewportTop: target.getBoundingClientRect().top,
    stickyViewportBottom: elements.workspace.getBoundingClientRect().bottom,
    gap: 24,
  });
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}
function setInitialSection() {
  const hash = location.hash.slice(1);
  store.setActive(hash === "entertainment" ? "agenda" : ["transport", "stay", "agenda", "places"].includes(hash) ? hash : "transport");
}

function navigationTarget(section) {
  return elements.sectionTitleHeadings[section] ?? elements.sectionTargets[section];
}

function render() {
  const state = store.getState();
  const tripDocument = store.getDocument();
  stageTransitHeadingForRender();
  document.body.classList.remove("is-editing");
  document.body.classList.toggle("is-inline-editing", state.editing);
  renderHeroBanner(tripDocument.meta, state.editing);
  renderMeta(tripDocument, false);
  renderSectionTitlePills(tripDocument.meta, state.editing);
  elements.nav.forEach((button) => setNavState(button, state.activeSection));
  elements.edit.classList.toggle("is-saving", state.editing);
  elements.edit.setAttribute("aria-pressed", String(state.editing));
  elements.edit.setAttribute("aria-label", state.editing ? "Save" : "Edit");
  elements.editLabel.textContent = state.editing ? "Save" : "Edit";
  for (const section of SECTION_ORDER) {
    renderBlockEditor(elements.sectionRoots[section], store, attachments, section, { renderEditing: false });
  }
  placeTransitHeadingAfterEssentials();
  inlineStructureEditor.apply();
  language.localize();
  inlineEditor.apply();
  synchronizeBrowserTitle();
  inlineImageEditor.apply();
  inlineResourceEditor.apply();
  inlineDateTimeEditor.apply();
  inlineTransportEditor.apply();
  inlineAgendaEditor.apply(); inlineStayEditor.apply();
  inlineTravelEssentialsEditor.apply();
  synchronizeSectionNavigation(tripDocument.meta, elements, SECTION_TITLE_DEFAULTS);
  scheduleHeroStatsWidth();
  schedulePlaceRouteWidths();
  scheduleBilingualLayout();
  window.dispatchEvent(new CustomEvent("dashboardrender"));
}

function stageTransitHeadingForRender() {
  const heading = elements.sectionTitleHeadings.transport;
  const root = elements.sectionRoots.transport;
  const pageSection = root?.closest("[data-page-section]");
  if (!heading || !root || !pageSection || !root.contains(heading)) return;
  pageSection.insertBefore(heading, root);
}

function placeTransitHeadingAfterEssentials() {
  const heading = elements.sectionTitleHeadings.transport;
  const essentials = elements.sectionRoots.transport?.querySelector(".block-type-travel-essentials");
  if (!heading || !essentials) return;
  essentials.insertAdjacentElement("afterend", heading);
}

function synchronizeBrowserTitle() {
  document.title = elements.destination.textContent.trim() || "Travel Plan";
}

function renderMeta(tripDocument, editing) {
  const { meta } = tripDocument;
  const fields = {
    destination: elements.destination,
    region: elements.region,
  };
  for (const [field, element] of Object.entries(fields)) {
    element.textContent = meta[field];
    element.contentEditable = String(editing);
    element.dataset.metaField = field;
  }
  const itineraryLabel = language.translate("Itinerary");
  elements.brandName.textContent = itineraryLabel;
  elements.brandName.contentEditable = "false";
  elements.brandName.dataset.inlineStatic = "";
  delete elements.brandName.dataset.metaField;
  for (const [field, fallback] of Object.entries(SECTION_TITLE_DEFAULTS)) {
    const element = elements.sectionTitleLabels[field];
    element.textContent = meta[field] ?? fallback;
    element.contentEditable = String(editing);
    element.dataset.metaField = field;
  }
  const stats = displayTripStats(tripDocument);
  elements.tripDays.textContent = formatHeroCount(stats.days, "day", "days");
  elements.tripLegs.textContent = formatHeroCount(stats.legs, "leg", "legs");
  for (const element of [elements.tripDays, elements.tripLegs]) {
    element.contentEditable = "false";
    delete element.dataset.metaField;
  }
  elements.brand.setAttribute("aria-label", itineraryLabel);
  elements.travelDates.textContent = formatDisplayDateRange(meta.startDate, meta.endDate);
  elements.travelDates.hidden = editing;
  elements.travelDateEditor.hidden = !editing;
  elements.tripStartDate.value = meta.startDate;
  elements.tripEndDate.value = meta.endDate;
  applyHeroCover(meta.heroCover);
  elements.heroCoverButton.hidden = !editing;
  const heroImageLabel = meta.heroCover ? "Change image" : "Add image";
  elements.heroCoverButtonLabel.textContent = heroImageLabel;
  elements.heroCoverButton.setAttribute("aria-label", heroImageLabel);
  elements.heroCoverButton.title = heroImageLabel;
}

function renderHeroBanner(meta, editing) {
  const visible = isHeroVisible(meta);
  elements.hero.hidden = !visible;
  elements.heroRemoveButton.hidden = !editing || !visible;
  elements.heroRestoreButton.hidden = !editing || visible;
}

function renderSectionTitlePills(meta, editing) {
  for (const section of SECTION_ORDER) {
    const visible = isSectionTitleVisible(meta, section);
    const heading = elements.sectionTitleHeadings[section];
    const pill = elements.sectionTitles[section];
    const pageSection = heading.closest("[data-page-section]");
    heading.hidden = !editing && !visible;
    heading.classList.toggle("is-title-hidden", !visible);
    pill.hidden = !visible;
    heading.querySelector('[data-section-title-action="remove"]').hidden = !editing || !visible;
    heading.querySelector('[data-section-title-action="restore"]').hidden = !editing || visible;
    if (visible) {
      pageSection.removeAttribute("aria-label");
      pageSection.setAttribute("aria-labelledby", pill.id);
    } else {
      pageSection.removeAttribute("aria-labelledby");
      pageSection.setAttribute("aria-label", meta[`${section}Title`] ?? SECTION_TITLE_DEFAULTS[`${section}Title`]);
    }
  }
}

function displayTripStats(tripDocument) {
  if (tripDocument.meta.placeholderMode === true) return { days: 0, legs: 0 };
  return deriveTripStats(tripDocument);
}

function applyHeroCover(cover) {
  const url = mediaUrl(cover);
  const position = ["center", "top", "bottom", "left", "right"].includes(cover?.position)
    ? cover.position
    : "center";
  elements.hero.classList.toggle("has-hero-image", Boolean(url));
  if (!url) {
    elements.hero.style.removeProperty("--hero-image");
    elements.hero.style.removeProperty("--hero-image-position");
    return;
  }
  elements.hero.style.setProperty("--hero-image", `url(${JSON.stringify(url)})`);
  elements.hero.style.setProperty("--hero-image-position", position);
}

function scheduleHeroStatsWidth() { window.cancelAnimationFrame(heroStatsFrame); heroStatsFrame = window.requestAnimationFrame(() => { heroStatsFrame = 0; const tripDocument = store.getDocument(); if (tripDocument) synchronizeHeroStatsWidth(tripDocument); }); }

function synchronizeHeroStatsWidth(tripDocument) {
  const { meta } = tripDocument;
  const stats = displayTripStats(tripDocument);
  const cards = [...elements.heroStats.querySelectorAll(".stat")];
  const variants = ["en-GB", "pt-BR"].flatMap((locale) => [
    [translateText("Date", locale), formatDisplayDateRangeForLocale(meta.startDate, meta.endDate, locale, getDateDisplayFormat())],
    [translateText("Duration", locale), translateText(formatHeroCount(stats.days, "day", "days"), locale)],
    [translateText("Transport", locale), translateText(formatHeroCount(stats.legs, "leg", "legs"), locale)],
  ]);
  let widest = 0;

  for (const [index, [label, value]] of variants.entries()) {
    const source = cards[index % cards.length];
    const probe = source.cloneNode(true);
    probe.classList.add("hero-stat-probe");
    probe.removeAttribute("style");
    probe.querySelector(".hero-date-editor")?.remove();
    probe.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    const [labelElement, valueElement] = [probe.querySelector("small"), probe.querySelector("strong")];
    labelElement.textContent = label;
    valueElement.hidden = false;
    valueElement.textContent = value;
    elements.hero.append(probe);
    widest = Math.max(widest, probe.getBoundingClientRect().width);
    probe.remove();
  }

  elements.heroStats.style.setProperty("--hero-stat-inline-size", `${Math.ceil(widest)}px`);
}

function formatHeroCount(value, singular, plural) {
  const displayValue = value ?? "—";
  return `${displayValue} ${value === 1 ? singular : plural}`;
}

function schedulePlaceRouteWidths() {
  window.cancelAnimationFrame(placeRouteWidthFrame);
  placeRouteWidthFrame = window.requestAnimationFrame(() => {
    placeRouteWidthFrame = 0;
    synchronizePlaceRouteWidths();
  });
}

function synchronizePlaceRouteWidths() {
  elements.sectionsRoot.style.removeProperty("--place-route-column-size");
  elements.sectionsRoot.style.removeProperty("--meal-route-toggle-size");
  const routes = [...elements.sectionsRoot.querySelectorAll(".place-route-mode")];
  if (routes.length) {
    const widest = Math.max(...routes.map((route) => route.getBoundingClientRect().width));
    elements.sectionsRoot.style.setProperty("--place-route-column-size", `${Math.ceil(widest)}px`);
  }

  const routeOptions = [...elements.sectionsRoot.querySelectorAll(".meal-route-option")];
  if (!routeOptions.length) return;
  const probe = document.createElement("span");
  probe.className = "meal-route-toggle";
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "fixed",
    top: "0",
    left: "-10000px",
    width: "max-content",
    minWidth: "96px",
    maxWidth: "none",
    visibility: "hidden",
    pointerEvents: "none",
  });
  document.body.append(probe);
  let widestToggle = 96;
  for (const option of routeOptions) {
    const clone = option.cloneNode(true);
    clone.hidden = false;
    probe.replaceChildren(clone);
    widestToggle = Math.max(widestToggle, probe.getBoundingClientRect().width);
  }
  probe.remove();
  elements.sectionsRoot.style.setProperty("--meal-route-toggle-size", `${Math.ceil(widestToggle)}px`);
}

function scheduleBilingualLayout() {
  window.cancelAnimationFrame(bilingualLayoutFrame);
  bilingualLayoutFrame = window.requestAnimationFrame(() => {
    bilingualLayoutFrame = 0;
    synchronizeBilingualLayout();
  });
}

function synchronizeBilingualLayout() {
  const targets = [
    elements.hero,
    ...elements.sectionsRoot.querySelectorAll(".editor-block,.add-block"),
  ];
  for (const target of targets) target.style.removeProperty("min-block-size");
  for (const target of targets) {
    const width = target.getBoundingClientRect().width;
    if (width <= 0) continue;
    const height = Math.max(...["en-GB", "pt-BR"].map((locale) => measureLocalizedHeight(target, width, locale)));
    target.style.minBlockSize = `${Math.ceil(height)}px`;
  }
}

function measureLocalizedHeight(source, width, locale) {
  const probe = source.cloneNode(true);
  probe.classList.add("bilingual-layout-probe");
  probe.style.width = `${width}px`;
  probe.style.minBlockSize = "0";
  probe.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  localizeProbe(probe, locale);
  document.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

function localizeProbe(probe, locale) {
  const walker = document.createTreeWalker(probe, globalThis.NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (!node.parentElement?.closest("[data-no-translate]")) node.nodeValue = translateText(node.nodeValue, locale);
    node = walker.nextNode();
  }
  const editableValues = [
    '[data-block-field]:not([type="date"]):not([type="time"]):not([type="url"])',
    "[data-amenity-group-label]",
    '[data-place-field="comment"]',
    '[data-food-field="name"]',
    '[data-food-field="comment"]',
    '[data-space-field="label"]',
    '[data-bed-field="label"]',
    '[data-generic-field="label"]',
    '[data-generic-field="value"]',
    '[data-list-property="label"]',
    '[data-list-property="value"]',
  ].join(",");
  for (const control of probe.querySelectorAll(editableValues)) {
    control.value = translateText(control.value, locale);
  }
}

function setNavState(button, activeSection) {
  const active = button.dataset.view === activeSection;
  button.classList.toggle("is-active", active);
  if (active) button.setAttribute("aria-current", "true");
  else button.removeAttribute("aria-current");
}

function initializeSectionTracking() {
  let frame = 0;
  window.addEventListener("scroll", () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (!store.getDocument()) return;
      const marker = elements.workspace.getBoundingClientRect().bottom + 28;
      let active = "transport";
      for (const section of SECTION_ORDER.slice(1)) {
        if (elements.sectionTargets[section].getBoundingClientRect().top <= marker) active = section;
      }
      if (active === store.getState().activeSection) return;
      store.setActive(active);
      elements.nav.forEach((button) => setNavState(button, active));
      history.replaceState(null, "", "#" + active);
    });
  }, { passive: true });
}
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = language.translate(message);
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}
