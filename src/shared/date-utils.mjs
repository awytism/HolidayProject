const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|jan\\.?|fev\\.?|mar\\.?|abr\\.?|mai\\.?|jun\\.?|jul\\.?|ago\\.?|set\\.?|out\\.?|nov\\.?|dez\\.?";
const MONTH_DATE = new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i");
const MONTH_DATE_GLOBAL = new RegExp(MONTH_DATE.source, "gi");
const PORTUGUESE_DATE = new RegExp(`\\b(\\d{1,2})(?:º)?\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de|,)?\\s*(\\d{4})?`, "i");
const PORTUGUESE_DATE_GLOBAL = new RegExp(PORTUGUESE_DATE.source, "gi");
const MONTH_INDEX = new Map([
  ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3], ["may", 4], ["jun", 5],
  ["jul", 6], ["aug", 7], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11],
  ["fev", 1], ["abr", 3], ["mai", 4], ["ago", 7], ["set", 8], ["out", 9], ["dez", 11],
]);
const MONTH_DAY = new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("pt-BR", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });

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

export function formatFullDate(value, fallback = "Adicionar data") {
  const date = parseIsoDate(value);
  return date ? FULL_DATE.format(date) : fallback;
}

export function formatDateRange(startValue, endValue, fallback = "Adicionar datas da viagem") {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start && !end) return fallback;
  if (!start || !end) return `${MONTH_DAY.format(start ?? end)}, ${(start ?? end).getUTCFullYear()}`;
  if (start.getTime() === end.getTime()) return `${MONTH_DAY.format(start)}, ${start.getUTCFullYear()}`;
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return `${MONTH_DAY.format(start)} - ${MONTH_DAY.format(end)}, ${endYear}`;
  return `${MONTH_DAY.format(start)}, ${startYear} - ${MONTH_DAY.format(end)}, ${endYear}`;
}

export function formatTravelDateRange(startValue, endValue, fallback = "Adicionar datas da viagem") {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start && !end) return fallback;
  if (!start || !end) return `${formatPortugueseDate(start ?? end)} de ${(start ?? end).getUTCFullYear()}`;
  if (start.getTime() === end.getTime()) return `${formatPortugueseDate(start)} de ${start.getUTCFullYear()}`;
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return `${formatPortugueseDate(start)} – ${formatPortugueseDate(end)} de ${endYear}`;
  return `${formatPortugueseDate(start)} de ${startYear} – ${formatPortugueseDate(end)} de ${endYear}`;
}

function formatPortugueseDate(date) {
  const day = date.getUTCDate();
  return `${day === 1 ? "1º" : day} de ${MONTH.format(date)}`;
}

export function formatAgendaDate(value) {
  const date = parseIsoDate(value);
  if (!date) return { month: "Data", day: "—", weekday: "Não selecionada" };
  return {
    month: MONTH.format(date),
    day: String(date.getUTCDate()).padStart(2, "0"),
    weekday: WEEKDAY.format(date),
  };
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
  const portuguese = PORTUGUESE_DATE.exec(value);
  if (!portuguese) return null;
  return { month: monthIndex(portuguese[2]), day: Number(portuguese[1]), year: numericYear(portuguese[3]), index: portuguese.index };
}

function legacyDateMatches(value) {
  if (typeof value !== "string") return [];
  const english = [...value.matchAll(MONTH_DATE_GLOBAL)].map((match) => ({
    month: monthIndex(match[1]), day: Number(match[2]), year: numericYear(match[3]), index: match.index,
  }));
  const portuguese = [...value.matchAll(PORTUGUESE_DATE_GLOBAL)].map((match) => ({
    month: monthIndex(match[2]), day: Number(match[1]), year: numericYear(match[3]), index: match.index,
  }));
  return [...english, ...portuguese].sort((left, right) => left.index - right.index);
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
