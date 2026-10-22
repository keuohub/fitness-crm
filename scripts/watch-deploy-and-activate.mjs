// 守候云托管发版：一旦新静态图可访问，立刻把约刻 9 位老师点亮。
// 由 bash 后台任务运行，最多守 40 分钟。
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const BASE = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const PROBE = `${BASE}/images/team/yueke/coach-11445.jpg`;
const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sql = neon(url);
const coaches = JSON.parse(fs.readFileSync("/tmp/yk_coaches.json", "utf8")).data.records;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const started = Date.now();
let n = 0;

while (Date.now() - started < 40 * 60 * 1000) {
  n++;
  let ok = false;
  try {
    const res = await fetch(PROBE, { method: "GET" });
    ok = res.status === 200 && (res.headers.get("content-type") || "").includes("image");
  } catch {}
  if (ok) {
    console.log(`[${new Date().toISOString()}] 检测到发版成功（第 ${n} 次探测），开始点亮老师`);
    for (const c of coaches) {
      await sql`UPDATE team_members SET is_active = 1, avatar_url = ${`/images/team/yueke/coach-${c.id}.jpg`} WHERE name = ${c.nickname}`;
    }
    const rows = await sql`SELECT name, is_active FROM team_members WHERE is_active = 1 ORDER BY sort_order, id`;
    console.log("已上线老师：", rows.map((r) => r.name).join(" / "));
    process.exit(0);
  }
  if (n % 4 === 0) console.log(`[${new Date().toISOString()}] 第 ${n} 次探测：还没发版（${Math.round((Date.now() - started) / 60000)} 分钟）`);
  await sleep(30000);
}
console.log("40 分钟内没等到发版，保持现状（老师仍为下线）");
