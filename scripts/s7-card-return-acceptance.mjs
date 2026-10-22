/**
 * S7 退卡验收脚本（默认拒绝运行）
 *
 * 目的：验证「退卡」符合 2026-10-22 老板确认的规则：
 *   - 只有 owner 能退卡；剩余次数保留不清零；不虚构收款/退款
 *   - 退卡后仍可登录、可看历史，但不可预约/签到/写训练记录
 *   - 历史流水、照片、训练记录不被覆盖
 *   - 3 个月保留期只提醒，不自动删除
 *
 * ── 运行门槛（三重，缺一不跑）────────────────────────────
 *   S7_ALLOW_WRITE_TESTS=1      明确同意写测试数据
 *   BASE_URL=http://...         必须显式给，不默认 localhost
 *   S7_TEST_DB_CONFIRMED=1      人工确认 DATABASE_URL 指向测试库/Neon branch
 *
 * 示例：
 *   S7_ALLOW_WRITE_TESTS=1 S7_TEST_DB_CONFIRMED=1 \
 *   BASE_URL=https://s7-branch.xxx.vercel.app \
 *   node scripts/s7-card-return-acceptance.mjs
 *
 * ── 为什么必须在 branch 上跑 ────────────────────────────
 * S6 的做法是"跑完清理测试数据"，但退卡会产生 audit_logs。
 * 清理审计 = 破坏审计链，本身违反 S7 规则。所以 S7 测试只允许在
 * 临时 Neon branch 上跑，跑完丢弃整个 branch，绝不在主库上清理。
 *
 * ── 当前状态 ─────────────────────────────────────────
 * 退卡接口（POST /api/admin/member-cards/return）尚未实现（S7-B）。
 * 本脚本检测到 404 会直接跳过依赖用例并退出 0，输出「待实现」清单，
 * 用作可执行的验收规格。
 */
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import crypto from "node:crypto";

// ── 0. 门槛 ──────────────────────────────────────────
const ALLOW = process.env.S7_ALLOW_WRITE_TESTS === "1";
const CONFIRMED = process.env.S7_TEST_DB_CONFIRMED === "1";
const BASE = (process.env.BASE_URL || "").replace(/\/$/, "");

if (!ALLOW || !CONFIRMED || !BASE) {
  console.error(`
S7 退卡验收脚本 · 已拒绝运行

本脚本会向目标库写入测试会员/会员卡/预约/审计，必须显式授权：

  S7_ALLOW_WRITE_TESTS=1      同意写测试数据
  S7_TEST_DB_CONFIRMED=1      确认 DATABASE_URL 指向测试库或 Neon branch
  BASE_URL=https://...        被测服务地址（必填）

推荐做法：在 Neon 建一个临时 branch，切到该 branch 的连接串，
部署一份被测代码，跑完直接丢弃 branch。
`);
  process.exit(1);
}

const envText = fs.readFileSync(".env.local", "utf8");
const envMap = Object.fromEntries(
  envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
const DB_URL = process.env.DATABASE_URL || envMap.DATABASE_URL;
const ADMIN_PASSWORD = process.env.S7_ADMIN_PASSWORD || envMap.ADMIN_PASSWORD || "";
if (!DB_URL) { console.error("缺少 DATABASE_URL"); process.exit(1); }
if (!ADMIN_PASSWORD) { console.error("缺少 S7_ADMIN_PASSWORD / ADMIN_PASSWORD"); process.exit(1); }

const dbHost = (() => { try { return new URL(DB_URL).host; } catch { return "unknown"; } })();
console.log(`目标服务：${BASE}`);
console.log(`目标数据库 host：${dbHost}（密码已隐藏）`);
console.log("开始前 5 秒可 Ctrl-C 中止…\n");
await new Promise((r) => setTimeout(r, 5000));

const baseSql = neon(DB_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(strings, ...values) {
  let last;
  for (let i = 0; i < 4; i++) {
    try { return await baseSql(strings, ...values); }
    catch (e) { last = e; await sleep(400 * (i + 1)); }
  }
  throw last;
}

// ── 1. 结果收集 ───────────────────────────────────────
const results = [];
let skipped = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) throw new Error(`FAILED: ${name} ${detail}`);
}
function skip(name, reason) {
  skipped.push({ name, reason });
  console.log(`SKIP  ${name}  <${reason}>`);
}
function fatal(msg) {
  results.push({ name: "FATAL", ok: false, detail: msg });
  console.log(`FAIL  FATAL  ${msg}`);
  throw new Error(msg);
}

