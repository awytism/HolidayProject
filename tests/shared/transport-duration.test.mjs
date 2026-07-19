import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveTransportDuration,
  isValidTimeZone,
} from "../../src/shared/transport-duration.mjs";

test("derives transport durations from endpoint dates, clocks and time zones", () => {
  const leg = {
    date: "2026-10-24",
    departure: "08:50",
    arrival: "11:00",
    departureDate: "2026-10-24",
    arrivalDate: "2026-10-24",
    departureTimeZone: "America/Sao_Paulo",
    arrivalTimeZone: "America/Sao_Paulo",
  };
  assert.equal(deriveTransportDuration(leg), "2 h 10 m");

  leg.arrivalDate = "2026-10-26";
  leg.arrival = "11:20";
  assert.equal(deriveTransportDuration(leg), "2 d 2 h 30 m");

  leg.arrivalDate = "2026-10-24";
  leg.departure = "08:00";
  leg.arrival = "12:00";
  leg.arrivalTimeZone = "UTC";
  assert.equal(deriveTransportDuration(leg), "1 h");
});

test("handles legacy overnight legs and incomplete transport times safely", () => {
  const legacy = {
    date: "2026-10-24",
    departure: "23:30",
    arrival: "01:00",
  };
  assert.equal(deriveTransportDuration(legacy), "1 h 30 m");
  legacy.arrival = "TBD";
  assert.equal(deriveTransportDuration(legacy), "0 m");
  assert.equal(isValidTimeZone("America/Sao_Paulo"), true);
  assert.equal(isValidTimeZone("Not/A_Time_Zone"), false);
});
