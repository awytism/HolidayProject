import { createCookieStore } from "./cookies.js";

const THEME_KEY = "gramado-trip-theme";
const PALETTE_KEY = "gramado-trip-palette";
const FONT_COOKIE = "gramado_font_scale";
const FONT_STEPS = [90, 100, 110, 120, 130];
const DEFAULT_PALETTE = "coral-olive-teal";
const PALETTES = new Set([DEFAULT_PALETTE]);

export function initializePreferences(elements, storage, cookies = createCookieStore()) {
  const preferences = storage ?? getStorage();
  setPalette(normalizePalette(readPreference(preferences, PALETTE_KEY)), elements, preferences, false);
  initializePalettePicker(elements, preferences);
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(readPreference(preferences, THEME_KEY) || preferredTheme, elements, preferences);
  elements.theme.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", elements, preferences);
  });
  if (elements.fontDecrease && elements.fontIncrease && elements.fontStatus) {
    let fontScale = normalizeFontScale(cookies.get(FONT_COOKIE));
    applyFontScale(fontScale, elements);
    elements.fontDecrease.addEventListener("click", () => {
      fontScale = changeFontScale(fontScale, -1, elements, cookies);
    });
    elements.fontIncrease.addEventListener("click", () => {
      fontScale = changeFontScale(fontScale, 1, elements, cookies);
    });
  }
}

export function normalizeFontScale(value) {
  if (value === null || value === undefined || value === "") return 100;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return FONT_STEPS.reduce((closest, step) => Math.abs(step - numeric) < Math.abs(closest - numeric) ? step : closest, 100);
}

export function normalizePalette(value) {
  return PALETTES.has(value) ? value : DEFAULT_PALETTE;
}

function initializePalettePicker(elements, storage) {
  const { paletteControl, paletteToggle, paletteMenu, paletteOptions = [] } = elements;
  if (!paletteControl || !paletteToggle || !paletteMenu || paletteOptions.length === 0) return;

  const positionMenu = () => {
    const edgeGap = 12;
    const toggleBounds = paletteToggle.getBoundingClientRect();
    const menuWidth = Math.min(132, window.innerWidth - edgeGap * 2);
    const centredLeft = toggleBounds.left + toggleBounds.width / 2 - menuWidth / 2;
    const left = Math.max(edgeGap, Math.min(centredLeft, window.innerWidth - menuWidth - edgeGap));
    paletteMenu.style.width = `${menuWidth}px`;
    paletteMenu.style.left = `${Math.round(left)}px`;
    paletteMenu.style.top = `${Math.round(toggleBounds.bottom + 10)}px`;
  };
  const setOpen = (open, { restoreFocus = false } = {}) => {
    paletteMenu.hidden = !open;
    paletteToggle.setAttribute("aria-expanded", String(open));
    paletteToggle.setAttribute("aria-label", open ? "Close colour palette" : "Open colour palette");
    paletteControl.classList.toggle("is-open", open);
    if (open) positionMenu();
    if (restoreFocus) paletteToggle.focus();
  };

  paletteToggle.addEventListener("click", () => setOpen(paletteMenu.hidden));
  for (const option of paletteOptions) {
    option.addEventListener("click", () => {
      setPalette(option.dataset.palette, elements, storage);
      setOpen(false, { restoreFocus: true });
    });
  }
  document.addEventListener("click", (event) => {
    if (!paletteMenu.hidden && !paletteControl.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !paletteMenu.hidden) setOpen(false, { restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (!paletteMenu.hidden) positionMenu();
  }, { passive: true });
}

function setPalette(value, elements, storage, persist = true) {
  const palette = normalizePalette(value);
  document.documentElement.dataset.palette = palette;
  if (persist) writePreference(storage, PALETTE_KEY, palette);
  for (const option of elements.paletteOptions ?? []) {
    const selected = option.dataset.palette === palette;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-checked", String(selected));
  }
  updateThemeColor();
  if (typeof window.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("palettechange", { detail: { palette } }));
  }
}

function setTheme(theme, elements, storage) {
  document.documentElement.dataset.theme = theme;
  writePreference(storage, THEME_KEY, theme);
  const dark = theme === "dark";
  elements.theme.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
  updateThemeColor();
}


function getStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

function readPreference(storage, key) {
  try { return storage?.getItem(key); } catch { return null; }
}

function writePreference(storage, key, value) {
  try { storage?.setItem(key, value); } catch { /* Preferences remain in memory for this page. */ }
}

function updateThemeColor() {
  const dark = document.documentElement.dataset.theme === "dark";
  const color = dark ? "#26251f" : "#fbf7e8";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = color;
}

function changeFontScale(current, direction, elements, cookies) {
  const index = FONT_STEPS.indexOf(current);
  const next = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, index + direction))];
  cookies.set(FONT_COOKIE, String(next), {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "Lax",
    secure: location.protocol === "https:",
  });
  applyFontScale(next, elements);
  window.dispatchEvent(new CustomEvent("fontscalechange", { detail: { scale: next } }));
  return next;
}

function applyFontScale(scale, elements) {
  document.documentElement.style.setProperty("--font-scale", String(scale / 100));
  document.documentElement.dataset.fontScale = String(scale);
  elements.fontDecrease.disabled = scale === FONT_STEPS[0];
  elements.fontIncrease.disabled = scale === FONT_STEPS.at(-1);
  elements.fontStatus.textContent = `Tamanho do texto: ${scale}%`;
}
