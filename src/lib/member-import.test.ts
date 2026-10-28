import assert from "node:assert/strict";
import { test } from "node:test";
import {
  annotateInFileDuplicates,
  cardIdempotencyKey,
  deduceJoinedAt,
  matchExistingMember,
  normalizePhone,
  planImportRow,
} from "./member-import";
import { addCalendarDays, shanghaiToday } from "./shanghai-date";

const NOW = new Date("2026-10-27T17:30:00Z");

test("phone normalization strips separators and country code", () => {
  assert.equal(normalizePhone("138-0000-0001").phone, "13800000001");
  assert.equal(normalizePhone("+86 138 0000 0001").phone, "13800000001");
  assert.equal(normalizePhone("").phone, "");
  assert.ok(normalizePhone("12345").error);
});

test("820 days is anchored to the Shanghai date, not UTC", () => {
  const got = deduceJoinedAt("820", "", NOW);
  const expected = addCalendarDays(shanghaiToday(NOW), -819);
  assert.equal(shanghaiToday(NOW), "2026-10-28");
  assert.equal(got.date, expected);
  assert.equal(got.date, "2024-07-31");
  const utcWrong = new Date(NOW.getTime() - 819 * 86400000).toISOString().slice(0, 10);
  assert.notEqual(got.date, utcWrong);
});

test("explicit dates and invalid dates", () => {
  assert.equal(deduceJoinedAt("2022/3/15", "", NOW).date, "2022-03-15");
  assert.equal(deduceJoinedAt("2022/3/15", "", NOW).inferred, false);
  assert.ok(deduceJoinedAt("2026-13-40", "", NOW).error);
});

test("same name with a new phone is not merged; duplicate phones in the file fail", () => {
  const a = planImportRow({ 姓名: "王芳", 手机号: "13800000001", 备注: "820天" }, 1, NOW);
  const b = planImportRow({ 姓名: "王芳", 手机号: "13800000001" }, 2, NOW);
  const c = planImportRow({ 姓名: "李梅" }, 3, NOW);
  const d = planImportRow({ 姓名: "李梅" }, 4, NOW);
  annotateInFileDuplicates([a, b, c, d]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.match(b.reason || "", /重复/);
  assert.equal(c.ok, false);
  assert.equal(d.ok, false);
});

test("card counts reject leftovers and keep zero as a real remaining", () => {
  const bad = planImportRow({ 姓名: "赵晴", 卡名: "普拉提次卡", 总次数: "10次", 剩余次数: "8" }, 1, NOW);
  assert.equal(bad.ok, false);
  const zero = planImportRow({ 姓名: "赵晴", 手机号: "13800000009", 卡名: "普拉提次卡", 总次数: "10", 剩余次数: "0" }, 1, NOW);
  assert.equal(zero.ok, true);
  assert.equal(zero.remaining, 0);
  const over = planImportRow({ 姓名: "赵晴", 手机号: "13800000008", 卡名: "普拉提次卡", 总次数: "10", 剩余次数: "12" }, 1, NOW);
  assert.equal(over.ok, false);
});

test("a new phone is never merged onto a same-name member", () => {
  const members = [{ id: 1, name: "王芳", phone: "13800000001", memberCode: "0001" }];
  const created = matchExistingMember({ name: "王芳", phone: "13900000002", memberCode: "" }, members);
  assert.equal(created.ok, true);
  if (created.ok) assert.equal(created.member, null);
  const dup = matchExistingMember({ name: "王芳", phone: "", memberCode: "" }, [
    members[0],
    { id: 2, name: "王芳", phone: "", memberCode: "0002" },
  ]);
  assert.equal(dup.ok, false);
  const ambiguousPhone = matchExistingMember({ name: "别人", phone: "13800000001", memberCode: "" }, [
    members[0],
    { id: 3, name: "李梅", phone: "13800000001", memberCode: "0003" },
  ]);
  assert.equal(ambiguousPhone.ok, false);
});

test("idempotency key ignores remaining count so a re-run cannot open a second card", () => {
  const a = cardIdempotencyKey(4, 9, "2026-10-01", "2027-04-01");
  const b = cardIdempotencyKey(4, 9, "2026-10-01", "2027-04-01");
  assert.equal(a, b);
  assert.equal(cardIdempotencyKey(4, 9, "2026-10-01", null).includes("untilopen"), true);
});
