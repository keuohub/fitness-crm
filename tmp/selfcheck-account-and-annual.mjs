// tmp/selfcheck-account-and-annual.mjs
// 本轮小调整自测：小桥后台全权限 + 教练身份保留 + 年卡身份标识接口 + 年卡一卡通限次清空
// 会写一条测试会员卡（会员 10 开年卡一卡通），跑完用 rollback-card-config.mjs 回滚。

import fs from "node:fs";
import crypto from "node:crypto";

const BASE = "http://localhost:3001";
const fails = [];
const oks = [];
const ok = (cond, label, extra = "") => {
  if (cond) {
    oks.push(label);
    console.log(`  [PASS] ${label}${extra ? "  —— " + extra : ""}`);
  } else {
    fails.push(label);
    console.log(`  [FAIL] ${label}${extra ? "  —— " + extra : ""}`);
  }
};

const env = fs.readFileSync(".env.local", "utf8");
const getEnv = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim();
const adminPw = getEnv("ADMIN_PASSWORD");
const memberSecret = getEnv("MEMBER_TOKEN_SECRET") || getEnv("COOKIE_SIGN_KEY");

const accountFile = fs.readFileSync("/Users/qiao/Documents/徕舞工作/徕舞后台入口/后台账号密码.txt", "utf8");
const xqBlock = accountFile.split("小桥的后台账号")[1] || "";
const xqPw = (xqBlock.match(/密码：(\S+)/) || [])[1];

async function login(email, password) {
  const r = await fetch(BASE + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get("set-cookie")])
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return { status: r.status, cookie };
}
const adminFetch = (cookie) => async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { Cookie: cookie, "Content-Type": "application/json", ...(init.headers || {}) } });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const mintMemberToken = (memberId) => {
  const exp = Date.now() + 7 * 86400_000;
  const payload = `${memberId}.${exp}`;
  const sig = crypto.createHmac("sha256", memberSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
};
const memberFetch = async (path) => {
  const r = await fetch(BASE + path, { headers: { Authorization: "Bearer " + mintMemberToken(10) } });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

async function main() {
  console.log("=== 0. 账号 ===");
  ok(!!xqPw, "从账号密码文件读到小桥新密码");
  const boss = await login("admin", adminPw);
  ok(boss.status === 200, "店长账号（admin）后台登录", `HTTP ${boss.status}`);
  const xq = await login("xiaoqiao@laiwu.com", xqPw);
  ok(xq.status === 200, "小桥账号后台登录", `HTTP ${xq.status}`);
  if (!boss.cookie || !xq.cookie) throw new Error("登录失败，终止自测");

  const bossApi = adminFetch(boss.cookie);
  const xqApi = adminFetch(xq.cookie);

  console.log("\n=== 1. 小桥后台全权限 ===");
  for (const p of ["/admin/cards", "/admin/courses", "/admin/members", "/admin/settings/users"]) {
    const r = await fetch(BASE + p, { headers: { Cookie: xq.cookie }, redirect: "manual" });
    ok(r.status === 200, `小桥可打开 ${p}`, `HTTP ${r.status}`);
  }
  const users = await xqApi("/api/admin/users");
  const xqRow = (users.data || []).find((u) => u.email === "xiaoqiao@laiwu.com");
  ok(xqRow?.role === "owner", "小桥后台角色为 owner（全权限）", JSON.stringify(xqRow && { role: xqRow.role }));
  // manager 级接口：开卡接口鉴权通过（参数缺失返回 400 而不是 403）
  const openPerm = await xqApi("/api/admin/member-cards", { method: "POST", body: JSON.stringify({}) });
  ok(openPerm.status === 400, "小桥可以执行开卡等店长级操作（不是 403）", `HTTP ${openPerm.status} ${openPerm.data.error || ""}`);
  // owner 级接口：用户管理（PATCH 自己的角色是危险操作，这里只验证能读）
  ok(users.status === 200, "小桥可以访问用户管理接口");

  console.log("\n=== 2. 教练身份与教练端保留 ===");
  const coaches = await bossApi("/api/admin/coaches");
  const names = (coaches.data || []).map((c) => c.name).join("、");
  ok(names.includes("小桥") && names.includes("嘉敏"), "教练下拉仍包含小桥与嘉敏", names);
  ok(!names.includes("管理员"), "管理员账号不会混进教练下拉", names);
  const coachLogin = await fetch(BASE + "/api/coach/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "xiaoqiao@laiwu.com", password: xqPw }),
  });
  const coachData = await coachLogin.json().catch(() => ({}));
  ok(coachLogin.status === 200 && coachData.token, "小桥仍能登录教练端（同一密码）", `HTTP ${coachLogin.status}`);
  if (coachData.token) {
    const roster = await fetch(BASE + "/api/coach/sessions", { headers: { Authorization: "Bearer " + coachData.token } });
    ok(roster.status === 200, "教练端接口可用（教练令牌通过鉴权）", `HTTP ${roster.status}`);
  }

  console.log("\n=== 3. 年卡一卡通每周限次已清空 ===");
  const types = await bossApi("/api/admin/card-types");
  const year = (types.data || []).find((t) => t.id === 8);
  ok(year?.weeklyLimit === null, "年卡一卡通 weeklyLimit 为空（列表不再显示每周限次）", `weeklyLimit=${year?.weeklyLimit}`);
  ok(year?.isActive === 1 && year?.category === "period" && year?.validityDays === 365, "年卡一卡通仍是 365 天期限卡且启用");

  console.log("\n=== 4. 年卡身份标识接口（会员端数据源）===");
  const before = await memberFetch("/api/portal/cards");
  const yoga = (before.data.cards || []).find((c) => Number(c.cardTypeId) === 4);
  ok(yoga && yoga.isAnnualCard === false, "普通次数卡 isAnnualCard=false", `yoga=${yoga && yoga.isAnnualCard}`);
  const issue = await xqApi("/api/admin/member-cards", {
    method: "POST",
    body: JSON.stringify({ memberId: 10, cardTypeId: 8, validityDays: 365, priceCents: 980000, idempotencyKey: `selfcheck-annual-${Date.now()}` }),
  });
  ok(issue.status === 201, "给会员 10 开一张年卡一卡通（测试用，之后回滚）", `memberCardId=${issue.data.id}`);
  const after = await memberFetch("/api/portal/cards");
  const annual = (after.data.cards || []).find((c) => Number(c.cardTypeId) === 8);
  ok(!!annual, "会员端我的卡出现年卡一卡通");
  ok(annual?.isAnnualCard === true, "年卡一卡通 isAnnualCard=true（小程序显示徽章与金色身份条）");
  ok(annual?.category === "period", "年卡一卡通是期限卡（剩余显示不限次）");
  console.log("       年卡可约：", (annual?.courseCategoryNames || []).join(" · "));

  console.log("\n==========================================");
  console.log(`PASS ${oks.length} / ${oks.length + fails.length}`);
  if (fails.length) {
    console.log("FAIL 项：");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
  console.log("全部通过（测试会员卡未清理，下一步跑 rollback 回滚）");
}

main().catch((e) => {
  console.error("自测失败：", e);
  process.exit(1);
});
