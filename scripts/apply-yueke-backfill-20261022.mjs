// 2026-10-22 约刻真实数据回填（默认 dry-run）
//   A) 团队老师：按约刻员工信息全量导入（姓名+头像），不写介绍/资历/头衔
//   B) 会员入会日期：按手机号匹配，用约刻 intime 回填 members.joined_at
//
// 说明：头像文件已下载到 public/images/team/yueke/，但本地静态文件要重新发版才可见，
// 所以本轮把新老师先写成 is_active=0（上线后再激活），小桥头像暂时保持原样。
// 用 --apply 才写库。
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sql = neon(url);
const apply = process.argv.includes("--apply");
if (apply) requireDbWriteGuard("yueke-backfill", url);

const coaches = JSON.parse(fs.readFileSync("/tmp/yk_coaches.json", "utf8")).data.records;
const details = JSON.parse(fs.readFileSync("/tmp/yk_member_details.json", "utf8"));

const norm = (p) => String(p || "").replace(/\D/g, "");
const byPhone = new Map();
for (const d of details) if (d.phone) byPhone.set(norm(d.phone), d);

const dbMembers = await sql`
  SELECT id, name, phone, joined_at, total_hours, hours_pilates, hours_equipment, hours_fat_burn, hours_private
  FROM members ORDER BY id`;

// ---- B) 入会日期匹配 ----
const matched = [];
const conflicts = [];
for (const m of dbMembers) {
  const d = byPhone.get(norm(m.phone));
  if (!d || !d.intime) continue;
  if (m.joined_at === d.intime) continue;
  matched.push({ id: m.id, name: m.name, old: m.joined_at, next: d.intime });
  if (m.joined_at && m.joined_at !== d.intime) conflicts.push({ id: m.id, name: m.name, old: m.joined_at, yueke: d.intime });
}
console.log(`库内会员 ${dbMembers.length}；约刻会员 ${details.length}；匹配到入会日期且需更新 ${matched.length}；已有不同日期 ${conflicts.length}`);
console.log("冲突前 5 条：", JSON.stringify(conflicts.slice(0, 5)));

// ---- A) 老师 ----
const existing = await sql`SELECT id,name,avatar_url,is_active,sort_order,role_title FROM team_members ORDER BY sort_order,id`;
console.log("\n现有 team_members：", existing.map((r) => `${r.id}:${r.name}(${r.is_active})`).join(", "));

const order = ["小桥", ...coaches.map((c) => c.nickname).filter((n) => n !== "小桥")];
const uniq = [...new Set(order)];
console.log("约刻老师顺序：", uniq.join(" / "));

if (!apply) {
  console.log("\n[dry-run] 未写库。");
  console.log("A) 老师：更新/新增 " + uniq.length + " 位，头像 /images/team/yueke/coach-<id>.jpg，介绍/资历/寄语为空；新老师先 is_active=0");
  console.log("B) 入会日期：更新 " + matched.length + " 人（示例 5 条）：", JSON.stringify(matched.slice(0, 5)));
  process.exit(0);
}

// 备份
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync("backups", { recursive: true });
const backup = `backups/yueke-backfill-before-${stamp}.json`;
fs.writeFileSync(backup, JSON.stringify({ members: dbMembers, team: existing }, null, 2));
console.log("\n备份写入", backup);

// A) 老师：小桥按 id=1 原地更新（保持在线），其余按名字 upsert，先离线上架
for (let i = 0; i < uniq.length; i++) {
  const name = uniq[i];
  const c = coaches.find((x) => x.nickname === name);
  if (!c) continue;
  const avatar = `/images/team/yueke/coach-${c.id}.jpg`;
  const isXiaoqiao = name === "小桥";
  const row = existing.find((r) => r.name === name);
  if (row) {
    await sql`
      UPDATE team_members SET
        avatar_url = ${avatar},
        role_title = ${isXiaoqiao ? "创始人 / 教学主理人" : " "},
        experience = NULL, creds = NULL, bio = NULL, quote = NULL,
        sort_order = ${i + 1}
      WHERE id = ${row.id}`;
  } else {
    await sql`
      INSERT INTO team_members (name, role_title, avatar_url, sort_order, is_active)
      VALUES (${name}, ' ', ${avatar}, ${i + 1}, 0)`;
  }
}
console.log("老师已写入（新老师 is_active=0，待发版后激活）");

// B) 入会日期
for (const m of matched) {
  await sql`UPDATE members SET joined_at = ${m.next}, updated_at = NOW() WHERE id = ${m.id}`;
}
console.log(`入会日期已回填 ${matched.length} 人`);
