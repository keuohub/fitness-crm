// 发版成功后执行：点亮约刻 9 位老师 + 小桥换新头像
// 用法：ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 node scripts/activate-yueke-team.mjs --apply
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sql = neon(url);
const apply = process.argv.includes("--apply");
if (apply) requireDbWriteGuard("activate-yueke-team", url);

const coaches = JSON.parse(fs.readFileSync("/tmp/yk_coaches.json", "utf8")).data.records;

if (!apply) {
  const rows = await sql`SELECT id,name,is_active,avatar_url FROM team_members ORDER BY sort_order,id`;
  console.log("[dry-run] 当前：", rows.map((r) => `${r.name}(${r.is_active ? "在线" : "下线"})`).join(" "));
  console.log("将执行：把约刻 9 位老师置为在线，小桥头像切到 /images/team/yueke/coach-11445.jpg");
  process.exit(0);
}

for (const c of coaches) {
  const avatar = `/images/team/yueke/coach-${c.id}.jpg`;
  await sql`UPDATE team_members SET is_active = 1, avatar_url = ${avatar} WHERE name = ${c.nickname}`;
}
const after = await sql`SELECT name,is_active,avatar_url FROM team_members WHERE is_active = 1 ORDER BY sort_order,id`;
console.log("当前在线老师：", JSON.stringify(after));
