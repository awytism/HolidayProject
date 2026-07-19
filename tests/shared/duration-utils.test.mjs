import assert from "node:assert/strict";
import test from "node:test";
import { formatDurationUnits } from "../../src/shared/duration-utils.mjs";

test("formats travel durations with h and m everywhere", () => {
  assert.equal(formatDurationUnits("1 h 53 min"), "1 h 53 m");
  assert.equal(formatDurationUnits("13 minutes"), "13 m");
  assert.equal(formatDurationUnits("2h 10m"), "2 h 10 m");
  assert.equal(formatDurationUnits("1 hora e 5 minutos"), "1 h e 5 m");
  assert.equal(formatDurationUnits("A confirmar"), "-");
  assert.equal(formatDurationUnits("TBD"), "-");
});
