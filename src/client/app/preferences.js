import { createCookieStore } from "./cookies.js";
import { clearCustomFont, readCustomFont, saveCustomFont } from "./custom-font-storage.js";
import { updateThemedFavicon } from "./favicon.js";

const THEME_KEY = "gramado-trip-theme";
const PALETTE_KEY = "gramado-trip-palette";
const CUSTOM_PALETTE_KEY = "gramado-trip-custom-palette";
const FONT_KEY = "gramado-trip-font";
const FONT_COOKIE = "gramado_font_scale";
const FONT_STEPS = [90, 100, 110, 120, 130];
const DEFAULT_PALETTE = "coral-olive-teal";
const CUSTOM_PALETTE_ID = "custom-palette";
const DEFAULT_FONT = "google-sans";
const FONTS = new Set(["abeezee", "cause", DEFAULT_FONT, "inter", "life-savers"]);
const HEX_COLOUR_PATTERN = /^#[0-9A-F]{6}$/i;
export const CUSTOM_PALETTE_PLACEHOLDER = Object.freeze(["#C73866", "#FE676E", "#FD8F52", "#FFBD71", "#FFDCA2"]);
const PALETTES = new Set([DEFAULT_PALETTE, "periwinkle-dream", CUSTOM_PALETTE_ID]);
const CUSTOM_FONT_FAMILY = "Trip Custom Font";
let activeCustomFontFace;
const THEME_COLORS = new Map([
  [DEFAULT_PALETTE, { light: "#fbf7e8", dark: "#26251f" }],
  ["periwinkle-dream", { light: "#f4f6fc", dark: "#171823" }],
  [CUSTOM_PALETTE_ID, { light: "#fff7f1", dark: "#211619" }],
]);

export function initializePreferences(elements, storage, cookies = createCookieStore()) {
  const preferences = storage ?? getStorage();
  initializeCustomPalette(elements, preferences);
  setPalette(normalizePalette(readPreference(preferences, PALETTE_KEY)), elements, preferences, false);
  initializePalettePicker(elements, preferences);
  setFontFamily(normalizeFontFamily(readPreference(preferences, FONT_KEY)), elements, preferences, false);
  initializeFontPicker(elements, preferences);
  initializeCustomFont(elements, preferences);
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

export function normalizeFontFamily(value) {
  return FONTS.has(value) ? value : DEFAULT_FONT;
}

export function normalizeHexColour(value) {
  const candidate = String(value ?? "").trim();
  const prefixed = candidate.startsWith("#") ? candidate : `#${candidate}`;
  return HEX_COLOUR_PATTERN.test(prefixed) ? prefixed.toUpperCase() : null;
}

export function normalizeCustomPalette(value) {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { return null; }
  }
  if (!Array.isArray(source) || source.length !== 5) return null;
  const colours = source.map(normalizeHexColour);
  return colours.every(Boolean) ? colours : null;
}

function initializePalettePicker(elements, storage) {
  const { paletteControl, paletteToggle, paletteMenu, paletteOptions = [] } = elements;
  if (!paletteControl || !paletteToggle || !paletteMenu || paletteOptions.length === 0) return;

  const positionMenu = () => {
    const edgeGap = 12;
    const toggleBounds = paletteToggle.getBoundingClientRect();
    const editing = document.body?.classList.contains("is-inline-editing");
    const menuWidth = Math.min(editing ? 292 : 154, window.innerWidth - edgeGap * 2);
    const centredLeft = toggleBounds.left + toggleBounds.width / 2 - menuWidth / 2;
    const left = Math.max(edgeGap, Math.min(centredLeft, window.innerWidth - menuWidth - edgeGap));
    const top = Math.round(toggleBounds.bottom + 10);
    paletteMenu.style.width = `${menuWidth}px`;
    paletteMenu.style.left = `${Math.round(left)}px`;
    paletteMenu.style.top = `${top}px`;
    paletteMenu.style.maxHeight = `${Math.max(140, window.innerHeight - top - edgeGap)}px`;
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
  for (const [index, input] of (elements.customPaletteInputs ?? []).entries()) {
    input.addEventListener("input", () => {
      const colour = normalizeHexColour(input.value);
      input.setAttribute("aria-invalid", String(Boolean(input.value.trim()) && !colour));
      if (colour) elements.customPalettePreviews?.[index]?.style.setProperty("background", colour);
    });
  }
  elements.customPaletteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const inputs = elements.customPaletteInputs ?? [];
    const palette = normalizeCustomPalette(inputs.map((input) => input.value));
    if (!palette) {
      if (elements.customPaletteError) elements.customPaletteError.hidden = false;
      inputs.forEach((input) => input.setAttribute("aria-invalid", String(!normalizeHexColour(input.value))));
      return;
    }
    if (elements.customPaletteError) elements.customPaletteError.hidden = true;
    palette.forEach((colour, index) => { inputs[index].value = colour; inputs[index].setAttribute("aria-invalid", "false"); });
    applyCustomPalette(palette, elements);
    writePreference(storage, CUSTOM_PALETTE_KEY, JSON.stringify(palette));
    setPalette(CUSTOM_PALETTE_ID, elements, storage);
    setOpen(false, { restoreFocus: true });
  });
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

