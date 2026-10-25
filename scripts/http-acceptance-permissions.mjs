// scripts/http-acceptance-permissions.mjs
//
// 只读 HTTP 验收脚本（不写数据库；唯一副作用是登录接口会新增一条 admin_sessions 会话行）。
// 目的：后台权限自由度改造上线后，用 HTTP 层把「页面能开、接口字段齐、未登录被拦」验一遍。
//
// 用法：
//   # 1) 默认 http://localhost:3001（先自己起服务：npm run dev 或 npx next start -p 3001）
//   node --env-file=.env.local scripts/http-acceptance-permissions.mjs
//
//   # 2) 换地址
//   BASE_URL=https://crm-xxx.sh.run.tcloudbase.com node --env-file=.env.local scripts/http-acceptance-permissions.mjs
//   node scripts/http-acceptance-permissions.mjs --base=http://localhost:3001
//
//   # 3) 不登录（不产生 admin_sessions 行）：直接给一个有效的 admin_token
//   ADMIN_COOKIE="admin_token=xxxx" node scripts/http-acceptance-permissions.mjs
//
// 账号密码：ADMIN_PASSWORD 环境变量优先，否则读 .env.local 里的 ADMIN_PASSWORD；
// 登录账号默认 admin（后台支持 admin 别名，ADMIN_EMAIL 可覆盖）。
//
// 检查项：
//   A. 页面：/admin/cards、/admin/courses 返回 200（不是重定向到登录页）
//   B. GET /api/admin/card-types：200，每行有 courseCategoryIds（数组）
//   C. GET /api/admin/courses：200，至少 5 行，每行有 key/name/is_active
//   D. GET /api/admin/member-cards：200，每行有 card_type_id
//   E. 额外权限项：不带 cookie / 带假 cookie 时，三个 GET 接口都应 401
//
// 输出：逐项 [PASS]/[FAIL] + 汇总；有失败退出码 1。服务没起会直接报「连接失败」，不重试。

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const CHECKS = [];

function parseArgs(argv) {
  const args = { base: "" };
  for (const a of argv) {
    if (a.startsWith("--base=")) args.base = a.slice("--base=".length);
    else if (a === "-h" || a === "--help") {
      console.log(
        "用法: node --env-file=.env.local scripts/http-acceptance-permissions.mjs [--base=http://localhost:3001]"
      );
      process.exit(0);
    } else if (a.startsWith("-")) {
      console.error("未知参数:", a);
      process.exit(2);
    }
  }
  return args;
}

function readEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const map = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i <= 0) continue;
    map[l.slice(0, i)] = l.slice(i + 1);
  }
  return map;
}

