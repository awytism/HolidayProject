import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAgendaDate,
  formatDateRange,
  formatFullDate,
  formatTravelDateRange,
  inclusiveDayCount,
  isIsoDate,
  parseLegacyCalendarDate,
  parseLegacyDateInRange,
  parseLegacyDateRange,
} from "../../src/shared/date-utils.mjs";

test("formats ISO calendar values without timezone drift", () => {
  assert.equal(formatFullDate("2026-10-24"), "Saturday, Oct 24");
  assert.equal(formatDateRange("2026-10-24", "2026-11-01"), "Oct 24 - Nov 1, 2026");
  assert.equal(formatTravelDateRange("2026-10-24", "2026-11-01"), "Oct 24th – Nov 1st 2026");
  assert.equal(formatTravelDateRange("2026-11-11", "2026-11-11"), "Nov 11th 2026");
  assert.deepEqual(formatAgendaDate("2026-11-01"), { month: "Nov", day: "01", weekday: "Sunday" });
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
