import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
import crypto from "node:crypto";

const envText = fs.readFileSync(".env.local", "utf8");
const baseSql = neon((envText.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("s6-acceptance", (envText.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(strings, ...values) {
  let last;
  for (let i = 0; i < 4; i++) {
    try { return await baseSql(strings, ...values); }
    catch (e) { last = e; await sleep(400 * (i + 1)); }
  }
  throw last;
}
const BASE = process.env.BASE_URL || "http://localhost:3001";
const envMap = Object.fromEntries(envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }));
const ADMIN_PASSWORD = process.env.S6_ADMIN_PASSWORD || envMap.ADMIN_PASSWORD || "";
const PIN36 = process.env.S6_PIN_36 || "";
const PIN88 = process.env.S6_PIN_88 || "";
const results = [];
const state = { sessions: [], cards: [], coachId: null, templateId: null, courseId: null, cardTypeId: null, notes: [] };

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
  if (!ok) throw new Error(`FAILED: ${name} ${detail}`);
}
async function req(path, { method = "GET", token, cookie, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
      break;
    } catch (e) { if (attempt === 2) throw e; await sleep(500); }
  }
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function adminLogin() {
  const res = await fetch(BASE + "/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin", password: ADMIN_PASSWORD }),
  });
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  return cookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}
async function memberLogin(code, suffix) {
  const r = await req("/api/portal/login", { method: "POST", body: { portalCode: code, phoneSuffix: suffix } });
  check(`会员登录 ${code}`, r.status === 200 && r.data.token, `HTTP ${r.status}`);
  return r.data.token;
}
async function mkSession(date, start, capacity = 2, coach = state.coachId) {
  const r = await req("/api/admin/schedule", {
    method: "POST", cookie: state.cookie,
    body: { courseCategoryId: 1, coachId: coach, roomId: 4, sessionDate: date, startTime: start, capacity },
  });
  check(`排课 ${date} ${start}`, r.status === 201, `HTTP ${r.status} ${JSON.stringify(r.data.warnings || [])}`);
  state.sessions.push(r.data.session.id);
  return r.data.session.id;
}
async function book(token, sessionId, key) {
  const r = await req("/api/portal/bookings", { method: "POST", token, body: { sessionId, idempotencyKey: key } });
  return r;
}
async function cancel(token, bookingId) {
  return req("/api/portal/bookings/cancel", { method: "POST", token, body: { bookingId } });
}
async function issue(memberId, cardTypeId) {
  const r = await req("/api/admin/member-cards", { method: "POST", cookie: state.cookie, body: { memberId, cardTypeId } });
  check(`开卡 member ${memberId} type ${cardTypeId}`, r.status === 201, `HTTP ${r.status}`);
  state.cards.push(r.data.id);
  return r.data;
}
async function cardState(id) {
  const [row] = await q`SELECT id, remaining_count, status, valid_until, valid_from FROM member_cards WHERE id=${id}`;
  return row;
}

async function cleanup() {
  try {
    for (const s of state.sessions) {
      await q`DELETE FROM post_class_notes WHERE session_id=${s}`;
      await q`DELETE FROM attendance WHERE session_id=${s}`;
      await q`DELETE FROM bookings WHERE session_id=${s}`;
      await q`DELETE FROM class_sessions WHERE id=${s}`;
    }
    if (state.templateId) {
      const generated = await q`SELECT id FROM class_sessions WHERE template_id=${state.templateId}`;
      for (const g of generated) {
        await q`DELETE FROM post_class_notes WHERE session_id=${g.id}`;
        await q`DELETE FROM attendance WHERE session_id=${g.id}`;
        await q`DELETE FROM bookings WHERE session_id=${g.id}`;
        await q`DELETE FROM class_sessions WHERE id=${g.id}`;
      }
      await q`DELETE FROM schedule_templates WHERE id=${state.templateId}`;
    }
    for (const c of state.cards) {
      await q`DELETE FROM card_transactions WHERE member_card_id=${c}`;
      await q`DELETE FROM member_cards WHERE id=${c}`;
    }
    if (state.cardTypeId) await q`DELETE FROM card_types WHERE id=${state.cardTypeId}`;
    if (state.courseId) await q`DELETE FROM course_categories WHERE id=${state.courseId}`;
    if (state.coachId) await q`DELETE FROM users WHERE id=${state.coachId}`;
    console.log("cleanup done", { sessions: state.sessions.length, cards: state.cards.length });
  } catch (e) { console.error("cleanup error", e.message); }
}

