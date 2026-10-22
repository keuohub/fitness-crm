// 用后台管理员身份走 /api/portal/avatar 的图片落盘通道（public/member-avatars 可写），
// 拿到 9 张约刻老师头像的服务器 URL，再按教练名字绑到 team_members 并上线。
// 属性：临时借测试会员 284 的字段落盘，结束后把该会员头像还原为 NULL。
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const BASE = process.env.SITE_BASE || "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const env = fs.readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const adminPwd = (env.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(dbUrl);
const coaches = JSON.parse(fs.readFileSync("/tmp/yk_coaches.json", "utf8")).data.records;
const dir = "public/images/team/yueke";

const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin", password: adminPwd }),
});
if (!loginRes.ok) { console.error("登录失败", loginRes.status); process.exit(1); }
const cookie = (loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")])
  .map((c) => c.split(";")[0]).filter(Boolean).join("; ");
console.log("管理员登录成功");

const results = [];
for (const c of coaches) {
  const file = path.join(dir, `coach-${c.id}.jpg`);
  if (!fs.existsSync(file)) { console.log("缺文件", file); continue; }
  const buf = fs.readFileSync(file);
  const fd = new FormData();
  fd.append("memberId", "284");
  fd.append("file", new Blob([buf], { type: "image/jpeg" }), path.basename(file));
  const res = await fetch(`${BASE}/api/portal/avatar`, { method: "POST", headers: { cookie }, body: fd });
  const data = await res.json().catch(() => ({}));
  console.log(`上传 ${c.nickname}: ${res.status} ${data.avatarUrl || data.error || ""}`);
  if (data.avatarUrl) results.push({ name: c.nickname, url: data.avatarUrl });
}

if (results.length !== coaches.length) {
  console.error(`只成功 ${results.length}/${coaches.length}，已中止不写库`);
  process.exit(1);
}

requireDbWriteGuard("bind-yueke-avatars", dbUrl);
for (const r of results) {
  await sql`UPDATE team_members SET avatar_url = ${r.url}, is_active = 1 WHERE name = ${r.name}`;
}
// 还原测试会员头像
await sql`UPDATE members SET avatar_url = NULL, updated_at = NOW() WHERE id = 284`;

const after = await sql`SELECT name, avatar_url, is_active FROM team_members WHERE is_active = 1 ORDER BY sort_order, id`;
console.log("\n在线老师：");
for (const r of after) console.log(` ${r.name} -> ${r.avatar_url}`);
