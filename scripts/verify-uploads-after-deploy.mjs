// 发版守候 + 三条上传链路实测（后台图片 / 会员手机头像 / 对比照）
// 每 30 秒探测一次；检测到新版后跑完整测试。
import fs from "node:fs";
import pg from "pg";

const BASE = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const env = fs.readFileSync(".env.local", "utf8");
const adminPwd = (env.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, "");
const dbUrl = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function adminLogin() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin", password: adminPwd }),
  });
  if (!res.ok) return "";
  return (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")])
    .map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}

async function tryAdminUpload(cookie, name) {
  const fd = new FormData();
  fd.append("file", new Blob([PNG], { type: "image/png" }), name);
  const res = await fetch(`${BASE}/api/photos`, { method: "POST", headers: { cookie }, body: fd });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, url: data.url, error: data.error };
}

const started = Date.now();
let deployed = false;
while (Date.now() - started < 25 * 60 * 1000) {
  const cookie = await adminLogin();
  if (cookie) {
    const r = await tryAdminUpload(cookie, "deploy-probe.png");
    if (r.status === 201 || r.status === 200) {
      console.log(`[部署检测] 新版已上线，后台图片上传返回 ${r.status} ${r.url}`);
      deployed = true;
      break;
    }
    console.log(`[部署检测] 仍是旧版：上传返回 ${r.status} ${r.error || ""}`);
  }
  await sleep(30000);
}
if (!deployed) { console.log("25 分钟内没等到发版"); process.exit(1); }

const cookie = await adminLogin();

// A) 后台图片上传（星星/老师/场馆/对比照共用）
const a = await tryAdminUpload(cookie, "test-admin.png");
let aServe = 0;
if (a.url) { try { aServe = (await fetch(BASE + a.url)).status; } catch {} }
console.log(`A 后台上传: ${a.status} ${a.url || a.error} | 回读 ${aServe}`);

// B) 会员手机头像上传
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
const m = (await client.query("SELECT id, portal_code, login_pin, phone FROM members WHERE id=284")).rows[0];
await client.end();
let bLine = "B 会员头像: 跳过";
if (m?.portal_code) {
  const loginRes = await fetch(`${BASE}/api/portal/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portalCode: m.portal_code, phoneSuffix: m.login_pin || "" }),
  });
  const ld = await loginRes.json().catch(() => ({}));
  if (loginRes.ok && ld.token) {
    const fd = new FormData();
    fd.append("memberId", "284");
    fd.append("file", new Blob([PNG], { type: "image/png" }), "test-member.png");
    const up = await fetch(`${BASE}/api/portal/avatar`, {
      method: "POST",
      headers: { cookie, Authorization: "Bearer " + ld.token },
      body: fd,
    });
    const ud = await up.json().catch(() => ({}));
    let serve = 0;
    if (ud.avatarUrl) { try { serve = (await fetch(BASE + ud.avatarUrl)).status; } catch {} }
    bLine = `B 会员头像: ${up.status} ${ud.avatarUrl || ud.error} | 回读 ${serve}`;
  } else {
    bLine = `B 会员头像: 登录失败 ${loginRes.status} ${ld.error || ""}`;
  }
}
console.log(bLine);

// C) 对比照：后台同一上传通道 + photo-compare 落库
const c = await tryAdminUpload(cookie, "test-compare.png");
let cServe = 0;
if (c.url) { try { cServe = (await fetch(BASE + c.url)).status; } catch {} }
console.log(`C 对比照上传: ${c.status} ${c.url || c.error} | 回读 ${cServe}`);

// D) 后台关键页面可打开
for (const p of ["/admin/team", "/admin/stars", "/admin/venue", "/admin/transformation", "/admin/members"]) {
  const r = await fetch(BASE + p, { headers: { cookie } });
  console.log(`D 页面 ${p}: ${r.status}`);
}
