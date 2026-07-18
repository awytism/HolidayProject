import { createStore } from "./app/store.js";
import { initializePreferences } from "./app/preferences.js";
import { initializeScrollTop } from "./app/scroll-top.js";
import { calculateSectionScrollTop } from "./app/section-navigation.js";
import { createAuthController } from "./auth/auth-dialog.js";
import { createAttachmentController } from "./attachments/attachment-controller.js";
import { bindBlockEditor, renderBlockEditor } from "./editor/block-editor.js";
import { createImagePicker } from "./editor/image-picker.js";
import { createTemplateController } from "./editor/template-pool.js";
import { markLegacyMigrationComplete, prepareLoadedState } from "./domain/migrations.js";
import { getSectionConfig } from "./sections/registry.js";
import { createApi, ApiError } from "./services/api.js";
import { formatDateRange, inclusiveDayCount } from "/shared/date-utils.mjs";
import { validateDocument } from "/shared/document-schema.mjs";

const api = createApi();
const store = createStore();
const elements = getElements();
const auth = createAuthController(api, elements.auth);
const attachments = createAttachmentController(api, auth, showToast);
const imagePicker = createImagePicker(api, auth, showToast);
const templates = createTemplateController(api, auth, store, render, showToast);
let toastTimer;

initializePreferences(elements.preferences);
initializeScrollTop(elements.scrollTop);
bindBlockEditor(elements.sectionRoot, { store, render, imagePicker, templates, attachments });
attachments.bind(elements.sectionRoot, render);
bindEvents();
await loadDashboard();

async function loadDashboard() {
  elements.sectionRoot.innerHTML = '<div class="loading-state">Loading your trip…</div>';
  try {
    const state = await api.getDocument();
    const migration = prepareLoadedState(state);
    store.load(migration.document, state.revision, migration.legacyMigrated);
    setInitialSection();
    render();
    if (migration.legacyMigrated) showToast("Local edits loaded. Unlock and save to migrate them.");
  } catch (error) {
    elements.sectionRoot.innerHTML = '<div class="empty-state"><strong>Unable to load L&amp;A Holidays</strong><span></span></div>';
    elements.sectionRoot.querySelector("span").textContent = error.message;
  }
}

function bindEvents() {
  elements.nav.forEach((button) => button.addEventListener("click", () => switchSection(button.dataset.view)));
  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    switchSection("transport");
  });
  elements.edit.addEventListener("click", () => store.getState().editing ? saveEditing() : unlockEditing());
  elements.cancel.addEventListener("click", cancelEditing);
  elements.logout.addEventListener("click", logout);
  [elements.destination, elements.region, elements.tripDays, elements.tripLegs].forEach((element) => {
    element.addEventListener("input", () => updateMeta(element));
  });
  [elements.tripStartDate, elements.tripEndDate].forEach((element) => {
    element.addEventListener("input", () => updateMetaDate(element));
  });
}

async function unlockEditing() {
  try {
    const session = await auth.ensureAuthenticated();
    if (!session) return;
    await attachments.unlock(session, store.getState().activeSection);
    store.beginEdit();
    elements.logout.hidden = false;
    render();
    elements.sectionRoot.querySelector("button,input,textarea")?.focus();
  } catch (error) {
    showToast(error.message);
  }
}

async function saveEditing() {
  try {
    const document = store.getDocument();
    validateDocument(document);
    const session = auth.getSession();
    const hadLegacyMigration = store.getState().legacyMigration;
    const saved = await api.saveDocument(store.getState().revision, document, session.csrfToken);
    await imagePicker.commit(saved.document);
    store.commit(saved.document, saved.revision);
    await attachments.refresh(store.getState().activeSection);
    if (hadLegacyMigration) markLegacyMigrationComplete();
    render();
    showToast("Changes saved securely");
  } catch (error) {
    handleSaveError(error);
  }
}

function handleSaveError(error) {
  if (error instanceof ApiError && error.code === "revision_conflict") {
    showToast("This trip changed elsewhere. Reload before saving.");
    return;
  }
  if (error instanceof ApiError && error.status === 401) {
    cancelEditing();
    showToast("Your editing session expired. Unlock again.");
    return;
  }
  showToast(error.message);
}

function cancelEditing() {
  imagePicker.cancel();
  store.cancelEdit();
  render();
  showToast("Changes discarded");
}

async function logout() {
  try {
    if (store.getState().editing) {
      await imagePicker.cancel();
      store.cancelEdit();
    }
    await auth.logout();
    attachments.lock();
    elements.logout.hidden = true;
    render();
    showToast("Editing locked");
  } catch (error) {
    showToast(error.message);
  }
}