function record(name, pass, detail = "") {
  CHECKS.push({ name, pass, detail });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${name}${detail ? "  —— " + detail : ""}`);
}

const envFile = readEnvLocal();
const args = parseArgs(process.argv.slice(2));
const BASE = (
  args.base ||
  process.env.BASE_URL ||
  process.env.BASE ||
  "http://localhost:3001"
).replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || envFile.ADMIN_PASSWORD || "";
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || "";
const TIMEOUT_MS = 15000;

async function http(pathname, { cookie = "", method = "GET", body, headers = {} } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

function getSetCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => String(c).split(";")[0]).filter(Boolean);
}

async function login() {
  const res = await http("/api/admin/login", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const cookies = getSetCookies(res);
  if (!res.ok || !cookies.length) {
    let text = "";
    try {
      text = await res.text();
    } catch {}
    throw new Error(`登录失败 HTTP ${res.status} ${text.slice(0, 160)}（检查 ADMIN_PASSWORD 是否和服务端一致）`);
  }
  return cookies.join("; ");
}

async function getJson(pathname, cookie) {
  const res = await http(pathname, { cookie });
  let json = null;
  let text = "";
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {}
  return { res, json, text };
}

async function main() {
  console.log("=== 后台权限 HTTP 验收（只读）===");
  console.log("BASE:", BASE);
  console.log("登录账号:", ADMIN_EMAIL, ADMIN_COOKIE ? "（使用 ADMIN_COOKIE，跳过登录）" : "（用 ADMIN_PASSWORD 登录）");
  console.log("");

  // 服务在不在：先打一个轻量请求，连不上直接结束，不重试
  try {
    await http("/admin/login");
  } catch (e) {
    console.error(`[FATAL] 连不上 ${BASE}：${e?.cause?.code || e?.message || e}`);
    console.error("  先启动本地服务（npm run dev 或 npx next start -p 3001）后再跑；或用 BASE_URL 指向部署地址。");
    process.exit(1);
  }

  let cookie = ADMIN_COOKIE;
  if (!cookie) {
    try {
      cookie = await login();
      console.log("登录成功，已拿到 admin_token cookie（注意：登录会新增一行 admin_sessions）。");
    } catch (e) {
      console.error("[FATAL]", e.message);
      process.exit(1);
    }
  }
  console.log("");

  // ── A. 页面 200 ─────────────────────────────────────────────
  console.log("=== A. 后台页面 ===");
  for (const [pathname, label] of [
    ["/admin/cards", "会员卡与卡种配置页"],
    ["/admin/courses", "课程（课种）管理页"],
  ]) {
    try {
      const res = await http(pathname, { cookie });
      const finalPath = (() => {
        try {
          return new URL(res.url).pathname;
        } catch {
          return "";
        }
      })();
      const html = await res.text();
      record(
        `${pathname} 返回 200（${label}）`,
        res.status === 200 && finalPath === pathname,
        `HTTP ${res.status}，最终路径 ${finalPath || res.url}，HTML ${html.length} bytes`
      );
      if (res.status === 200 && finalPath !== pathname) {
        record(`${pathname} 没有被重定向走`, false, `最终落到 ${finalPath}（可能被登录拦截）`);
      }
    } catch (e) {
      record(`${pathname} 返回 200（${label}）`, false, e.message);
    }
  }

  // ── B. 卡种接口字段 ─────────────────────────────────────────
  console.log("\n=== B. GET /api/admin/card-types ===");
  try {
    const { res, json, text } = await getJson("/api/admin/card-types", cookie);
    const arr = Array.isArray(json) ? json : [];
    record("card-types 返回 200", res.status === 200, `HTTP ${res.status}`);
    record("card-types 返回数组", Array.isArray(json), Array.isArray(json) ? `${arr.length} 行` : `实际：${text.slice(0, 120)}`);
    const badField = arr.filter((r) => !Object.prototype.hasOwnProperty.call(r, "courseCategoryIds"));
    record(
      "card-types 每行都有 courseCategoryIds 字段",
      arr.length > 0 && badField.length === 0,
      badField.length ? `缺字段：id ${badField.map((r) => r.id).join(",")}` : ""
    );
    const badType = arr.filter((r) => !Array.isArray(r.courseCategoryIds));
    record("courseCategoryIds 是数组", arr.every((r) => Array.isArray(r.courseCategoryIds)), badType.length ? `异常 id ${badType.map((r) => r.id).join(",")}` : "");
    // 注意：card-types 走 drizzle select()，字段是 camelCase（isActive），courses 走 rawSql（is_active）
    const missingBasic = arr.filter(
      (r) => r.id === undefined || r.name === undefined || (r.is_active === undefined && r.isActive === undefined)
    );
    record(
      "card-types 每行有 id/name/is_active(isActive)",
      arr.length > 0 && missingBasic.length === 0,
      missingBasic.length ? `${missingBasic.length} 行缺字段` : ""
    );
    record("card-types 至少 11 行（基线 11，验收可新增）", arr.length >= 11, `实际 ${arr.length} 行`);
    const renamed = arr.find((r) => Number(r.id) === 4);
    if (renamed) console.log(`  [INFO] 瑜伽卡(#4) 当前名称：${renamed.name}，courseCategoryIds=${JSON.stringify(renamed.courseCategoryIds)}`);
  } catch (e) {
    record("card-types 接口可用", false, e.message);
  }

  // ── C. 课种接口字段 ─────────────────────────────────────────
  console.log("\n=== C. GET /api/admin/courses ===");
  try {
    const { res, json, text } = await getJson("/api/admin/courses", cookie);
    const arr = Array.isArray(json) ? json : [];
    record("courses 返回 200", res.status === 200, `HTTP ${res.status}`);
    record("courses 返回数组", Array.isArray(json), Array.isArray(json) ? `${arr.length} 行` : `实际：${text.slice(0, 120)}`);
    record("courses 至少 5 行（基线 5，验收可新增）", arr.length >= 5, `实际 ${arr.length} 行`);
    const missing = arr.filter(
      (r) =>
        r.key === undefined ||
        r.name === undefined ||
        (r.is_active === undefined && r.isActive === undefined)
    );
    record(
      "courses 每行有 key/name/is_active(isActive)",
      arr.length > 0 && missing.length === 0,
      missing.length ? `${missing.length} 行缺字段` : ""
    );
    const dupKeys = arr.map((r) => r.key).filter((k, i, a) => a.indexOf(k) !== i);
    record("courses 的 key 不重复", dupKeys.length === 0, dupKeys.length ? `重复：${[...new Set(dupKeys)].join(",")}` : "");
    record(
      "courses 的 key 格式合法（小写字母/数字/下划线）",
      arr.every((r) => /^[a-z0-9_]+$/.test(String(r.key))),
      ""
    );
    for (const r of arr) console.log(`  [INFO] #${r.id} ${r.key} ${r.name} ${r.is_active ? "启用" : "停用"}`);
  } catch (e) {
    record("courses 接口可用", false, e.message);
  }

  // ── D. 会员卡接口字段 ───────────────────────────────────────
  console.log("\n=== D. GET /api/admin/member-cards ===");
  try {
    const { res, json, text } = await getJson("/api/admin/member-cards", cookie);
    const arr = Array.isArray(json) ? json : [];
    record("member-cards 返回 200", res.status === 200, `HTTP ${res.status}`);
    record("member-cards 返回数组", Array.isArray(json), Array.isArray(json) ? `${arr.length} 行` : `实际：${text.slice(0, 120)}`);
    const missing = arr.filter((r) => r.card_type_id === undefined);
    record(
      "member-cards 每行都有 card_type_id",
      arr.length > 0 && missing.length === 0,
      missing.length ? `缺字段：id ${missing.map((r) => r.id).join(",")}` : ""
    );
    record(
      "member-cards 每行有 card_name / member_name",
      arr.length > 0 && arr.every((r) => r.card_name !== undefined && r.member_name !== undefined),
      ""
    );
    record("member-cards 至少 5 行（基线 5，验收可新增）", arr.length >= 5, `实际 ${arr.length} 行`);
  } catch (e) {
    record("member-cards 接口可用", false, e.message);
  }

  // ── E. 未登录 / 假 cookie 应该 401 ──────────────────────────
  console.log("\n=== E. 未登录权限拦截（额外项）===");
  for (const pathname of ["/api/admin/card-types", "/api/admin/courses", "/api/admin/member-cards"]) {
    try {
      const res = await http(pathname);
      record(`无 cookie 访问 ${pathname} 返回 401`, res.status === 401, `HTTP ${res.status}`);
    } catch (e) {
      record(`无 cookie 访问 ${pathname} 返回 401`, false, e.message);
    }
  }
  try {
    const res = await http("/api/admin/card-types", { cookie: "admin_token=invalid-token-for-acceptance" });
    record("假 admin_token 访问 card-types 返回 401", res.status === 401, `HTTP ${res.status}`);
  } catch (e) {
    record("假 admin_token 访问 card-types 返回 401", false, e.message);
  }

  // ── 汇总 ────────────────────────────────────────────────────
  const passed = CHECKS.filter((c) => c.pass).length;
  const failed = CHECKS.filter((c) => !c.pass);
  console.log("\n==========================================");
  console.log(`PASS ${passed} / ${CHECKS.length}` + (failed.length ? `，FAIL ${failed.length}` : ""));
  if (failed.length) {
    console.log("失败项:");
    failed.forEach((f) => console.log(" -", f.name + (f.detail ? `（${f.detail}）` : "")));
    console.log("==========================================");
    process.exit(1);
  }
  console.log("全部通过");
  console.log("==========================================");
}

main().catch((e) => {
  console.error("[FATAL]", e?.message || e);
  process.exit(1);
});
