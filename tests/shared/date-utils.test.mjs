import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAgendaDate,
  formatAgendaHeadingDate,
  formatClockTime,
  formatDateRange,
  formatDisplayDate,
  formatDisplayDateRange,
  formatFullDate,
  formatStayDate,
  formatTravelDateRange,
  inclusiveDayCount,
  isIsoDate,
  parseLegacyCalendarDate,
  parseLegacyDateInRange,
  parseLegacyDateRange,
  setDateDisplayFormat,
  setDateLocale,
  setTimeDisplayFormat,
} from "../../src/shared/date-utils.mjs";

test("formats ISO calendar values without timezone drift", () => {
  assert.equal(formatFullDate("2026-10-24"), "Saturday, 24 Oct");
  assert.equal(formatStayDate("2026-10-24"), "Saturday, Oct 24th");
  assert.equal(formatDateRange("2026-10-24", "2026-11-01"), "24 Oct - 1 Nov 2026");
  assert.equal(formatTravelDateRange("2026-10-24", "2026-11-01"), "24th of Oct to 1st of Nov, 2026");
  assert.equal(formatTravelDateRange("2026-11-11", "2026-11-11"), "11th of Nov, 2026");
  assert.deepEqual(formatAgendaDate("2026-11-01"), { month: "Nov", day: "01", weekday: "Sunday" });
  assert.deepEqual(formatAgendaHeadingDate("2026-10-24"), { weekday: "Saturday", date: "24th of Oct" });
  setDateLocale("pt-BR");
  assert.equal(formatStayDate("2026-10-24"), "sábado, 24 de out.");
  assert.equal(formatTravelDateRange("2026-10-24", "2026-11-01"), "24 de out. a 1º de nov. de 2026");
  assert.deepEqual(formatAgendaHeadingDate("2026-10-24"), { weekday: "sábado", date: "24 de out" });
  setDateLocale("en-GB");
  assert.equal(inclusiveDayCount("2026-10-24", "2026-11-01"), 9);
});

test("parses legacy display dates using the trip range for their year", () => {
  const range = parseLegacyDateRange("Dec 30, 2026 - Jan 2, 2027");
  assert.deepEqual(range, { startDate: "2026-12-30", endDate: "2027-01-02" });
  assert.equal(parseLegacyDateInRange("Wednesday, Dec 30", range), "2026-12-30");
  assert.equal(parseLegacyCalendarDate("Jan", "02", range), "2027-01-02");
});

test("rejects impossible dates and preserves an explicit empty date", () => {
  assert.equal(isIsoDate(""), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("Oct 24"), false);
});

test("formats dates and clock times with the visitor's selected display style", () => {
  setDateLocale("en-GB");
  setDateDisplayFormat("day-first");
  setTimeDisplayFormat("24-hour");
  assert.equal(formatDisplayDate("2026-10-24"), "24/10/2026");
  assert.equal(formatDisplayDateRange("2026-10-24", "2026-11-01"), "24/10 - 01/11 2026");
  assert.equal(formatClockTime("08:50"), "08:50");

  setDateDisplayFormat("month-first");
  setTimeDisplayFormat("12-hour");
  assert.equal(formatDisplayDate("2026-10-24"), "10/24/2026");
  assert.equal(formatDisplayDateRange("2026-10-24", "2026-11-01"), "10/24 - 11/01 2026");
  assert.equal(formatClockTime("08:50"), "8:50 AM");
  assert.equal(formatClockTime("16:30"), "4:30 PM");
  assert.equal(formatClockTime("To confirm"), "-");
  assert.equal(formatClockTime("A confirmar"), "-");
  assert.equal(formatClockTime(""), "-");

  setDateDisplayFormat("written");
  assert.equal(formatDisplayDateRange("2026-10-24", "2026-11-01"), "24 Oct - 1 Nov 2026");
  setDateDisplayFormat("day-first");
  setTimeDisplayFormat("24-hour");
});
