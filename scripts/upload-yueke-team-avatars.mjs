// 走后台真实上传通道（/api/photos）把约刻老师头像传上服务器，再按教练名字绑头像。
// 这样不依赖静态文件发版，图片立刻可见。
// 用法：node scripts/upload-yueke-team-avatars.mjs [--apply]
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const BASE = process.env.SITE_BASE || "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const env = fs.readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const adminPwd = (env.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const apply = process.argv.includes("--apply");
const sql = neon(dbUrl);

const coaches = JSON.parse(fs.readFileSync("/tmp/yk_coaches.json", "utf8")).data.records;
const dir = "public/images/team/yueke";

async function login() {
  for (const email of ["admin", "admin@laiwu.fitness"]) {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: adminPwd }),
    });
    if (res.ok) {
      const cookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")])
        .map((c) => c.split(";")[0]).filter(Boolean);
      console.log("登录成功:", email);
      return cookies.join("; ");
    }
    console.log("登录失败:", email, res.status);
  }
  return "";
}

async function upload(cookie, filePath) {
  const buf = fs.readFileSync(filePath);
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "image/jpeg" }), path.basename(filePath));
  const res = await fetch(`${BASE}/api/photos`, { method: "POST", headers: { cookie }, body: fd });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, url: data.url, error: data.error };
}

if (!apply) {
  console.log("[dry-run] 将上传 9 张约刻老师头像并绑定到 team_members，是否登录+上传由 --apply 决定");
  const rows = await sql`SELECT name, avatar_url, is_active FROM team_members ORDER BY sort_order, id`;
  console.log(JSON.stringify(rows));
  process.exit(0);
}

const cookie = await login();
if (!cookie) { console.error("后台登录失败，密码可能只配在云端运行时环境变量里"); process.exit(1); }

const results = [];
for (const c of coaches) {
  const file = path.join(dir, `coach-${c.id}.jpg`);
  if (!fs.existsSync(file)) { console.log("缺文件", file); continue; }
  const r = await upload(cookie, file);
  console.log(`上传 ${c.nickname}: ${r.status} ${r.url || r.error || ""}`);
  if (r.url) results.push({ name: c.nickname, url: r.url });
}

if (!results.length) { console.error("没有成功上传的图片"); process.exit(1); }

requireDbWriteGuard("upload-yueke-team-avatars", dbUrl);
for (const r of results) {
  await sql`UPDATE team_members SET avatar_url = ${r.url}, is_active = 1 WHERE name = ${r.name}`;
}
const after = await sql`SELECT name, avatar_url, is_active FROM team_members WHERE is_active = 1 ORDER BY sort_order, id`;
console.log("\n在线老师：", JSON.stringify(after, null, 1));
