import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceStreakWeeks, validateMeasurement } from "./growth-metrics";

const NOW = new Date("2026-10-28T07:00:00Z");

test("measurement requires one number inside a human range", () => {
  const ok = validateMeasurement({ weightKg: 58.2, waistCm: 68 }, NOW);
  assert.equal(ok.ok, true);
  const empty = validateMeasurement({ note: "only a note" }, NOW);
  assert.equal(empty.ok, false);
  const huge = validateMeasurement({ weightKg: 400 }, NOW);
  assert.equal(huge.ok, false);
  const future = validateMeasurement({ measuredOn: "2026-10-29", weightKg: 55 }, NOW);
  assert.equal(future.ok, false);
});

test("attendance streak counts consecutive weeks and forgives an open current week", () => {
  assert.equal(attendanceStreakWeeks(["2026-10-27", "2026-10-20", "2026-10-14"], "2026-10-28"), 3);
  assert.equal(attendanceStreakWeeks(["2026-10-20", "2026-10-14"], "2026-10-28"), 2);
  assert.equal(attendanceStreakWeeks(["2026-10-13"], "2026-10-28"), 0);
  assert.equal(attendanceStreakWeeks([], "2026-10-28"), 0);
});
