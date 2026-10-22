// 清理测试/演示数据：默认 dry-run，加 --apply 才写库。
// 会先把将要修改的整行备份到 backups/。
import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const sql = neon(url);
const apply = process.argv.includes("--apply");
if (apply) requireDbWriteGuard("cleanup-demo", url);

const DEMO_NAME = /^(会员\d+|陈知意|测试用户_CRM写入验证|同步测试_)/;

const all = await sql`SELECT id,name,member_code,portal_code,phone,status,portal_enabled,total_hours FROM members ORDER BY id`;
const demos = all.filter((m) => DEMO_NAME.test(m.name));
const real = all.filter((m) => !DEMO_NAME.test(m.name));

// 验证时插入的测试训练记录
const testTrainings = await sql`SELECT id, member_id, training_date, focus_area FROM trainings WHERE focus_area = '端到端验证'`;

const demoIds = demos.map((m) => m.id);
const allTrainings = await sql`SELECT id, member_id, training_date, focus_area FROM trainings`;
const demoIdSet = new Set(demoIds);
const demoTrainings = allTrainings.filter((t) => demoIdSet.has(t.member_id));

console.log(`会员总数 ${all.length} | 真实 ${real.length} | 测试 ${demos.length}`);
console.log("测试会员：", demos.map((m) => `${m.id}:${m.name}`).join(", "));
console.log(`测试会员名下训练 ${demoTrainings.length} 条；端到端验证训练 ${testTrainings.length} 条`);
console.log("total_hours=42 的会员数：", all.filter((m) => m.total_hours === 42).length);

if (!apply) {
  console.log("\n[dry-run] 未写库。确认后执行：node scripts/cleanup-demo.mjs --apply");
  process.exit(0);
}

// 备份
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync("backups", { recursive: true });
const backupFile = `backups/cleanup-${stamp}.json`;
fs.writeFileSync(backupFile, JSON.stringify({ demos, demoIds, demoTrainings, testTrainings, totalHours42: all.filter((m) => m.total_hours === 42).map((m) => m.id) }, null, 2));
console.log("备份写入", backupFile);

// 1) 删除验证训练
for (const t of testTrainings) {
  await sql`DELETE FROM trainings WHERE id = ${t.id}`;
}
console.log(`已删除验证训练 ${testTrainings.length} 条`);

// 2) 删除测试会员名下的假训练记录（已写入备份，可恢复）
for (const t of demoTrainings) {
  await sql`DELETE FROM trainings WHERE id = ${t.id}`;
}
console.log(`已删除测试会员名下训练 ${demoTrainings.length} 条`);

// 3) 停用测试会员（不物理删除，保留可追溯）
for (const m of demos) {
  await sql`UPDATE members SET portal_enabled = 0, status = 'archived', updated_at = NOW() WHERE id = ${m.id}`;
}
console.log(`已停用测试会员 ${demos.length} 人（数据保留，可恢复）`);

// 4) 清掉全库假的 total_hours=42（字段保留，语义改为“卡内购买课时”，由后台人工录入）
await sql`UPDATE members SET total_hours = NULL, updated_at = NOW() WHERE total_hours = 42`;
console.log("已清空 total_hours=42");

const after = await sql`SELECT COUNT(*)::int AS n FROM members WHERE portal_enabled = 1 AND status <> 'archived'`;
console.log("清理后可登录会员数：", after[0].n);
