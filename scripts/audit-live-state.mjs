// scripts/audit-live-state.mjs
//
// 只读核对脚本（不写库）。
// 目的：把 HANDOFF.md「当前状态快照（2026-10-22 晚）」里的表格逐项对一遍，
// 确认线上生产库的真实状态，避免按过期快照做决策。
//
// 用法：node scripts/audit-live-state.mjs

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim();
if (!url) {
  console.error("找不到 DATABASE_URL");
  process.exit(1);
}
const sql = neon(url);

const host = new URL(url).hostname;
console.log("数据库主机:", host);
console.log("");

const q = async (label, fn) => {
  try {
    const rows = await fn();
    return { label, rows };
  } catch (e) {
    return { label, error: e.message };
  }
};

const results = [];

results.push(
  await q("核心表计数", async () =>
    (await sql`
      SELECT
        (SELECT count(*) FROM members) AS members,
        (SELECT count(*) FROM members WHERE portal_enabled = 1) AS members_portal_enabled,
        (SELECT count(*) FROM card_types) AS card_types,
        (SELECT count(*) FROM card_types WHERE is_active = 1) AS card_types_active,
        (SELECT count(*) FROM member_cards) AS member_cards,
        (SELECT count(*) FROM class_sessions) AS class_sessions,
        (SELECT count(*) FROM bookings) AS bookings,
        (SELECT count(*) FROM attendance) AS attendance,
        (SELECT count(*) FROM trainings) AS trainings,
        (SELECT count(*) FROM monthly_stars) AS monthly_stars,
        (SELECT count(*) FROM venue_items) AS venue_items,
        (SELECT count(*) FROM team_members) AS team_members,
        (SELECT count(*) FROM photos) AS photos,
        (SELECT count(*) FROM questionnaire_submissions) AS questionnaires
    `)[0]
  )
);

results.push(
  await q("卡类型全表", async () =>
    await sql`
      SELECT id, name, category, price_cents, validity_days, weekly_limit,
             total_count, is_active, sort_order
      FROM card_types
      ORDER BY sort_order, id
    `
  )
);

results.push(
  await q("会员卡（试点 5 人）", async () =>
    await sql`
      SELECT mc.id, m.name AS member_name, m.id AS member_id, ct.name AS card_name,
             mc.status, mc.total_count, mc.remaining_count,
             mc.valid_from, mc.valid_until
      FROM member_cards mc
      LEFT JOIN members m ON m.id = mc.member_id
      LEFT JOIN card_types ct ON ct.id = mc.card_type_id
      ORDER BY mc.id
    `
  )
);

results.push(
  await q("课次排期", async () =>
    await sql`
      SELECT cs.id, cs.session_date, cs.start_time, cs.end_time, cs.title,
             cs.capacity, cs.booked_count, cs.status,
             tm.name AS coach_name, cc.name AS category_name
      FROM class_sessions cs
      LEFT JOIN team_members tm ON tm.id = cs.coach_id
      LEFT JOIN course_categories cc ON cc.id = cs.course_category_id
      ORDER BY cs.session_date, cs.start_time
    `
  )
);

results.push(
  await q("课表模板", async () =>
    await sql`SELECT count(*) AS n FROM schedule_templates`
  )
);

results.push(
  await q("测试会员 284", async () =>
    await sql`
      SELECT id, name, joined_at, notes, portal_enabled
      FROM members WHERE id = 284
    `
  )
);

results.push(
  await q("课时字段非空统计", async () =>
    (await sql`
      SELECT
        count(*) FILTER (WHERE total_hours IS NOT NULL) AS total_hours_set,
        count(*) FILTER (WHERE hours_pilates IS NOT NULL) AS hours_pilates_set,
        count(*) FILTER (WHERE hours_private IS NOT NULL) AS hours_private_set,
        count(*) FILTER (WHERE joined_at IS NULL) AS joined_at_null,
        count(*) AS total
      FROM members
    `)[0]
  )
);

results.push(
  await q("约刻老师团队", async () =>
    await sql`
      SELECT id, name, role_title, is_active,
             (bio IS NULL OR bio = '') AS bio_empty,
             (avatar_url IS NOT NULL AND avatar_url <> '') AS has_avatar
      FROM team_members
      ORDER BY id
    `
  )
);

results.push(
  await q("studio_settings 的 key（不打印密钥值）", async () =>
    await sql`SELECT key,
                     CASE WHEN key LIKE '%secret%' OR key LIKE '%key%'
                          THEN '<hidden, len=' || coalesce(length(value),0) || '>'
                          ELSE value END AS value
              FROM studio_settings ORDER BY key`
  )
);

for (const r of results) {
  console.log("=".repeat(70));
  console.log("## " + r.label);
  if (r.error) {
    console.log("  查询失败:", r.error);
    continue;
  }
  console.table(r.rows);
  console.log("");
}
