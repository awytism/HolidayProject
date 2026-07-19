import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { deriveTripStats, synchronizeTripStats } from "../../src/shared/trip-stats.mjs";

test("derives hero days from dates and legs from transport cards", () => {
  const document = createDefaultDocument();
  document.meta.days = "99";
  document.meta.legs = "99";
  assert.deepEqual(deriveTripStats(document), { days: 9, legs: 4 });

  document.meta.endDate = document.meta.startDate;
  document.sections.transport.push({ id: "extra-note", type: "note", data: {} });
  assert.deepEqual(deriveTripStats(document), { days: 1, legs: 4 });

  document.sections.transport.push({ id: "extra-flight", type: "flight", data: {} });
  assert.deepEqual(synchronizeTripStats(document), { days: 1, legs: 5 });
  assert.equal(document.meta.days, "1");
  assert.equal(document.meta.legs, "5");
});