function initializeFontPicker(elements, storage) {
  const { fontFamilyControl, fontFamilyToggle, fontFamilyMenu, fontFamilyOptions = [] } = elements;
  if (!fontFamilyControl || !fontFamilyToggle || !fontFamilyMenu || fontFamilyOptions.length === 0) return;

  const positionMenu = () => {
    const edgeGap = 12;
    const toggleBounds = fontFamilyToggle.getBoundingClientRect();
    const menuWidth = Math.min(document.body?.classList.contains("is-inline-editing") ? 244 : 164, window.innerWidth - edgeGap * 2);
    const centredLeft = toggleBounds.left + toggleBounds.width / 2 - menuWidth / 2;
    const left = Math.max(edgeGap, Math.min(centredLeft, window.innerWidth - menuWidth - edgeGap));
    const top = Math.round(toggleBounds.bottom + 10);
    fontFamilyMenu.style.width = `${menuWidth}px`;
    fontFamilyMenu.style.left = `${Math.round(left)}px`;
    fontFamilyMenu.style.top = `${top}px`;
  };
  const setOpen = (open, { restoreFocus = false } = {}) => {
    fontFamilyMenu.hidden = !open;
    fontFamilyToggle.setAttribute("aria-expanded", String(open));
    fontFamilyToggle.setAttribute("aria-label", open ? "Close font options" : "Open font options");
    fontFamilyControl.classList.toggle("is-open", open);
    if (open) positionMenu();
    if (restoreFocus) fontFamilyToggle.focus();
  };

  fontFamilyToggle.addEventListener("click", () => setOpen(fontFamilyMenu.hidden));
  for (const option of fontFamilyOptions) {
    option.addEventListener("click", () => {
      setFontFamily(option.dataset.font, elements, storage);
      setOpen(false, { restoreFocus: true });
    });
  }
  document.addEventListener("click", (event) => {
    if (!fontFamilyMenu.hidden && !fontFamilyControl.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !fontFamilyMenu.hidden) setOpen(false, { restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (!fontFamilyMenu.hidden) positionMenu();
  }, { passive: true });
}

async function initializeCustomFont(elements, storage) {
  const { customFontChoice, customFontEditor, customFontInput, customFontLabel, customFontRemove, customFontStatus } = elements;
  if (!customFontChoice || !customFontEditor || !customFontInput || !customFontLabel || !customFontStatus) return;

  const activate = async (record, { select = false } = {}) => {
    await applyCustomFont(record, elements);
    if (select) setFontFamily("life-savers", elements, storage);
  };

  customFontInput.addEventListener("change", async () => {
    const [file] = customFontInput.files ?? [];
    if (!file) return;
    customFontInput.disabled = true;
    customFontStatus.classList.remove("is-error");
    customFontStatus.hidden = false;
    customFontStatus.textContent = "Loading custom font…";
    try {
      const record = await saveCustomFont(file);
      await activate(record, { select: true });
    } catch (error) {
      await clearCustomFont().catch(() => {});
      customFontStatus.classList.add("is-error");
      customFontStatus.hidden = false;
      customFontStatus.textContent = error?.message || "Unable to use that font file.";
    } finally {
      customFontInput.value = "";
      customFontInput.disabled = false;
    }
  });

  customFontRemove?.addEventListener("click", async () => {
    customFontRemove.disabled = true;
    try {
      await clearCustomFont();
      await activate(null);
    } finally {
      customFontRemove.disabled = false;
    }
  });

  try {
    await activate(await readCustomFont());
  } catch {
    await clearCustomFont().catch(() => {});
    await activate(null);
  }
}

async function applyCustomFont(record, elements) {
  if (activeCustomFontFace) document.fonts?.delete?.(activeCustomFontFace);
  activeCustomFontFace = undefined;
  document.documentElement.style.removeProperty("--custom-font-family");

  if (record) {
    const fontFace = new window.FontFace(CUSTOM_FONT_FAMILY, record.bytes);
    activeCustomFontFace = await fontFace.load();
    document.fonts.add(activeCustomFontFace);
    document.documentElement.style.setProperty("--custom-font-family", `"${CUSTOM_FONT_FAMILY}"`);
  }

  const label = record?.label || "Life Savers";
  elements.customFontLabel.textContent = label;
  elements.customFontChoice.setAttribute("aria-label", label);
  elements.customFontChoice.classList.toggle("has-custom-font", Boolean(record));
  elements.customFontRemove.hidden = !record;
  elements.customFontStatus.classList.remove("is-error");
  elements.customFontStatus.textContent = record ? `${label} is ready to use.` : "";
  elements.customFontStatus.hidden = !record;
  sortFontChoices(elements);
  window.dispatchEvent(new CustomEvent("customfontchange", { detail: { label, custom: Boolean(record) } }));
}

function sortFontChoices(elements) {
  const anchor = elements.customFontEditor;
  if (!anchor) return;
  const choices = [...(elements.fontFamilyOptions ?? [])];
  const customChoice = elements.customFontChoice;
  choices
    .filter((choice) => choice !== customChoice)
    .sort((first, second) => first.textContent.trim().localeCompare(second.textContent.trim(), "en", { sensitivity: "base" }))
    .forEach((choice) => anchor.parentElement.insertBefore(choice, anchor));
  if (customChoice) anchor.parentElement.insertBefore(customChoice, anchor);
}

function initializeCustomPalette(elements, storage) {
  const saved = normalizeCustomPalette(readPreference(storage, CUSTOM_PALETTE_KEY));
  const palette = saved ?? CUSTOM_PALETTE_PLACEHOLDER;
  applyCustomPalette(palette, elements);
  for (const [index, input] of (elements.customPaletteInputs ?? []).entries()) {
    input.value = saved?.[index] ?? "";
    input.placeholder = CUSTOM_PALETTE_PLACEHOLDER[index];
  }
}

function applyCustomPalette(palette, elements) {
  palette.forEach((colour, index) => {
    document.documentElement.style?.setProperty(`--custom-theme-${index + 1}`, colour);
    elements.customPalettePreviews?.[index]?.style.setProperty("background", colour);
  });
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
  updateThemedFavicon();
  if (typeof window.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("palettechange", { detail: { palette } }));
  }
}

function setFontFamily(value, elements, storage, persist = true) {
  const font = normalizeFontFamily(value);
  document.documentElement.dataset.font = font;
  if (persist) writePreference(storage, FONT_KEY, font);
  for (const option of elements.fontFamilyOptions ?? []) {
    const selected = option.dataset.font === font;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-checked", String(selected));
  }
  if (typeof window.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fontfamilychange", { detail: { font } }));
  }
}

function setTheme(theme, elements, storage) {
  document.documentElement.dataset.theme = theme;
  writePreference(storage, THEME_KEY, theme);
  const dark = theme === "dark";
  elements.theme.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
  updateThemeColor();
  updateThemedFavicon();
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
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const palette = normalizePalette(document.documentElement.dataset.palette);
  const color = THEME_COLORS.get(palette)?.[theme] ?? THEME_COLORS.get(DEFAULT_PALETTE)[theme];
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
