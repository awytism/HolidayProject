const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const MONTH_DATE = new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i");
const MONTH_DATE_GLOBAL = new RegExp(MONTH_DATE.source, "gi");
const MONTH_INDEX = new Map([
  ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3], ["may", 4], ["jun", 5],
  ["jul", 6], ["aug", 7], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11],
]);
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

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

export function formatFullDate(value, fallback = "Add date") {
  const date = parseIsoDate(value);
  return date ? FULL_DATE.format(date) : fallback;
}

export function formatDateRange(startValue, endValue, fallback = "Add travel dates") {
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

export function formatAgendaDate(value) {
  const date = parseIsoDate(value);
  if (!date) return { month: "Date", day: "—", weekday: "Not selected" };
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
  const match = typeof value === "string" ? MONTH_DATE.exec(value) : null;
  if (!match) return "";
  const year = Number(match[3] ?? fallbackYear);
  const month = monthIndex(match[1]);
  return toIsoDate(year, month, Number(match[2]));
}

export function parseLegacyDateInRange(value, range) {
  if (parseIsoDate(value)) return value;
  const match = typeof value === "string" ? MONTH_DATE.exec(value) : null;
  if (!match) return "";
  const month = monthIndex(match[1]);
  const year = match[3] ? Number(match[3]) : inferYearForMonth(month, range);
  return toIsoDate(year, month, Number(match[2]));
}

export function parseLegacyCalendarDate(month, day, range) {
  return parseLegacyDateInRange(`${month ?? ""} ${day ?? ""}`, range);
}

export function parseLegacyDateRange(value) {
  const matches = typeof value === "string" ? [...value.matchAll(MONTH_DATE_GLOBAL)] : [];
  if (matches.length < 2) return { startDate: "", endDate: "" };
  const firstMonth = monthIndex(matches[0][1]);
  const secondMonth = monthIndex(matches[1][1]);
  const [firstYear, secondYear] = resolveRangeYears(
    firstMonth,
    secondMonth,
    numericYear(matches[0][3]),
    numericYear(matches[1][3]),
  );
  if (firstYear === null || secondYear === null) return { startDate: "", endDate: "" };
  return {
    startDate: toIsoDate(firstYear, firstMonth, Number(matches[0][2])),
    endDate: toIsoDate(secondYear, secondMonth, Number(matches[1][2])),
  };
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
