// 2026-10-22 主理人授权的一次性数据修正（默认 dry-run）
// 依据本轮指令：
//   1) 小程序里的嘉敏、若琳全部下线
//   2) 老师介绍/资历是假的，先删掉（不在小程序里写回介绍、不写"资深教练"）
//   3) 秦卓宇是主理人本人、不是约刻会员，按测试会员处理
//
// 只改这三件事，不动其他会员、不动约刻。
// 用法：node scripts/apply-team-and-test-member-20261022.mjs          # dry-run
//       ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 node ... --apply    # 执行
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sql = neon(url);
const apply = process.argv.includes("--apply");
if (apply) requireDbWriteGuard("apply-team-and-test-member", url);

const TEAM_OFFLINE = ["嘉敏", "若琳"];
const TEST_MEMBER_ID = 284;

const team = await sql`SELECT id,name,role_title,experience,creds,bio,is_active FROM team_members ORDER BY id`;
const member = (await sql`SELECT id,name,member_code,joined_at,total_hours,hours_pilates,hours_equipment,hours_fat_burn,hours_private,mentor_name,status,portal_enabled,notes FROM members WHERE id=${TEST_MEMBER_ID}`)[0];

console.log("=== 改动前 · team_members ===");
for (const t of team) console.log(`  ${t.id} ${t.name} | 角色=${t.role_title} | 资历=${t.experience ?? "NULL"} | is_active=${t.is_active}`);

console.log("\n=== 改动前 · 秦卓宇(284) ===");
console.log(`  joined_at=${member.joined_at} total_hours=${member.total_hours} 四类=${member.hours_pilates}/${member.hours_equipment}/${member.hours_fat_burn}/${member.hours_private} mentor=${member.mentor_name} notes=${member.notes}`);

const plan = [
  `team_members: ${TEAM_OFFLINE.join("、")} → is_active=0（下线，不删除）`,
  "team_members: 全部 experience / creds / bio 清空（假介绍、假资历）",
  `members id=${TEST_MEMBER_ID}: total_hours / hours_* 清空，joined_at→2026-10-21（建档日），mentor_name→小桥，notes→测试会员（主理人本人）`,
];
console.log("\n=== 计划改动 ===");
plan.forEach((p, i) => console.log(`  ${i + 1}) ${p}`));

if (!apply) {
  console.log("\n[dry-run] 未写库。确认后加 --apply。");
  process.exit(0);
}

// 备份整行
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync("backups", { recursive: true });
const file = `backups/team-testmember-before-${stamp}.json`;
fs.writeFileSync(file, JSON.stringify({ team, member }, null, 2));
console.log("\n备份写入", file);

// 1) 佳敏、若琳下线
const off = await sql`UPDATE team_members SET is_active=0 WHERE name = ANY(${TEAM_OFFLINE}) RETURNING id,name`;
console.log("已下线：", off.map((r) => `${r.id}:${r.name}`).join(", ") || "无");

// 2) 清空假介绍与假资历
const cleared = await sql`UPDATE team_members SET experience=NULL, creds=NULL, bio=NULL RETURNING id,name`;
console.log("已清空介绍/资历：", cleared.map((r) => `${r.id}:${r.name}`).join(", "));

// 3) 秦卓宇按测试会员处理，清掉假课时
const upd = await sql`
  UPDATE members SET
    total_hours=NULL,
    hours_pilates=NULL, hours_equipment=NULL, hours_fat_burn=NULL, hours_private=NULL,
    joined_at='2026-10-21',
    mentor_name='小桥',
    notes='测试会员（主理人本人）',
    updated_at=NOW()
  WHERE id=${TEST_MEMBER_ID}
  RETURNING id,name,joined_at,total_hours,mentor_name,notes`;
console.log("已更新秦卓宇：", JSON.stringify(upd[0]));

console.log("\n=== 改动后 · team_members ===");
const after = await sql`SELECT id,name,role_title,experience,creds,bio,is_active FROM team_members ORDER BY id`;
for (const t of after) console.log(`  ${t.id} ${t.name} | 资历=${t.experience ?? "NULL"} | is_active=${t.is_active}`);
