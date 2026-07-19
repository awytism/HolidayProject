const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|jan\\.?|fev\\.?|mar\\.?|abr\\.?|mai\\.?|jun\\.?|jul\\.?|ago\\.?|set\\.?|out\\.?|nov\\.?|dez\\.?";
const MONTH_DATE = new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i");
const MONTH_DATE_GLOBAL = new RegExp(MONTH_DATE.source, "gi");
const BRITISH_DATE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:,?\\s+(\\d{4}))?`, "i");
const BRITISH_DATE_GLOBAL = new RegExp(BRITISH_DATE.source, "gi");
const PORTUGUESE_DATE = new RegExp(`\\b(\\d{1,2})(?:º)?\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de|,)?\\s*(\\d{4})?`, "i");
const PORTUGUESE_DATE_GLOBAL = new RegExp(PORTUGUESE_DATE.source, "gi");
const MONTH_INDEX = new Map([
  ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3], ["may", 4], ["jun", 5],
  ["jul", 6], ["aug", 7], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11],
  ["fev", 1], ["abr", 3], ["mai", 4], ["ago", 7], ["set", 8], ["out", 9], ["dez", 11],
]);
const SUPPORTED_LOCALES = new Set(["en-GB", "pt-BR"]);
const DATE_DISPLAY_FORMATS = new Set(["day-first", "month-first", "written"]);
const TIME_DISPLAY_FORMATS = new Set(["24-hour", "12-hour"]);
const UNCONFIRMED_TIMES = new Set([
  "tbd",
  "to confirm",
  "time to confirm",
  "a confirmar",
  "horário a confirmar",
  "horario a confirmar",
]);
let activeLocale = "en-GB";
let activeDateDisplayFormat = "day-first";
let activeTimeDisplayFormat = "24-hour";

export function setDateLocale(locale) {
  activeLocale = SUPPORTED_LOCALES.has(locale) ? locale : "en-GB";
}

export function getDateLocale() {
  return activeLocale;
}

export function normalizeDateDisplayFormat(value) {
  return DATE_DISPLAY_FORMATS.has(value) ? value : "day-first";
}

export function setDateDisplayFormat(value) {
  activeDateDisplayFormat = normalizeDateDisplayFormat(value);
}

export function getDateDisplayFormat() {
  return activeDateDisplayFormat;
}

export function normalizeTimeDisplayFormat(value) {
  return TIME_DISPLAY_FORMATS.has(value) ? value : "24-hour";
}

export function setTimeDisplayFormat(value) {
  activeTimeDisplayFormat = normalizeTimeDisplayFormat(value);
}

export function getTimeDisplayFormat() {
  return activeTimeDisplayFormat;
}

export function parseIsoDate(value) {
  const match = typeof value === "string" ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function isIsoDate(value, { allowEmpty = true } = {}) {
  return allowEmpty && value === "" ? true : parseIsoDate(value) !== null;
}

export function formatFullDate(value, fallback = activeLocale === "pt-BR" ? "Adicionar data" : "Add date") {
  const date = parseIsoDate(value);
  if (!date) return fallback;
  if (activeLocale === "en-GB") {
    const weekday = new Intl.DateTimeFormat(activeLocale, { weekday: "long", timeZone: "UTC" }).format(date);
    return `${weekday}, ${formatRangeDate(date)}`;
  }
  return new Intl.DateTimeFormat(activeLocale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function formatStayDate(value, fallback = activeLocale === "pt-BR" ? "Adicionar data" : "Add date") {
  const date = parseIsoDate(value);
  if (!date) return fallback;
  if (activeLocale === "en-GB") {
    const weekday = new Intl.DateTimeFormat(activeLocale, { weekday: "long", timeZone: "UTC" }).format(date);
    return `${weekday}, ${formatEnglishTravelDate(date)}`;
  }
  return new Intl.DateTimeFormat(activeLocale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function formatDateRange(startValue, endValue, fallback = activeLocale === "pt-BR" ? "Adicionar datas da viagem" : "Add trip dates") {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start && !end) return fallback;
  if (!start || !end) return formatRangeDate(start ?? end, true);
  if (start.getTime() === end.getTime()) return formatRangeDate(start, true);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return `${formatRangeDate(start)} - ${formatRangeDate(end, true)}`;
  return `${formatRangeDate(start, true)} - ${formatRangeDate(end, true)}`;
}

export function formatTravelDateRange(startValue, endValue, fallback = activeLocale === "pt-BR" ? "Adicionar datas da viagem" : "Add trip dates") {
  return formatTravelDateRangeForLocale(startValue, endValue, activeLocale, fallback);
}

export function formatTravelDateRangeForLocale(startValue, endValue, locale, fallback) {
  const targetLocale = SUPPORTED_LOCALES.has(locale) ? locale : "en-GB";
  const resolvedFallback = fallback ?? (targetLocale === "pt-BR" ? "Adicionar datas da viagem" : "Add trip dates");
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start && !end) return resolvedFallback;
  if (targetLocale === "en-GB") return formatEnglishTravelDateRange(start, end);
  return formatPortugueseTravelDateRange(start, end);
}

export function formatDisplayDate(value, format = activeDateDisplayFormat, locale = activeLocale, fallback) {
  const date = parseIsoDate(value);
  const targetLocale = SUPPORTED_LOCALES.has(locale) ? locale : "en-GB";
  if (!date) return fallback ?? (targetLocale === "pt-BR" ? "Adicionar data" : "Add date");
  const normalized = normalizeDateDisplayFormat(format);
  if (normalized === "written") {
    return new Intl.DateTimeFormat(targetLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return formatNumericDate(date, normalized, true);
}

export function formatDisplayDateRange(startValue, endValue, format = activeDateDisplayFormat, locale = activeLocale, fallback) {
  return formatDisplayDateRangeForLocale(startValue, endValue, locale, format, fallback);
}

export function formatDisplayDateRangeForLocale(startValue, endValue, locale, format = activeDateDisplayFormat, fallback) {
  const targetLocale = SUPPORTED_LOCALES.has(locale) ? locale : "en-GB";
  const resolvedFallback = fallback ?? (targetLocale === "pt-BR" ? "Adicionar datas da viagem" : "Add trip dates");
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start) return end
    ? formatDisplayDate(endValue, format, targetLocale, resolvedFallback)
    : resolvedFallback;
  if (!end) return formatDisplayDate(startValue, format, targetLocale, resolvedFallback);
  return formatCompleteDisplayDateRange(start, end, format, targetLocale);
}

function formatCompleteDisplayDateRange(start, end, format, locale) {
  const normalized = normalizeDateDisplayFormat(format);
  if (normalized === "written") return formatWrittenDisplayDateRange(start, end, locale);
  if (start.getTime() === end.getTime()) return formatNumericDate(start, normalized, true);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${formatNumericDate(start, normalized, true)} - ${formatNumericDate(end, normalized, true)}`;
  }
  return `${formatNumericDate(start, normalized)} - ${formatNumericDate(end, normalized)} ${end.getUTCFullYear()}`;
}

