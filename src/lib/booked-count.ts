import { rawSql } from "@/db";

/**
 * 修正 class_sessions.booked_count 与真实预约数的不一致。
 *
 * 为什么会不一致：
 * booked_count 是"派生计数器"，事实来源是 bookings 表。
 * 预约用原子 UPDATE 自增、取消自减，正常不会错；
 * 但只要有人直接写过这个字段（种子数据、手工 SQL、旧版导入），
 * 计数就会永久偏高 —— 会员看到"只剩 1 位"，其实一个都没约。
 * 这种错不会报错，只会让人觉得"约课系统怪怪的"。
 *
 * 每一次 UPDATE 都带 WHERE 不一致才更新，一致时是空写，代价可以忽略。
 */

const INTERVAL_MS = 60_000;
let lastRunAt = 0;

export async function reconcileBookedCounts(
  force = false
): Promise<{ fixed: number; skipped: boolean }> {
  const now = Date.now();
  if (!force && now - lastRunAt < INTERVAL_MS) {
    return { fixed: 0, skipped: true };
  }
  lastRunAt = now;

  try {
    // 1) 有真实预约的课次：按 bookings 重算
    const recalculated = await rawSql`
      UPDATE class_sessions s
         SET booked_count = sub.cnt, updated_at = now()
        FROM (
          SELECT session_id, count(*)::int AS cnt
            FROM bookings
           WHERE status IN ('booked', 'attended', 'completed')
           GROUP BY session_id
        ) sub
       WHERE s.id = sub.session_id
         AND s.booked_count <> sub.cnt
      RETURNING s.id
    `;

    // 2) 一条有效预约都没有却还挂着计数的：清零（幽灵占位）
    const cleared = await rawSql`
      UPDATE class_sessions s
         SET booked_count = 0, updated_at = now()
       WHERE s.booked_count > 0
         AND NOT EXISTS (
           SELECT 1 FROM bookings b
            WHERE b.session_id = s.id
              AND b.status IN ('booked', 'attended', 'completed')
         )
      RETURNING s.id
    `;

    const fixed = (recalculated?.length || 0) + (cleared?.length || 0);
    if (fixed > 0) {
      console.warn(`[reconcile] 修正 ${fixed} 个课次的名额计数`);
    }
    return { fixed, skipped: false };
  } catch (err) {
    console.error("[reconcileBookedCounts] error:", err);
    return { fixed: 0, skipped: false };
  }
}
