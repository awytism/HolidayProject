import { createCookieStore } from "./cookies.js";

const THEME_KEY = "gramado-trip-theme";
const FONT_COOKIE = "gramado_font_scale";
const FONT_STEPS = [90, 100, 110, 120, 130];

export function initializePreferences(elements, storage, cookies = createCookieStore()) {
  const preferences = storage ?? getStorage();
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
  const color = dark ? "#0f1b2a" : "#f3f7fc";
  document.querySelector('meta[name="theme-color"]').content = color;
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