async function main() {
  if (!ADMIN_PASSWORD) throw new Error("缺少 S6_ADMIN_PASSWORD（或 .env.local ADMIN_PASSWORD）");
  if (!PIN36 || !PIN88) throw new Error("缺少 S6_PIN_36 / S6_PIN_88 测试会员 PIN 环境变量");
  state.cookie = await adminLogin();
  check("管理员登录", Boolean(state.cookie), "cookie ok");
  const T36 = await memberLogin("LW8801", PIN36);
  const T88 = await memberLogin("LW8864", PIN88);

  const [oldCards] = await q`SELECT COUNT(*)::int n FROM member_cards WHERE member_id IN (36,88)`;
  check("测试前 36/88 无持卡", oldCards.n === 0, `现有 ${oldCards.n}`);

  const coach = await req("/api/admin/coaches", { method: "POST", cookie: state.cookie, body: { name: "S6验收教练", email: `s6-${Date.now()}@laiwu.local`, password: "S6Coach!2026" } });
  check("创建教练", coach.status === 201, `HTTP ${coach.status}`);
  state.coachId = coach.data.id;
  const coachLogin = await req("/api/coach/login", { method: "POST", body: { email: coach.data.email, password: "S6Coach!2026" } });
  check("教练登录", coachLogin.status === 200 && coachLogin.data.token, `HTTP ${coachLogin.status}`);
  const CT = coachLogin.data.token;

  // 1 no card
  const S1 = await mkSession("2026-10-23", "10:00");
  const noCard = await book(T88, S1, "s6-nocard");
  check("无卡预约被拒绝", noCard.status === 422, `HTTP ${noCard.status} ${noCard.data.error || ""}`);

  // 2 period card
  const period = await issue(88, 1);
  const periodBook = await book(T88, S1, "s6-period");
  check("期限卡预约成功", periodBook.status === 201, `HTTP ${periodBook.status}`);
  const B88 = periodBook.data.booking.id;

  // 3 frozen / expired
  await q`UPDATE member_cards SET status='frozen' WHERE id=${period.id}`;
  const S2 = await mkSession("2026-10-23", "11:00");
  const frozen = await book(T88, S2, "s6-frozen");
  check("冻结卡预约被拒绝", frozen.status === 422, `HTTP ${frozen.status}`);
  await q`UPDATE member_cards SET status='active', valid_until='2020-01-01' WHERE id=${period.id}`;
  const expired = await book(T88, S2, "s6-expired");
  check("过期卡预约被拒绝", expired.status === 422, `HTTP ${expired.status}`);
  await q`UPDATE member_cards SET valid_until='2027-10-20' WHERE id=${period.id}`;

  const periodCheck = await req("/api/coach/check-in", { method: "POST", token: CT, body: { bookingId: B88, status: "attended" } });
  check("期限卡签到不扣次数", periodCheck.status === 200 && periodCheck.data.category === "period" && periodCheck.data.remainingCount == null, JSON.stringify(periodCheck.data));

  // 4 member36 cards: A late count, B early count, C period
  const A = await issue(36, 3);
  await q`UPDATE member_cards SET remaining_count=5, valid_until='2026-11-01' WHERE id=${A.id}`;
  const B = await issue(36, 3);
  await q`UPDATE member_cards SET remaining_count=5, valid_until='2026-10-25' WHERE id=${B.id}`;
  const C = await issue(36, 1);
  await q`UPDATE member_cards SET valid_until='2027-10-20' WHERE id=${C.id}`;

  const S3 = await mkSession("2026-10-23", "12:00");
  const book36 = await book(T36, S3, "s6-valid-count");
  check("有效次数卡预约成功", book36.status === 201, `HTTP ${book36.status}`);
  const B36 = book36.data.booking.id;
  const dup = await book(T36, S3, "s6-valid-count");
  check("重复请求不重复预约", dup.status === 200 && dup.data.duplicate === true, `HTTP ${dup.status}`);
  const [dupCount] = await q`SELECT COUNT(*)::int n FROM bookings WHERE session_id=${S3} AND member_id=36 AND status='booked'`;
  check("重复请求仅一条有效预约", dupCount.n === 1, `count ${dupCount.n}`);

  const S4 = await mkSession("2026-10-23", "13:00");
  const forged = await req("/api/portal/bookings", { method: "POST", token: T36, body: { sessionId: S4, memberId: 88, idempotencyKey: "s6-forged" } });
  check("伪造 memberId 不生效", forged.status === 201 && forged.data.booking.member_id === 36, `HTTP ${forged.status} member=${forged.data.booking?.member_id}`);

  // 7 last seat concurrency
  const S5 = await mkSession("2026-10-24", "10:00", 1);
  const [r36, r88] = await Promise.all([book(T36, S5, "s6-race36"), book(T88, S5, "s6-race88")]);
  const codes = [r36.status, r88.status].sort();
  check("两人抢最后一位不超卖", codes[0] === 201 && codes[1] === 409, `codes ${r36.status}/${r88.status}`);
  const [seat] = await q`SELECT booked_count, capacity FROM class_sessions WHERE id=${S5}`;
  check("最后一位 booked_count=1", seat.booked_count === 1 && seat.capacity === 1, JSON.stringify(seat));

  // 8/9 check-in card order
  const S6 = await mkSession("2026-10-24", "11:00");
  const b6 = await book(T36, S6, "s6-order");
  const ci6 = await req("/api/coach/check-in", { method: "POST", token: CT, body: { bookingId: b6.data.booking.id, status: "attended" } });
  check("到课签到成功", ci6.status === 200, `HTTP ${ci6.status} ${JSON.stringify(ci6.data)}`);
  const [tx6] = await q`SELECT member_card_id, amount, balance_after FROM card_transactions WHERE booking_id=${b6.data.booking.id} AND type='deduct' ORDER BY id DESC LIMIT 1`;
  check("多卡优先扣最早到期次数卡", tx6?.member_card_id === B.id, `charged card=${tx6?.member_card_id} expected=${B.id}`);
  check("次数卡余额同步 -1", tx6?.amount === -1 && tx6?.balance_after === 4, JSON.stringify(tx6));

  const note = await req("/api/coach/notes", { method: "POST", token: CT, body: { sessionId: S6, memberId: 36, content: "S6验收：核心稳定，下次先激活左侧。" } });
  check("教练写课后记录", note.status === 201, `HTTP ${note.status}`);
  const memberNotes = await req("/api/portal/notes", { token: T36 });
  check("会员端看到课后记录", memberNotes.status === 200 && memberNotes.data.notes.some((n) => n.content.includes("S6验收")), `HTTP ${memberNotes.status}`);

  // 10 concurrent check-in with only one remaining across all usable cards
  await q`UPDATE member_cards SET remaining_count=1 WHERE id=${B.id}`;
  await q`UPDATE member_cards SET status='frozen' WHERE id IN (${A.id},${C.id})`;
  const S7 = await mkSession("2026-10-25", "10:00");
  const S8 = await mkSession("2026-10-25", "11:00");
  const b7 = await book(T36, S7, "s6-ci7");
  const b8 = await book(T36, S8, "s6-ci8");
  const [c1, c2] = await Promise.all([
    req("/api/coach/check-in", { method: "POST", token: CT, body: { bookingId: b7.data.booking.id, status: "attended" } }),
    req("/api/coach/check-in", { method: "POST", token: CT, body: { bookingId: b8.data.booking.id, status: "attended" } }),
  ]);
  const ciCodes = [c1.status, c2.status].sort();
  check("并发签到余额不足不重复扣", ciCodes[0] === 200 && ciCodes[1] === 422, `codes ${c1.status}/${c2.status}`);
  const [cardB] = await q`SELECT remaining_count FROM member_cards WHERE id=${B.id}`;
  check("余额不为负", cardB.remaining_count === 0, `remaining ${cardB.remaining_count}`);
  const [txCount] = await q`SELECT COUNT(*)::int n FROM card_transactions WHERE member_card_id=${B.id} AND type='deduct' AND booking_id IN (${b7.data.booking.id},${b8.data.booking.id})`;
  check("并发签到只产生一条扣次流水", txCount.n === 1, `count ${txCount.n}`);
  await q`UPDATE member_cards SET status='active' WHERE id IN (${A.id},${C.id})`;

  // 11 cancel / rebook
  const S9 = await mkSession("2026-10-26", "10:00");
  const b9 = await book(T36, S9, "s6-cancel");
  const cancel9 = await cancel(T36, b9.data.booking.id);
  check("会员取消预约", cancel9.status === 200, `HTTP ${cancel9.status}`);
  const [seat9] = await q`SELECT booked_count FROM class_sessions WHERE id=${S9}`;
  check("取消释放名额", seat9.booked_count === 0, `booked ${seat9.booked_count}`);
  const rebook9 = await book(T36, S9, "s6-rebook");
  check("取消后可重新预约", rebook9.status === 201, `HTTP ${rebook9.status}`);

  // 12 no-show
  const S10 = await mkSession("2026-10-26", "11:00");
  const b10 = await book(T36, S10, "s6-noshow");
  const ns = await req("/api/coach/check-in", { method: "POST", token: CT, body: { bookingId: b10.data.booking.id, status: "no_show" } });
  check("教练标记未到", ns.status === 200, `HTTP ${ns.status}`);
  const [cardA] = await q`SELECT remaining_count FROM member_cards WHERE id=${A.id}`;
  check("未到扣次后余额同步", cardA.remaining_count === 4, `remaining ${cardA.remaining_count}`);

  // 12 acceptance: course CRUD
  const course = await req("/api/admin/courses", { method: "POST", cookie: state.cookie, body: { key: `s6test${Date.now()}`, name: "S6测试课", durationMinutes: 60, defaultCapacity: 4 } });
  check("新建课程类目", course.status === 201, `HTTP ${course.status}`);
  state.courseId = course.data.id;
  const editCourse = await req("/api/admin/courses", { method: "PUT", cookie: state.cookie, body: { id: course.data.id, name: "S6测试课-改", isActive: 0 } });
  check("编辑/停用课程", editCourse.status === 200 && editCourse.data.name === "S6测试课-改" && editCourse.data.is_active === 0, `HTTP ${editCourse.status}`);

  // card type + renew
  const ct = await req("/api/admin/card-types", { method: "POST", cookie: state.cookie, body: { name: `S6测试次卡${Date.now()}`, category: "count", priceCents: 10000, totalCount: 2 } });
  check("新建卡类型", ct.status === 201, `HTTP ${ct.status}`);
  state.cardTypeId = ct.data.id;
  const issued = await issue(88, ct.data.id);
  const renewed = await req("/api/admin/member-cards", { method: "PUT", cookie: state.cookie, body: { memberCardId: issued.id, addedCount: 1, idempotencyKey: "s6-renew" } });
  check("开卡后续卡", renewed.status === 200 && renewed.data.remaining_count === 3, `HTTP ${renewed.status} remaining=${renewed.data.remaining_count}`);

  // template + generate
  const tpl = await req("/api/admin/schedule/templates", { method: "POST", cookie: state.cookie, body: { courseId: 1, coachId: state.coachId, roomId: 4, weekday: 1, startTime: "09:00", capacity: 2 } });
  check("新建周模板", tpl.status === 201, `HTTP ${tpl.status}`);
  state.templateId = tpl.data.id;
  const gen = await req("/api/admin/schedule/generate", { method: "POST", cookie: state.cookie, body: { weekStart: "2026-10-26" } });
  check("用模板生成一周课", gen.status === 200 && gen.data.created >= 1, JSON.stringify(gen.data));

  // conflict warning
  const conflict = await req("/api/admin/schedule", { method: "POST", cookie: state.cookie, body: { courseCategoryId: 1, coachId: state.coachId, roomId: 4, sessionDate: "2026-10-23", startTime: "10:30", capacity: 2 } });
  check("教练/教室冲突只提示不拦截", conflict.status === 201 && conflict.data.warnings.length > 0, JSON.stringify(conflict.data.warnings || []));
  state.sessions.push(conflict.data.session.id);

  // followups + admin update visible
  const fu = await req("/api/admin/follow-ups", { cookie: state.cookie });
  check("跟进名单四类存在", fu.status === 200 && ["lowBalance", "inactive30d", "expiring", "birthdays"].every((k) => Array.isArray(fu.data[k])), `HTTP ${fu.status}`);
  await q`UPDATE member_cards SET valid_until='2026-10-31' WHERE id=${A.id}`;
  const freeze = await req("/api/admin/member-cards", { method: "PATCH", cookie: state.cookie, body: { memberCardId: A.id, action: "freeze" } });
  check("后台冻结卡写调整流水", freeze.status === 200 && freeze.data.status === "frozen", `HTTP ${freeze.status}`);
  const portalCards = await req("/api/portal/cards", { token: T36 });
  const frozenCard = portalCards.data.cards.find((c) => c.id === A.id);
  check("后台改动会员端立即可见", portalCards.status === 200 && frozenCard?.status === "frozen", `HTTP ${portalCards.status} status=${frozenCard?.status}`);
  await req("/api/admin/member-cards", { method: "PATCH", cookie: state.cookie, body: { memberCardId: A.id, action: "unfreeze" } });

  // permissions
  const noAdmin = await req("/api/admin/follow-ups");
  check("后台接口无 cookie 401", noAdmin.status === 401, `HTTP ${noAdmin.status}`);
  const memberOnCheckin = await req("/api/coach/check-in", { method: "POST", token: T36, body: { bookingId: b10.data.booking.id, status: "attended" } });
  check("member token 不能签到", memberOnCheckin.status === 401, `HTTP ${memberOnCheckin.status}`);
  const coachOnAdmin = await req("/api/admin/follow-ups", { token: CT });
  check("coach token 不能访问后台", coachOnAdmin.status === 401, `HTTP ${coachOnAdmin.status}`);

  // pages
  for (const p of ["/admin/cards", "/admin/schedule", "/admin/bookings", "/admin/followups", "/admin/coach", "/coach"]) {
    const r = await fetch(BASE + p);
    check(`页面 ${p} 可打开`, r.status === 200, `HTTP ${r.status}`);
  }
  check("health 200", (await fetch(BASE + "/api/health")).status === 200, "HTTP health");
}

try { await main(); } catch (e) { console.error(e.message); results.push({ name: "未捕获异常", ok: false, detail: e.message }); } finally { await cleanup(); }
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