// ── 2. HTTP ──────────────────────────────────────────
async function req(path, { method = "GET", token, cookie, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  let res;
  for (let i = 0; i < 3; i++) {
    try {
      res = await fetch(BASE + path, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
      break;
    } catch (e) { if (i === 2) throw e; await sleep(500); }
  }
  let data = {};
  try { data = await res.json(); } catch { /* 非 JSON */ }
  return { status: res.status, data };
}
function cookieFrom(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  return list.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}
async function adminLogin(email, password) {
  const res = await fetch(BASE + "/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return cookieFrom(res);
}

// ── 3. 环境 ──────────────────────────────────────────
const uid = crypto.randomBytes(4).toString("hex");
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

const created = { members: [], cards: [], sessions: [], users: [] };

async function main() {
  console.log("── 准备测试数据 ──");

  const [countType] = await q`SELECT id, name, total_count FROM card_types
    WHERE tenant_id = 1 AND is_active = 1 AND category = 'count' ORDER BY id LIMIT 1`;
  const [periodType] = await q`SELECT id, name FROM card_types
    WHERE tenant_id = 1 AND is_active = 1 AND category = 'period' ORDER BY id LIMIT 1`;
  if (!countType) fatal("库里没有可用的次数卡类型，无法测试");

  const [room] = await q`SELECT id FROM rooms WHERE tenant_id = 1 ORDER BY id LIMIT 1`;
  const [course] = await q`SELECT id FROM course_categories WHERE tenant_id = 1 ORDER BY id LIMIT 1`;
  if (!room || !course) fatal("缺少教室或课程类目");

  // 会员：刻意不给手机号 → 登录走 6 位 PIN 分支
  const PIN = "987654";
  const mkMember = async (tag) => {
    const code = `S7${tag}${uid}`.toUpperCase().slice(0, 16);
    const [row] = await q`
      INSERT INTO members (tenant_id, name, member_code, phone, status, portal_code, portal_enabled, login_pin, joined_at)
      VALUES (1, ${"S7测试-" + tag}, ${"S7" + tag + uid}, NULL, 'active', ${code}, 1, ${PIN}, ${today()})
      RETURNING id`;
    created.members.push(row.id);
    return { id: row.id, code };
  };
  const A = await mkMember("A");   // 主测：退卡
  const B = await mkMember("B");   // 多卡 / 对照

  // owner（环境变量管理员）+ manager（SQL 造，登录支持明文比对）
  const ownerCookie = await adminLogin("admin", ADMIN_PASSWORD);
  if (!ownerCookie) fatal("owner 登录失败，检查 ADMIN_PASSWORD");

  const managerEmail = `s7-manager-${uid}@laiwu.local`;
  const managerPass = `S7mgr-${uid}`;
  const [mgrRow] = await q`
    INSERT INTO users (tenant_id, name, email, password_hash, role, status)
    VALUES (1, ${"S7经理"}, ${managerEmail}, ${managerPass}, 'manager', 'active')
    RETURNING id`;
  created.users.push(mgrRow.id);
  const managerCookie = await adminLogin(managerEmail, managerPass);
  if (!managerCookie) fatal("manager 登录失败（用于验证 403）");

  // 教练
  const coachEmail = `s7-coach-${uid}@laiwu.local`;
  const coachPass = `S7coach-${uid}`;
  const coachRes = await req("/api/admin/coaches", {
    method: "POST", cookie: ownerCookie,
    body: { name: "S7教练", email: coachEmail, password: coachPass },
  });
  if (coachRes.status !== 201) fatal(`创建教练失败 HTTP ${coachRes.status}`);
  created.users.push(coachRes.data.id);
  const coachLogin = await req("/api/coach/login", { method: "POST", body: { email: coachEmail, password: coachPass } });
  if (coachLogin.status !== 200) fatal(`教练登录失败 HTTP ${coachLogin.status}`);
  const coachToken = coachLogin.data.token;
  const coachId = coachLogin.data.coachId;

  // 排课（2 天后，避开 2 小时截止与 7 天上限）
  const sessionDate = plusDays(2);
  const mkSession = async (start) => {
    const r = await req("/api/admin/schedule", {
      method: "POST", cookie: ownerCookie,
      body: { courseCategoryId: course.id, coachId, roomId: room.id, sessionDate, startTime: start, capacity: 2 },
    });
    if (r.status !== 201) fatal(`排课失败 HTTP ${r.status} ${JSON.stringify(r.data)}`);
    created.sessions.push(r.data.session.id);
    return r.data.session.id;
  };
  const sessA = await mkSession("10:00");
  const sessB = await mkSession("14:00");

  // 会员登录
  const loginMember = async (m) => {
    const r = await req("/api/portal/login", { method: "POST", body: { portalCode: m.code, phoneSuffix: PIN } });
    if (r.status !== 200 || !r.data.token) fatal(`会员登录失败 ${m.code} HTTP ${r.status}`);
    return r.data.token;
  };
  const tokA = await loginMember(A);
  const tokB = await loginMember(B);

  // 开卡（走真实接口，顺带验证幂等基础）
  const openCard = async (memberId, cardTypeId, key) => {
    const r = await req("/api/admin/member-cards", {
      method: "POST", cookie: ownerCookie,
      body: { memberId, cardTypeId, idempotencyKey: key },
    });
    if (![200, 201].includes(r.status)) fatal(`开卡失败 HTTP ${r.status} ${JSON.stringify(r.data)}`);
    created.cards.push(r.data.id);
    return r.data;
  };
  const cardA = await openCard(A.id, countType.id, `s7-open-A-${uid}`);
  const cardB1 = await openCard(B.id, countType.id, `s7-open-B1-${uid}`);
  const cardB2 = periodType ? await openCard(B.id, periodType.id, `s7-open-B2-${uid}`) : null;

  // 退卡前先预约（否则退卡后无法创建 booking，测不到"签到应被拒"）
  const book = async (tok, sessionId, key) =>
    req("/api/portal/bookings", { method: "POST", token: tok, body: { sessionId, idempotencyKey: key } });
  const bookA = await book(tokA, sessA, `s7-book-A-${uid}`);
  if (bookA.status !== 201) fatal(`退卡前预约失败 HTTP ${bookA.status} ${JSON.stringify(bookA.data)}`);
  const bookingA = bookA.data.booking.id;

  // ── 4. 退卡接口探测 ────────────────────────────────
  console.log("\n── 退卡接口 ──");
  const retPath = "/api/admin/member-cards/return";
  const probeKey = `s7-ret-A-${uid}`;
  const retA = await req(retPath, {
    method: "POST", cookie: ownerCookie,
    body: { memberCardId: cardA.id, reason: "S7 自动测试退卡", idempotencyKey: probeKey },
  });
  const FEATURE_READY = retA.status !== 404 && retA.status !== 405;

  if (!FEATURE_READY) {
    console.log("检测到退卡接口未实现（S7-B 待做），以下用例按规格跳过。\n");
    const names = [
      "退卡 200 + status=returned", "剩余次数保留不清零", "写 return_freeze 流水（amount=0）",
      "写审计（含操作人/前后快照/原因）", "重复 idempotencyKey 幂等", "并发同 key 只写一次",
      "manager 退卡 403", "coach token 退卡 401", "无 cookie 退卡 401",
      "退卡后预约 422 且文案含退卡", "退卡后教练签到 422", "退卡后仍可登录",
      "退卡后我的卡显示 returned", "退卡后历史资料可读", "退卡后写训练感受被拒",
      "退卡后仍可取消自己的预约", "退卡不自动取消未来预约", "退卡后新开卡可再预约",
      "退卡后冻结该卡 409", "多卡会员只退一张另一张可用", "期限卡退卡不虚构次数",
      "frozen 卡可退卡", "历史流水不被覆盖", "到期提醒 returned_retention_due", "到期不自动删除",
    ];
    names.forEach((n) => skip(n, "S7-B 未实现"));
    return finish(true);
  }

  // ── 5. 退卡核心 ────────────────────────────────────
  const [before] = await q`SELECT * FROM member_cards WHERE id = ${cardA.id}`;
  check("退卡 200", retA.status === 200, `HTTP ${retA.status}`);
  const [afterCard] = await q`SELECT * FROM member_cards WHERE id = ${cardA.id}`;
  check("退卡后 status=returned", afterCard?.status === "returned", `status=${afterCard?.status}`);
  check("剩余次数保留不清零", Number(afterCard.remaining_count) === Number(before.remaining_count),
    `${before.remaining_count} → ${afterCard.remaining_count}`);
  check("卡项信息不变", Number(afterCard.total_count) === Number(before.total_count) &&
    Number(afterCard.card_type_id) === Number(before.card_type_id));

  const txReturn = await q`SELECT * FROM card_transactions
    WHERE member_card_id = ${cardA.id} AND type = 'return_freeze' ORDER BY id DESC`;
  check("写 return_freeze 流水", txReturn.length === 1, `count=${txReturn.length}`);
  check("退卡流水 amount=0（不虚构退款金额）", Number(txReturn[0]?.amount) === 0, `amount=${txReturn[0]?.amount}`);
  check("退卡流水 balance_after=退卡时余额",
    Number(txReturn[0]?.balance_after) === Number(before.remaining_count));

  const audits = await q`SELECT * FROM audit_logs
    WHERE action = 'member_card.return' AND entity_id = ${cardA.id} ORDER BY id DESC`;
  check("写审计 1 条", audits.length === 1, `count=${audits.length}`);
  check("审计有操作人", Boolean(audits[0]?.actor_type) && audits[0]?.actor_id != null);
  check("审计有前后快照", Boolean(audits[0]?.before_json) && Boolean(audits[0]?.after_json));
  check("审计有原因", Boolean(audits[0]?.reason || audits[0]?.after_json?.includes("退卡")));

  check("不虚构支付/退款状态", !("payment_status" in (afterCard || {})) && !("refunded" in (afterCard || {})));

  const [memberRow] = await q`SELECT freeze_status, status, portal_enabled FROM members WHERE id = ${A.id}`;
  check("退卡不改会员账户（仍可登录）", memberRow?.portal_enabled === 1 && memberRow?.status !== "archived");
  check("退卡不设会员级冻结", !memberRow?.freeze_status || memberRow.freeze_status === "normal",
    `freeze_status=${memberRow?.freeze_status}`);

  // 幂等
  const retA2 = await req(retPath, {
    method: "POST", cookie: ownerCookie,
    body: { memberCardId: cardA.id, reason: "S7 自动测试退卡", idempotencyKey: probeKey },
  });
  check("重复退卡幂等 200", retA2.status === 200, `HTTP ${retA2.status}`);
  const txReturn2 = await q`SELECT count(*)::int n FROM card_transactions
    WHERE member_card_id = ${cardA.id} AND type = 'return_freeze'`;
  check("幂等不重复写流水", txReturn2[0].n === 1, `count=${txReturn2[0].n}`);
  const audits2 = await q`SELECT count(*)::int n FROM audit_logs
    WHERE action = 'member_card.return' AND entity_id = ${cardA.id}`;
  check("幂等不重复写审计", audits2[0].n === 1, `count=${audits2[0].n}`);

  // 并发同 key（换一张新卡）
  const cardC = await openCard(A.id, countType.id, `s7-open-C-${uid}`);
  const concKey = `s7-ret-C-${uid}`;
  const [c1, c2] = await Promise.all([
    req(retPath, { method: "POST", cookie: ownerCookie, body: { memberCardId: cardC.id, reason: "并发测试", idempotencyKey: concKey } }),
    req(retPath, { method: "POST", cookie: ownerCookie, body: { memberCardId: cardC.id, reason: "并发测试", idempotencyKey: concKey } }),
  ]);
  check("并发退卡两次都 200", c1.status === 200 && c2.status === 200, `${c1.status}/${c2.status}`);
  const txC = await q`SELECT count(*)::int n FROM card_transactions WHERE member_card_id = ${cardC.id} AND type = 'return_freeze'`;
  check("并发只写 1 条退卡流水", txC[0].n === 1, `count=${txC[0].n}`);

  // ── 6. 权限 ────────────────────────────────────────
  console.log("\n── 权限 ──");
  const cardD = await openCard(B.id, countType.id, `s7-open-D-${uid}`);
  const mgrRet = await req(retPath, {
    method: "POST", cookie: managerCookie,
    body: { memberCardId: cardD.id, reason: "manager 越权", idempotencyKey: `s7-ret-mgr-${uid}` },
  });
  check("manager 退卡 403", mgrRet.status === 403, `HTTP ${mgrRet.status}`);

  const coachRet = await req(retPath, {
    method: "POST", token: coachToken,
    body: { memberCardId: cardD.id, reason: "coach 越权", idempotencyKey: `s7-ret-coach-${uid}` },
  });
  check("coach token 退卡 401", coachRet.status === 401, `HTTP ${coachRet.status}`);

  const anonRet = await req(retPath, {
    method: "POST", body: { memberCardId: cardD.id, reason: "匿名", idempotencyKey: `s7-ret-anon-${uid}` },
  });
  check("无 cookie 退卡 401", anonRet.status === 401, `HTTP ${anonRet.status}`);

  const [cardDAfter] = await q`SELECT status FROM member_cards WHERE id = ${cardD.id}`;
  check("越权请求未改动卡状态", cardDAfter.status === "active", `status=${cardDAfter.status}`);

  // ── 7. 退卡后行为 ──────────────────────────────────
  console.log("\n── 退卡后 ──");
  const bookAfter = await book(tokA, sessB, `s7-book-after-${uid}`);
  check("退卡后预约 422", bookAfter.status === 422, `HTTP ${bookAfter.status}`);
  check("退卡文案可区分（含退卡）", String(bookAfter.data?.error || "").includes("退卡"),
    `error=${bookAfter.data?.error}`);

  const ci = await req("/api/coach/check-in", {
    method: "POST", token: coachToken,
    body: { bookingId: bookingA, status: "attended" },
  });
  check("退卡后教练签到被拒", ci.status === 422 || ci.status === 409, `HTTP ${ci.status}`);
  const [att] = await q`SELECT count(*)::int n FROM attendance WHERE session_id = ${sessA} AND member_id = ${A.id}`;
  check("退卡后不产生考勤", att.n === 0, `attendance=${att.n}`);

  const relogin = await req("/api/portal/login", { method: "POST", body: { portalCode: A.code, phoneSuffix: PIN } });
  check("退卡后仍可登录", relogin.status === 200 && Boolean(relogin.data.token), `HTTP ${relogin.status}`);
  const tokA2 = relogin.data.token;

  const myCards = await req("/api/portal/cards", { token: tokA2 });
  const cardAView = (myCards.data?.cards || []).find((c) => c.id === cardA.id);
  check("退卡后我的卡显示 returned", cardAView?.status === "returned", `status=${cardAView?.status}`);
  check("我的卡仍展示剩余次数", Number(cardAView?.remainingCount) === Number(before.remaining_count));
  check("我的卡有退卡时间", Boolean(cardAView?.returnedAt));
  if (cardAView?.retentionUntil === undefined) skip("我的卡返回 retentionUntil", "S7-B 未返回该字段");

  for (const p of ["/api/portal/track", "/api/portal/growth-story", "/api/portal/archive", "/api/portal/notes", "/api/portal/photo-compare", "/api/portal/coach-notes"]) {
    const r = await req(p, { token: tokA2 });
    check(`退卡后历史资料可读 ${p}`, r.status === 200, `HTTP ${r.status}`);
  }

  const feel = await req("/api/portal/training-feelings", {
    method: "POST", token: tokA2, body: { memberId: A.id, feeling: "退卡后不应能写训练感受" },
  });
  check("退卡后写训练感受被拒", feel.status === 403 || feel.status === 409, `HTTP ${feel.status}`);

  const [bookingStill] = await q`SELECT status FROM bookings WHERE id = ${bookingA}`;
  check("退卡不自动取消未来预约", bookingStill?.status === "booked", `status=${bookingStill?.status}`);

  const cancel = await req("/api/portal/bookings/cancel", {
    method: "POST", token: tokA2, body: { bookingId: bookingA },
  });
  check("退卡后仍可取消自己的预约", cancel.status === 200, `HTTP ${cancel.status}`);

  // 已确认：退卡不提供恢复，继续消费走新开卡
  const newCard = await openCard(A.id, countType.id, `s7-open-A2-${uid}`);
  const [oldCardAfterNew] = await q`SELECT status, remaining_count FROM member_cards WHERE id = ${cardA.id}`;
  check("新开卡不改旧卡状态与余额",
    oldCardAfterNew.status === "returned" && Number(oldCardAfterNew.remaining_count) === Number(before.remaining_count),
    `status=${oldCardAfterNew.status} remain=${oldCardAfterNew.remaining_count}`);
  const bookNew = await book(tokA2, sessB, `s7-book-newcard-${uid}`);
  check("退卡后新开卡可再预约", bookNew.status === 201 || bookNew.status === 200, `HTTP ${bookNew.status}`);

  const freezeReturned = await req("/api/admin/member-cards", {
    method: "PATCH", cookie: ownerCookie, body: { memberCardId: cardA.id, action: "freeze" },
  });
  check("已退卡不能被冻结覆盖 409", freezeReturned.status === 409, `HTTP ${freezeReturned.status}`);
  const [cardAStatus] = await q`SELECT status FROM member_cards WHERE id = ${cardA.id}`;
  check("状态仍为 returned", cardAStatus.status === "returned", `status=${cardAStatus.status}`);

  // ── 8. 多卡与状态来源 ───────────────────────────────
  console.log("\n── 多卡 / 冻结源状态 ──");
  if (cardB2) {
    const retB1 = await req(retPath, {
      method: "POST", cookie: ownerCookie,
      body: { memberCardId: cardB1.id, reason: "多卡测试退一张", idempotencyKey: `s7-ret-B1-${uid}` },
    });
    check("多卡退一张 200", retB1.status === 200, `HTTP ${retB1.status}`);
    const bookB = await book(tokB, sessB, `s7-book-B-${uid}`);
    check("另一张 active 卡仍可预约", bookB.status === 201 || bookB.status === 200, `HTTP ${bookB.status}`);
  } else {
    skip("多卡会员只退一张另一张可用", "库里无期限卡类型");
  }

  // frozen → returned
  const cardE = await openCard(B.id, countType.id, `s7-open-E-${uid}`);
  const freezeE = await req("/api/admin/member-cards", {
    method: "PATCH", cookie: ownerCookie, body: { memberCardId: cardE.id, action: "freeze" },
  });
  check("冻结一张卡 200", freezeE.status === 200, `HTTP ${freezeE.status}`);
  const [frozenE] = await q`SELECT remaining_count FROM member_cards WHERE id = ${cardE.id}`;
  const retE = await req(retPath, {
    method: "POST", cookie: ownerCookie,
    body: { memberCardId: cardE.id, reason: "冻结卡退卡", idempotencyKey: `s7-ret-E-${uid}` },
  });
  check("frozen 卡可退卡 200", retE.status === 200, `HTTP ${retE.status}`);
  const [retEAfter] = await q`SELECT status, remaining_count FROM member_cards WHERE id = ${cardE.id}`;
  check("frozen → returned 且余额保留",
    retEAfter.status === "returned" && Number(retEAfter.remaining_count) === Number(frozenE.remaining_count),
    `status=${retEAfter.status} ${frozenE.remaining_count}→${retEAfter.remaining_count}`);

  // ── 9. 历史不被覆盖 ────────────────────────────────
  console.log("\n── 历史数据 ──");
  const txHistory = await q`SELECT * FROM card_transactions
    WHERE member_card_id = ${cardA.id} AND type <> 'return_freeze' ORDER BY id`;
  check("退卡前的开卡流水仍在", txHistory.length >= 1, `count=${txHistory.length}`);
  check("开卡流水金额未被改写", Number(txHistory[0].amount) === Number(before.remaining_count),
    `amount=${txHistory[0].amount}`);

  // ── 10. 3 个月保留 ─────────────────────────────────
  console.log("\n── 3 个月保留 ──");
  // 表名不能参数化，这里用白名单固定语句
  const counts = {};
  for (const [label, sql] of [
    ["photos", () => q`SELECT count(*)::int n FROM photos`],
    ["trainings", () => q`SELECT count(*)::int n FROM trainings`],
    ["attendance", () => q`SELECT count(*)::int n FROM attendance`],
    ["card_transactions", () => q`SELECT count(*)::int n FROM card_transactions`],
    ["bookings", () => q`SELECT count(*)::int n FROM bookings`],
  ]) {
    const [r] = await sql();
    counts[label] = r.n;
  }

  // 把退卡时间拨回 4 个月前，制造"保留期已满"
  await q`UPDATE member_cards SET returned_at = NOW() - INTERVAL '4 months' WHERE id = ${cardA.id}`;
  const follow = await req("/api/admin/follow-ups", { cookie: ownerCookie });
  if (follow.status === 200) {
    const list = JSON.stringify(follow.data);
    check("到期名单出现 returned_retention_due", list.includes("returned_retention_due"));
    check("到期名单含该会员", list.includes(String(A.id)));
  } else {
    skip("到期提醒 returned_retention_due", `S7-C 未实现 HTTP ${follow.status}`);
  }

  const counts2 = {};
  for (const [label, sql] of [
    ["photos", () => q`SELECT count(*)::int n FROM photos`],
    ["trainings", () => q`SELECT count(*)::int n FROM trainings`],
    ["attendance", () => q`SELECT count(*)::int n FROM attendance`],
    ["card_transactions", () => q`SELECT count(*)::int n FROM card_transactions`],
    ["bookings", () => q`SELECT count(*)::int n FROM bookings`],
  ]) {
    const [r] = await sql();
    counts2[label] = r.n;
  }
  for (const k of Object.keys(counts)) {
    check(`到期不自动删除 ${k}`, counts2[k] === counts[k], `${counts[k]} → ${counts2[k]}`);
  }

  // 退卡后仍可登录（到期后也一样）
  const relogin2 = await req("/api/portal/login", { method: "POST", body: { portalCode: A.code, phoneSuffix: PIN } });
  check("保留期满后仍可登录（不自动停号）", relogin2.status === 200, `HTTP ${relogin2.status}`);

  return finish(false);
}

function finish(allSkipped) {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log("\n" + "─".repeat(60));
  console.log(`结果：${pass} 通过 / ${fail} 失败 / ${skipped.length} 跳过`);
  if (skipped.length) {
    console.log("\n跳过项：");
    skipped.forEach((s) => console.log(`  - ${s.name}  <${s.reason}>`));
  }
  console.log("\n本次创建的测试数据（branch 用，跑完请直接丢弃 branch）：");
  console.log(`  会员 id: ${created.members.join(", ") || "-"}`);
  console.log(`  会员卡 id: ${created.cards.join(", ") || "-"}`);
  console.log(`  课次 id: ${created.sessions.join(", ") || "-"}`);
  console.log(`  用户 id: ${created.users.join(", ") || "-"}`);
  console.log("\n注意：脚本不删除任何数据（退卡会产生审计，清理审计等于破坏审计链）。");
  if (allSkipped) {
    console.log("状态：退卡接口未实现，本次仅校验运行门槛与规格清单。");
    process.exit(0);
  }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\n脚本中断：", e?.message || e);
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n结果：${pass} 通过 / ${results.length - pass} 失败 / ${skipped.length} 跳过`);
  process.exit(1);
});