function switchSection(section) {
  store.setActive(section);
  history.replaceState(null, "", `#${section}`);
  render();
  attachments.ensureSection(section).catch((error) => showToast(error.message));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = section === "transport" ? elements.hero : elements.contentSection;
  const top = calculateSectionScrollTop({
    pageScroll: window.scrollY,
    targetViewportTop: target.getBoundingClientRect().top,
    stickyViewportBottom: elements.workspace.getBoundingClientRect().bottom,
  });
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}

function setInitialSection() {
  const hash = location.hash.slice(1);
  store.setActive(hash === "entertainment" ? "agenda" : ["transport", "stay", "agenda"].includes(hash) ? hash : "transport");
}

function render() {
  const state = store.getState();
  const tripDocument = store.getDocument();
  const config = getSectionConfig(state.activeSection);
  document.body.classList.toggle("is-editing", state.editing);
  elements.hero.hidden = state.activeSection !== "transport";
  renderMeta(tripDocument.meta, state.editing);
  elements.sectionEyebrow.textContent = config.eyebrow;
  elements.sectionTitle.textContent = config.title;
  elements.nav.forEach((button) => setNavState(button, state.activeSection));
  elements.edit.classList.toggle("is-saving", state.editing);
  elements.editLabel.textContent = state.editing ? "Save" : "Edit";
  elements.cancel.hidden = !state.editing;
  renderBlockEditor(elements.sectionRoot, store, attachments);
  window.dispatchEvent(new CustomEvent("dashboardrender"));
}

function renderMeta(meta, editing) {
  const fields = {
    destination: elements.destination,
    region: elements.region,
    days: elements.tripDays,
    legs: elements.tripLegs,
  };
  for (const [field, element] of Object.entries(fields)) {
    element.textContent = meta[field];
    element.contentEditable = String(editing);
    element.dataset.metaField = field;
  }
  elements.travelDates.textContent = formatDateRange(meta.startDate, meta.endDate);
  elements.travelDates.hidden = editing;
  elements.travelDateEditor.hidden = !editing;
  elements.tripStartDate.value = meta.startDate;
  elements.tripEndDate.value = meta.endDate;
}

function updateMeta(element) {
  if (!store.getState().editing) return;
  store.mutate((document) => { document.meta[element.dataset.metaField] = element.innerText.trim(); });
}

function updateMetaDate(element) {
  if (!store.getState().editing) return;
  store.mutate((document) => {
    const field = element.dataset.metaDate;
    document.meta[field] = element.value;
    const { startDate, endDate } = document.meta;
    if (startDate && endDate && startDate > endDate) {
      document.meta[field === "startDate" ? "endDate" : "startDate"] = element.value;
    }
    const days = inclusiveDayCount(document.meta.startDate, document.meta.endDate);
    if (days !== null) document.meta.days = String(days);
  });
  renderMeta(store.getDocument().meta, true);
}

function setNavState(button, activeSection) {
  const active = button.dataset.view === activeSection;
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-selected", String(active));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function getElements() {
  return {
    sectionRoot: document.querySelector("#sectionRoot"),
    sectionTitle: document.querySelector("#sectionTitle"),
    sectionEyebrow: document.querySelector("#sectionEyebrow"),
    contentSection: document.querySelector(".content-section"),
    hero: document.querySelector(".hero"),
    workspace: document.querySelector(".workspace-bar"),
    destination: document.querySelector("#destination"),
    region: document.querySelector("#region"),
    travelDates: document.querySelector("#travelDates"),
    travelDateEditor: document.querySelector("#travelDateEditor"),
    tripStartDate: document.querySelector("#tripStartDate"),
    tripEndDate: document.querySelector("#tripEndDate"),
    tripDays: document.querySelector("#tripDays"),
    tripLegs: document.querySelector("#tripLegs"),
    brand: document.querySelector(".brand"),
    nav: [...document.querySelectorAll("[data-view]")],
    edit: document.querySelector("#editButton"),
    editLabel: document.querySelector("#editButtonLabel"),
    cancel: document.querySelector("#cancelButton"),
    logout: document.querySelector("#logoutButton"),
    toast: document.querySelector("#toast"),
    preferences: {
      theme: document.querySelector("#themeToggle"),
      palettes: [...document.querySelectorAll("[data-palette]")],
      fontDecrease: document.querySelector("#fontDecrease"),
      fontIncrease: document.querySelector("#fontIncrease"),
      fontStatus: document.querySelector("#fontScaleStatus"),
    },
    scrollTop: {
      button: document.querySelector("#scrollTop"),
      sentinel: document.querySelector("#topSentinel"),
    },
    auth: {
      dialog: document.querySelector("#authDialog"),
      form: document.querySelector("#authForm"),
      input: document.querySelector("#passwordInput"),
      error: document.querySelector("#authError"),
      close: document.querySelector("#authClose"),
      show: document.querySelector("#showPassword"),
    },
  };
}
