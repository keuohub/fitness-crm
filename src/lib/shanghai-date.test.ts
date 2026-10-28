import assert from "node:assert/strict";
import { test } from "node:test";
import { addCalendarDays, companionshipDays, shanghaiToday } from "./shanghai-date";

test("shanghai date is the business day, including before 08:00", () => {
  const early = new Date("2026-10-27T17:30:00Z");
  assert.equal(shanghaiToday(early), "2026-10-28");
  const afternoon = new Date("2026-10-28T07:00:00Z");
  assert.equal(shanghaiToday(afternoon), "2026-10-28");
});

test("companionship counts the join date as day 1 and rolls at Shanghai midnight", () => {
  assert.equal(companionshipDays("2026-10-28", new Date("2026-10-27T17:30:00Z")), 1);
  assert.equal(companionshipDays("2026-10-28", new Date("2026-10-28T16:30:00Z")), 2);
  assert.equal(companionshipDays("2026-10-01", new Date("2026-10-28T07:00:00Z")), 28);
  assert.equal(companionshipDays(""), null);
});

test("addCalendarDays does not drift across month ends", () => {
  assert.equal(addCalendarDays("2026-10-28", -819), "2024-07-31");
  assert.equal(addCalendarDays("2026-01-01", 31), "2026-02-01");
});
