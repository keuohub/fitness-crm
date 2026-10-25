/**
 * 迁移脚本：P0-A 卡种课程权限表创建、卡种调整、权限初始化、清理 6 条测试会员
 * 运行方式：ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 node scripts/migrate-card-permissions.mjs
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (process.env.ALLOW_DB_WRITE !== "1" || process.env.ALLOW_REMOTE_DB_WRITE !== "1") {
  console.error("❌ 缺少写库守卫变量：必须设置 ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL 未配置");
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  console.log("🚀 开始执行卡种课程权限迁移与数据清理...");
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  // 1. 备份现有 card_types
  const cardTypes = await sql`SELECT * FROM card_types WHERE tenant_id = 1 ORDER BY id`;
  fs.writeFileSync(
    path.join(backupDir, `card_types_backup_${timestamp}.json`),
    JSON.stringify(cardTypes, null, 2)
  );
  console.log(`✅ 已备份 card_types (${cardTypes.length} 条) -> backups/card_types_backup_${timestamp}.json`);

  // 2. 备份待删除的 6 条测试会员及关联数据
  const testIds = [1, 2, 3, 4, 5, 9];
  const testMembers = await sql`SELECT * FROM members WHERE id = ANY(${testIds})`;
  const testPhotos = await sql`SELECT * FROM photos WHERE member_id = ANY(${testIds})`;
  const testQ = await sql`SELECT * FROM questionnaire_submissions WHERE member_id = ANY(${testIds})`;
  fs.writeFileSync(
    path.join(backupDir, `test_members_backup_${timestamp}.json`),
    JSON.stringify({ members: testMembers, photos: testPhotos, questionnaires: testQ }, null, 2)
  );
  console.log(`✅ 已备份测试会员 (${testMembers.length} 位) -> backups/test_members_backup_${timestamp}.json`);

  // 3. 执行 DDL 建表 card_type_courses
  console.log("📦 创建关联表 card_type_courses...");
  await sql`
    CREATE TABLE IF NOT EXISTS card_type_courses (
      id SERIAL PRIMARY KEY,
      card_type_id INTEGER NOT NULL,
      course_category_id INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS card_type_courses_uniq 
    ON card_type_courses (card_type_id, course_category_id)
  `;
  console.log("✅ 表 card_type_courses 与联合唯一索引 card_type_courses_uniq 就绪");

  // 4. 调整卡种状态（停用 东方舞年卡 id=1、一卡通次卡 id=3）
  await sql`UPDATE card_types SET is_active = 0 WHERE id IN (1, 3) AND tenant_id = 1`;
  console.log("✅ 已停用东方舞年卡 (id=1) 与一卡通次卡 (id=3)");

  // 5. 新建「大器械卡」与「私教卡」
  let [machCard] = await sql`SELECT id FROM card_types WHERE tenant_id = 1 AND name = '大器械卡' LIMIT 1`;
  if (!machCard) {
    const [created] = await sql`
      INSERT INTO card_types (tenant_id, name, category, total_count, price_cents, is_active, sort_order)
      VALUES (1, '大器械卡', 'count', 10, 0, 1, 10)
      RETURNING id
    `;
    machCard = created;
    console.log("✅ 新建「大器械卡」(次卡, 10次, id=" + machCard.id + ")");
  } else {
    console.log("ℹ️ 「大器械卡」已存在 (id=" + machCard.id + ")");
  }

  let [privCard] = await sql`SELECT id FROM card_types WHERE tenant_id = 1 AND name = '私教卡' LIMIT 1`;
  if (!privCard) {
    const [created] = await sql`
      INSERT INTO card_types (tenant_id, name, category, total_count, price_cents, is_active, sort_order)
      VALUES (1, '私教卡', 'count', 10, 0, 1, 11)
      RETURNING id
    `;
    privCard = created;
    console.log("✅ 新建「私教卡」(次卡, 10次, id=" + privCard.id + ")");
  } else {
    console.log("ℹ️ 「私教卡」已存在 (id=" + privCard.id + ")");
  }

  // 6. 初始化 card_type_courses 初始权限矩阵
  // 课种 ID：1 pilates, 2 equipment, 3 fat_burn, 4 private, 5 yoga
  const permissions = [
    { cardTypeId: 2, courseCategoryIds: [5] }, // 瑜伽课年卡 -> 瑜伽
    { cardTypeId: 4, courseCategoryIds: [5] }, // 瑜伽次卡 -> 瑜伽
    { cardTypeId: 5, courseCategoryIds: [1, 2, 3, 5] }, // 季卡 -> 普拉提/大器械/维密/瑜伽
    { cardTypeId: 6, courseCategoryIds: [1] }, // 普拉提月卡 -> 普拉提
    { cardTypeId: 7, courseCategoryIds: [1] }, // 普拉提次卡(50次) -> 普拉提
    { cardTypeId: 8, courseCategoryIds: [1, 2, 3, 5] }, // 年卡一卡通 -> 普拉提/大器械/维密/瑜伽
    { cardTypeId: 9, courseCategoryIds: [1] }, // 普拉提次卡(2次) -> 普拉提
    { cardTypeId: machCard.id, courseCategoryIds: [2] }, // 大器械卡 -> 高定大器械
    { cardTypeId: privCard.id, courseCategoryIds: [4] }, // 私教卡 -> 私教
  ];

  for (const p of permissions) {
    for (const cid of p.courseCategoryIds) {
      await sql`
        INSERT INTO card_type_courses (card_type_id, course_category_id)
        VALUES (${p.cardTypeId}, ${cid})
        ON CONFLICT (card_type_id, course_category_id) DO NOTHING
      `;
    }
  }
  console.log("✅ 已初始化全部有效卡种的课程权限关联");

  // 7. 清理 6 条测试会员及关联数据
  await sql`DELETE FROM member_memories WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM daily_health_logs WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM trainings WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM ai_feedback_reports WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM photos WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM questionnaire_submissions WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM portal_usage_logs WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM member_sessions WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM training_feelings WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM course_bookings WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM card_transactions WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM attendance WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM bookings WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM member_cards WHERE member_id = ANY(${testIds})`;
  await sql`DELETE FROM members WHERE id = ANY(${testIds})`;
  console.log("✅ 已安全清理 6 位测试会员 (id: 1, 2, 3, 4, 5, 9) 及其关联测试数据");

  // 8. 最终核对
  const [memberCount] = await sql`SELECT count(*)::int as count FROM members WHERE tenant_id = 1`;
  const allCardCourses = await sql`
    SELECT ctc.id, ct.name as card_name, cc.name as course_name 
    FROM card_type_courses ctc
    JOIN card_types ct ON ct.id = ctc.card_type_id
    JOIN course_categories cc ON cc.id = ctc.course_category_id
    ORDER BY ctc.card_type_id, ctc.course_category_id
  `;

  console.log(`\n🎉 迁移完成！当前剩余真实会员总数: ${memberCount.count} (预期 274)`);
  console.log("📋 现行卡种权限矩阵列表:");
  console.table(allCardCourses);
}

main().catch((err) => {
  console.error("❌ 迁移失败:", err);
  process.exit(1);
});
