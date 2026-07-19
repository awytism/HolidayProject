import {
  getDateDisplayFormat,
  getTimeDisplayFormat,
  normalizeDateDisplayFormat,
  normalizeTimeDisplayFormat,
  setDateDisplayFormat,
  setTimeDisplayFormat,
} from "../../shared/date-utils.mjs";

const DATE_FORMAT_KEY = "travel-plan-date-format";
const TIME_FORMAT_KEY = "travel-plan-time-format";

export function initializeDateTimePreferences(storage = getStorage()) {
  setDateDisplayFormat(read(storage, DATE_FORMAT_KEY));
  setTimeDisplayFormat(read(storage, TIME_FORMAT_KEY));

  return {
    get dateFormat() { return getDateDisplayFormat(); },
    get timeFormat() { return getTimeDisplayFormat(); },
    setDateFormat(value) {
      const normalized = normalizeDateDisplayFormat(value);
      setDateDisplayFormat(normalized);
      write(storage, DATE_FORMAT_KEY, normalized);
      return normalized;
    },
    setTimeFormat(value) {
      const normalized = normalizeTimeDisplayFormat(value);
      setTimeDisplayFormat(normalized);
      write(storage, TIME_FORMAT_KEY, normalized);
      return normalized;
    },
  };
}

function getStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

function read(storage, key) {
  try { return storage?.getItem(key); } catch { return null; }
}

function write(storage, key, value) {
  try { storage?.setItem(key, value); } catch { /* Display preferences remain active for this page. */ }
}

