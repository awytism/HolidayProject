const DATABASE_NAME = "gramado-trip-custom-font";
const STORE_NAME = "font";
const RECORD_KEY = "active";
const MAX_FONT_BYTES = 5 * 1024 * 1024;
const FONT_EXTENSIONS = new Set(["ttf", "otf", "woff", "woff2"]);
const FONT_MIME_TYPES = new Set([
  "",
  "application/font-sfnt",
  "application/font-woff",
  "application/font-woff2",
  "application/octet-stream",
  "application/x-font-opentype",
  "application/x-font-ttf",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
]);

export function customFontLabelFromName(value) {
  const fileName = String(value ?? "").trim().split(/[\\/]/).at(-1) ?? "";
  const withoutExtension = fileName.replace(/\.(?:ttf|otf|woff2?)$/i, "");
  const label = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return label.slice(0, 60) || "Life Savers";
}

export function validateCustomFontFile(file) {
  if (!isSupportedFontFile(file)) throw new TypeError("Choose a .ttf, .otf, .woff or .woff2 font file.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new TypeError("The selected font file is empty.");
  if (file.size > MAX_FONT_BYTES) throw new TypeError("The font file must be 5 MB or smaller.");
  const extension = file.name.split(".").at(-1).toLowerCase();
  return { extension, label: customFontLabelFromName(file.name) };
}

function isSupportedFontFile(file) {
  if (!file || typeof file.name !== "string") return false;
  const extension = file.name.split(".").at(-1).toLowerCase();
  const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
  return FONT_EXTENSIONS.has(extension) && FONT_MIME_TYPES.has(type);
}

export async function saveCustomFont(file, indexedDb = globalThis.indexedDB) {
  const { extension, label } = validateCustomFontFile(file);
  const bytes = await file.arrayBuffer();
  const record = { id: RECORD_KEY, bytes, extension, label, name: file.name, type: file.type || "" };
  await writeRecord(record, indexedDb);
  return record;
}

export async function readCustomFont(indexedDb = globalThis.indexedDB) {
  const database = await openDatabase(indexedDb);
  if (!database) return null;
  try {
    return await requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(RECORD_KEY));
  } finally {
    database.close();
  }
}

export async function clearCustomFont(indexedDb = globalThis.indexedDB) {
  const database = await openDatabase(indexedDb);
  if (!database) return;
  try {
    await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(RECORD_KEY));
  } finally {
    database.close();
  }
}

async function writeRecord(record, indexedDb) {
  const database = await openDatabase(indexedDb);
  if (!database) throw new TypeError("Custom font storage is not available in this browser.");
  try {
    await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record));
  } finally {
    database.close();
  }
}

function openDatabase(indexedDb) {
  if (!indexedDb?.open) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open custom font storage."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to update custom font storage."));
  });
}