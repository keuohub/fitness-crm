import { rawSql } from "@/db";

/**
 * 自动结课消课引擎：
 * 规则：学员预约了课程且未在开课前取消，在课程结束后自动按照「已上课」处理，并从对应会员卡中扣除课时。
 * 全程原子性事务防重，幂等执行。
 */
export async function autoSettleFinishedBookings(): Promise<{ settledCount: number }> {
  try {
    // 获取当前北京时间 (UTC+8)
    const nowBeijing = new Date(Date.now() + 8 * 3600_000);
    const nowDate = nowBeijing.toISOString().slice(0, 10);
    const nowTime = nowBeijing.toISOString().slice(11, 16); // "HH:MM"

    // 查找所有「已到结束时间」且仍处于 booked 状态的预约
    const pendingBookings = await rawSql`
      SELECT b.id AS booking_id, b.session_id, b.member_id,
             s.course_category_id, s.session_date, s.start_time, s.end_time,
             c.name AS course_name
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      JOIN course_categories c ON c.id = s.course_category_id
      WHERE b.tenant_id = 1
        AND b.status = 'booked'
        AND (
          s.session_date < ${nowDate}
          OR (s.session_date = ${nowDate} AND s.end_time <= ${nowTime})
        )
      ORDER BY s.session_date, s.end_time
      LIMIT 100
    `;

    if (!pendingBookings || pendingBookings.length === 0) {
      return { settledCount: 0 };
    }

    let settled = 0;

    for (const b of pendingBookings) {
      try {
        // 原子消课：挑选该会员适用的最匹配有效卡（期限卡优先，快到期次卡优先）
        await rawSql`
          WITH candidate AS (
            SELECT mc.id, mc.remaining_count, ct.category
            FROM member_cards mc
            JOIN card_types ct ON ct.id = mc.card_type_id
            WHERE mc.tenant_id = 1
              AND mc.member_id = ${b.member_id}
              AND mc.status = 'active'
              AND (mc.valid_from IS NULL OR mc.valid_from::date <= ${b.session_date}::date)
              AND (mc.valid_until IS NULL OR mc.valid_until::date >= ${b.session_date}::date)
              AND (ct.category = 'period' OR mc.remaining_count > 0)
              AND (
                EXISTS (
                  SELECT 1 FROM card_type_courses ctc
                  WHERE ctc.card_type_id = ct.id
                    AND ctc.course_category_id = ${b.course_category_id}
                )
                OR NOT EXISTS (
                  SELECT 1 FROM card_type_courses ctc_none
                  WHERE ctc_none.card_type_id = ct.id
                )
              )
            ORDER BY
              ((SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) = 0) ASC,
              (SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) ASC,
              CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END,
              CASE WHEN mc.valid_until IS NULL THEN 1 ELSE 0 END,
              mc.valid_until, mc.id
            LIMIT 1
            FOR UPDATE OF mc
          ), card AS (
            UPDATE member_cards mc
            SET remaining_count = CASE WHEN c.category = 'count' THEN GREATEST(mc.remaining_count - 1, 0) ELSE mc.remaining_count END,
                updated_at = NOW()
            FROM candidate c
            WHERE mc.id = c.id
            RETURNING mc.id, mc.remaining_count, c.category
          ), att AS (
            INSERT INTO attendance (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
            VALUES (1, ${b.session_id}, ${b.member_id}, ${b.booking_id}, 'attended', 1, NOW(), '下课自动结课消课')
            ON CONFLICT DO NOTHING
            RETURNING id
          ), tx AS (
            INSERT INTO card_transactions
              (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
            SELECT 1, card.id, ${b.member_id}, ${b.booking_id}, 'deduct',
                   CASE WHEN card.category = 'count' THEN -1 ELSE 0 END,
                   card.remaining_count, ${'下课自动结课扣次 · ' + b.course_name}, 1
            FROM card
            RETURNING id
          )
          UPDATE bookings
          SET status = 'attended', updated_at = NOW()
          WHERE id = ${b.booking_id} AND status = 'booked'
        `;
        settled++;
      } catch (itemErr) {
        console.error(`[autoSettle] booking ${b.booking_id} settle failed:`, itemErr);
      }
    }

    return { settledCount: settled };
  } catch (err) {
    console.error("[autoSettleFinishedBookings] error:", err);
    return { settledCount: 0 };
  }
}
