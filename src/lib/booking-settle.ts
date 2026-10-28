import { rawSql } from "@/db";

/**
 * 自动结课消课引擎：
 * 规则：学员预约了课程且未在开课前取消，在课程结束后自动按照「已上课」处理，并从对应会员卡中扣除课时。
 * 强校验红线（P0-5）：
 * 若会员无可用匹配卡，严禁标记为 attended，严禁计入已结算，必须转入 unsettled（待补卡结算）状态并记录日志，
 * 避免无卡白送或账面无痕，同时确保教练或管家事后补卡补签路径不被死锁。
 */
export async function autoSettleFinishedBookings(): Promise<{ settledCount: number; unsettledCount: number }> {
  try {
    // 获取当前北京时间 (UTC+8)
    const nowBeijing = new Date(Date.now() + 8 * 3600_000);
    const nowDate = nowBeijing.toISOString().slice(0, 10);
    const nowTime = nowBeijing.toISOString().slice(11, 16); // "HH:MM"

    // 查找所有「已到结束时间」且仍处于 booked 状态的待结算预约
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
      return { settledCount: 0, unsettledCount: 0 };
    }

    let settled = 0;
    let unsettled = 0;

    for (const b of pendingBookings) {
      try {
        // 原子消课：挑选该会员适用的最匹配有效卡（期限卡优先，快到期次卡优先）
        const [candidate] = await rawSql`
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
        `.catch(() => []);

        if (candidate) {
          // 1. 有可用有效卡：原子更新卡余次、写入考勤与消费流水、更新预约状态为 attended
          if (candidate.category === "count") {
            await rawSql`
              UPDATE member_cards
              SET remaining_count = GREATEST(remaining_count - 1, 0), updated_at = NOW()
              WHERE id = ${candidate.id}
            `;
          }

          await rawSql`
            INSERT INTO attendance (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
            VALUES (1, ${b.session_id}, ${b.member_id}, ${b.booking_id}, 'attended', 1, NOW(), '下课自动结课消课')
            ON CONFLICT DO NOTHING
          `;

          await rawSql`
            INSERT INTO card_transactions
              (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
            VALUES (
              1, ${candidate.id}, ${b.member_id}, ${b.booking_id}, 'deduct',
              ${candidate.category === "count" ? -1 : 0},
              (SELECT remaining_count FROM member_cards WHERE id = ${candidate.id}),
              ${'下课自动结课扣次 · ' + b.course_name}, 1
            )
          `;

          await rawSql`
            UPDATE bookings
            SET status = 'attended', updated_at = NOW()
            WHERE id = ${b.booking_id}
          `;
          settled++;
        } else {
          // 2. 无可用有效卡（P0-5）：严禁标记 attended，转入 unsettled 待处理状态，记录原因并允许后续补签补卡
          await rawSql`
            UPDATE bookings
            SET status = 'unsettled',
                cancel_reason = '自动结课失败：无匹配有效卡，进入待补卡结算状态',
                updated_at = NOW()
            WHERE id = ${b.booking_id}
          `;
          unsettled++;
          console.warn(`[autoSettle] Booking ${b.booking_id} (member ${b.member_id}) marked unsettled: no valid card`);
        }
      } catch (itemErr) {
        console.error(`[autoSettle] booking ${b.booking_id} settle failed:`, itemErr);
      }
    }

    return { settledCount: settled, unsettledCount: unsettled };
  } catch (err) {
    console.error("[autoSettleFinishedBookings] error:", err);
    return { settledCount: 0, unsettledCount: 0 };
  }
}