export function formatClockTime(value, format = activeTimeDisplayFormat) {
  const time = String(value ?? "").trim();
  if (isUnconfirmedTime(time)) return "-";
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return value;
  if (normalizeTimeDisplayFormat(format) === "24-hour") {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const suffix = hours < 12 ? "AM" : "PM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function isUnconfirmedTime(value) {
  return !value || UNCONFIRMED_TIMES.has(value.toLocaleLowerCase());
}

function formatNumericDate(date, format, includeYear = false) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const body = format === "month-first" ? `${month}/${day}` : `${day}/${month}`;
  return includeYear ? `${body}/${date.getUTCFullYear()}` : body;
}

function formatWrittenDisplayDateRange(start, end, locale) {
  if (start.getTime() === end.getTime()) return formatWrittenDisplayDate(start, locale, true);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${formatWrittenDisplayDate(start, locale, true)} - ${formatWrittenDisplayDate(end, locale, true)}`;
  }
  return `${formatWrittenDisplayDate(start, locale)} - ${formatWrittenDisplayDate(end, locale)} ${end.getUTCFullYear()}`;
}

function formatWrittenDisplayDate(date, locale, includeYear = false) {
  const options = { day: "numeric", month: "short", timeZone: "UTC" };
  if (includeYear) options.year = "numeric";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatPortugueseTravelDateRange(start, end) {
  if (!start || !end) return formatPortugueseTravelDate(start ?? end, true);
  if (start.getTime() === end.getTime()) return formatPortugueseTravelDate(start, true);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return `${formatPortugueseTravelDate(start)} a ${formatPortugueseTravelDate(end)} de ${endYear}`;
  return `${formatPortugueseTravelDate(start, true)} a ${formatPortugueseTravelDate(end, true)}`;
}

function formatEnglishTravelDateRange(start, end) {
  if (!start || !end) return formatEnglishRangeDate(start ?? end, true);
  if (start.getTime() === end.getTime()) return formatEnglishRangeDate(start, true);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return `${formatEnglishRangeDate(start)} to ${formatEnglishRangeDate(end)}, ${endYear}`;
  return `${formatEnglishRangeDate(start)}, ${startYear} to ${formatEnglishRangeDate(end)}, ${endYear}`;
}

function formatEnglishRangeDate(date, includeYear = false) {
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(date);
  const day = date.getUTCDate();
  return `${day}${ordinalSuffix(day)} of ${month}${includeYear ? `, ${date.getUTCFullYear()}` : ""}`;
}

function formatEnglishTravelDate(date, includeYear = false) {
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(date);
  const day = date.getUTCDate();
  return `${month} ${day}${ordinalSuffix(day)}${includeYear ? `, ${date.getUTCFullYear()}` : ""}`;
}

function ordinalSuffix(day) {
  const remainder = day % 100;
  return remainder >= 11 && remainder <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
}

function formatPortugueseTravelDate(date, includeYear = false) {
  const day = date.getUTCDate() === 1 ? "1º" : date.getUTCDate();
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date);
  return `${day} de ${month}${includeYear ? ` de ${date.getUTCFullYear()}` : ""}`;
}

export function formatAgendaDate(value) {
  const date = parseIsoDate(value);
  if (!date) return activeLocale === "pt-BR"
    ? { month: "Data", day: "—", weekday: "Não selecionada" }
    : { month: "Date", day: "—", weekday: "Not selected" };
  return {
    month: new Intl.DateTimeFormat(activeLocale, { month: "short", timeZone: "UTC" }).format(date),
    day: String(date.getUTCDate()).padStart(2, "0"),
    weekday: new Intl.DateTimeFormat(activeLocale, { weekday: "long", timeZone: "UTC" }).format(date),
  };
}

export function formatAgendaHeadingDate(value) {
  const date = parseIsoDate(value);
  if (!date) return activeLocale === "pt-BR"
    ? { weekday: "Data", date: "Não selecionada" }
    : { weekday: "Date", date: "Not selected" };
  const weekday = new Intl.DateTimeFormat(activeLocale, { weekday: "long", timeZone: "UTC" }).format(date);
  if (activeLocale === "en-GB") {
    return { weekday, date: formatEnglishRangeDate(date) };
  }
  const day = date.getUTCDate() === 1 ? "1º" : date.getUTCDate();
  const month = new Intl.DateTimeFormat(activeLocale, { month: "short", timeZone: "UTC" }).format(date).replace(/\.$/, "");
  return { weekday, date: `${day} de ${month}` };
}

function formatRangeDate(date, includeYear = false) {
  const options = { day: "numeric", month: "short", timeZone: "UTC" };
  if (includeYear) options.year = "numeric";
  return new Intl.DateTimeFormat(activeLocale, options).format(date);
}

export function inclusiveDayCount(startValue, endValue) {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function parseLegacyDate(value, fallbackYear) {
  if (parseIsoDate(value)) return value;
  const match = legacyDateMatch(value);
  if (!match) return "";
  const year = Number(match.year ?? fallbackYear);
  return toIsoDate(year, match.month, match.day);
}

export function parseLegacyDateInRange(value, range) {
  if (parseIsoDate(value)) return value;
  const match = legacyDateMatch(value);
  if (!match) return "";
  const year = match.year ?? inferYearForMonth(match.month, range);
  return toIsoDate(year, match.month, match.day);
}

export function parseLegacyCalendarDate(month, day, range) {
  return parseLegacyDateInRange(`${month ?? ""} ${day ?? ""}`, range);
}

export function parseLegacyDateRange(value) {
  const matches = legacyDateMatches(value);
  if (matches.length < 2) return { startDate: "", endDate: "" };
  const firstMonth = matches[0].month;
  const secondMonth = matches[1].month;
  const [firstYear, secondYear] = resolveRangeYears(
    firstMonth,
    secondMonth,
    matches[0].year,
    matches[1].year,
  );
  if (firstYear === null || secondYear === null) return { startDate: "", endDate: "" };
  return {
    startDate: toIsoDate(firstYear, firstMonth, matches[0].day),
    endDate: toIsoDate(secondYear, secondMonth, matches[1].day),
  };
}

function legacyDateMatch(value) {
  if (typeof value !== "string") return null;
  const english = MONTH_DATE.exec(value);
  if (english) return { month: monthIndex(english[1]), day: Number(english[2]), year: numericYear(english[3]), index: english.index };
  const british = BRITISH_DATE.exec(value);
  if (british) return { month: monthIndex(british[2]), day: Number(british[1]), year: numericYear(british[3]), index: british.index };
  const portuguese = PORTUGUESE_DATE.exec(value);
  if (!portuguese) return null;
  return { month: monthIndex(portuguese[2]), day: Number(portuguese[1]), year: numericYear(portuguese[3]), index: portuguese.index };
}

function legacyDateMatches(value) {
  if (typeof value !== "string") return [];
  const english = [...value.matchAll(MONTH_DATE_GLOBAL)].map((match) => ({
    month: monthIndex(match[1]), day: Number(match[2]), year: numericYear(match[3]), index: match.index,
  }));
  const british = [...value.matchAll(BRITISH_DATE_GLOBAL)].map((match) => ({
    month: monthIndex(match[2]), day: Number(match[1]), year: numericYear(match[3]), index: match.index,
  }));
  const portuguese = [...value.matchAll(PORTUGUESE_DATE_GLOBAL)].map((match) => ({
    month: monthIndex(match[2]), day: Number(match[1]), year: numericYear(match[3]), index: match.index,
  }));
  return [...english, ...british, ...portuguese].sort((left, right) => left.index - right.index);
}

function inferYearForMonth(month, range) {
  const start = parseIsoDate(range?.startDate);
  const end = parseIsoDate(range?.endDate);
  if (!start) return end?.getUTCFullYear() ?? null;
  if (!end || start.getUTCFullYear() === end.getUTCFullYear()) return start.getUTCFullYear();
  if (month >= start.getUTCMonth()) return start.getUTCFullYear();
  return end.getUTCFullYear();
}

function resolveRangeYears(firstMonth, secondMonth, firstYear, secondYear) {
  if (firstYear === null && secondYear === null) return [null, null];
  if (firstYear === null) return [firstMonth > secondMonth ? secondYear - 1 : secondYear, secondYear];
  if (secondYear === null) return [firstYear, secondMonth < firstMonth ? firstYear + 1 : firstYear];
  return [firstYear, secondYear];
}

function numericYear(value) {
  return value ? Number(value) : null;
}

function monthIndex(value) {
  return MONTH_INDEX.get(String(value).slice(0, 3).toLowerCase());
}

function toIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return "";
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return "";
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
