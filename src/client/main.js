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
import { createApi, ApiError } from "./services/api.js";
import { formatTravelDateRange, inclusiveDayCount } from "/shared/date-utils.mjs";
import { validateDocument } from "/shared/document-schema.mjs";

const SECTION_ORDER = ["transport", "stay", "agenda"];

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
bindBlockEditor(elements.sectionsRoot, { store, render, imagePicker, templates, attachments });
attachments.bind(elements.sectionsRoot, render);
bindEvents();
initializeSectionTracking();
await loadDashboard();

async function loadDashboard() {
  setSectionStatus('<div class="loading-state">Carregando sua viagem…</div>');
  try {
    const state = await api.getDocument();
    const migration = prepareLoadedState(state);
    store.load(migration.document, state.revision, migration.legacyMigrated);
    setInitialSection();
    render();
    if (migration.legacyMigrated) showToast("Edições locais carregadas. Desbloqueie e salve para migrá-las.");
  } catch (error) {
    setSectionStatus('<div class="empty-state"><strong>Não foi possível carregar Dudu e Alê de Férias</strong><span></span></div>', error.message);
  }
}

function setSectionStatus(markup, message = "") {
  for (const root of Object.values(elements.sectionRoots)) {
    root.innerHTML = markup;
    if (message) root.querySelector("span").textContent = message;
  }
}
function bindEvents() {
  elements.nav.forEach((button) => button.addEventListener("click", () => switchSection(button.dataset.view)));
  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    switchSection("transport", elements.hero);
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
    await Promise.all(SECTION_ORDER.map((section) => attachments.unlock(session, section)));
    store.beginEdit();
    elements.logout.hidden = false;
    render();
    elements.sectionRoots[store.getState().activeSection].querySelector("button,input,textarea")?.focus();
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
    await Promise.all(SECTION_ORDER.map((section) => attachments.refresh(section)));
    if (hadLegacyMigration) markLegacyMigrationComplete();
    render();
    showToast("Alterações salvas com segurança");
  } catch (error) {
    handleSaveError(error);
  }
}

function handleSaveError(error) {
  if (error instanceof ApiError && error.code === "revision_conflict") {
    showToast("Esta viagem foi alterada em outro lugar. Recarregue antes de salvar.");
    return;
  }
  if (error instanceof ApiError && error.status === 401) {
    cancelEditing();
    showToast("Sua sessão de edição expirou. Desbloqueie novamente.");
    return;
  }
  showToast(error.message);
}

function cancelEditing() {
  imagePicker.cancel();
  store.cancelEdit();
  render();
  showToast("Alterações descartadas");
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
    showToast("Edição bloqueada");
  } catch (error) {
    showToast(error.message);
  }
}

function switchSection(section, target = elements.sectionTargets[section]) {
  store.setActive(section);
  history.replaceState(null, "", "#" + section);
  elements.nav.forEach((button) => setNavState(button, section));
  attachments.ensureSection(section).catch((error) => showToast(error.message));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  document.body.classList.toggle("is-editing", state.editing);
  renderMeta(tripDocument.meta, state.editing);
  elements.nav.forEach((button) => setNavState(button, state.activeSection));
  elements.edit.classList.toggle("is-saving", state.editing);
  elements.editLabel.textContent = state.editing ? "Salvar" : "Editar";
  elements.cancel.hidden = !state.editing;
  for (const section of SECTION_ORDER) {
    renderBlockEditor(elements.sectionRoots[section], store, attachments, section);
  }
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
  elements.travelDates.textContent = formatTravelDateRange(meta.startDate, meta.endDate);
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
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function getElements() {
  const hero = document.querySelector(".hero");
  const sectionRoots = Object.fromEntries(SECTION_ORDER.map((section) => [
    section,
    document.querySelector('[data-section-root="' + section + '"]'),
  ]));
  const sectionTargets = {
    transport: document.querySelector("#transportTitle"),
    stay: document.querySelector("#stayTitle"),
    agenda: document.querySelector("#agendaTitle"),
  };
  return {
    sectionsRoot: document.querySelector("#sectionsRoot"),
    sectionRoots,
    sectionTargets,
    hero,
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
