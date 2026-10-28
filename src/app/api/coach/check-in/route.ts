import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachId } from "@/lib/auth/coach-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function POST(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return bad("教练未登录", 401);
  const body = await request.json();
  const bookingId = Number(body.bookingId);
  const status = String(body.status || "");
  if (!bookingId) return bad("缺少 bookingId");
  if (!["attended", "no_show"].includes(status)) return bad("status 只能是 attended 或 no_show");

  const [booking] = await rawSql`
    SELECT b.*, s.coach_id, b.session_id AS sid, s.session_date, s.start_time, s.course_category_id
    FROM bookings b JOIN class_sessions s ON s.id = b.session_id
    WHERE b.id = ${bookingId} AND b.tenant_id = 1`;
  if (!booking) return bad("预约不存在", 404);
  if (booking.coach_id !== coachId) return bad("无权操作其他教练的课", 403);

  const [existingAtt] = await rawSql`
    SELECT * FROM attendance WHERE session_id = ${booking.sid} AND member_id = ${booking.member_id}`;
  if (existingAtt) {
    return NextResponse.json({ attendance: existingAtt, duplicate: true, card: null }, { status: 200 });
  }
  if (!["booked", "unsettled"].includes(booking.status)) return bad("该预约已结课或已取消", 409);

  try {
    const rows = await rawSql`
      WITH booking_ok AS (
        SELECT id, session_id, member_id FROM bookings
        WHERE id = ${bookingId} AND tenant_id = 1 AND status IN ('booked', 'unsettled')
      ), candidate AS (
        SELECT mc.id, mc.remaining_count, ct.category,
               COALESCE((SELECT COUNT(*)::int FROM card_type_courses ctc_cnt WHERE ctc_cnt.card_type_id = ct.id), 0) AS course_scope
        FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
        WHERE mc.tenant_id = 1
          AND mc.member_id = (SELECT member_id FROM booking_ok)
          AND mc.status = 'active'
          AND (mc.valid_from IS NULL OR mc.valid_from::date <= CURRENT_DATE)
          AND (mc.valid_until IS NULL OR mc.valid_until::date >= CURRENT_DATE)
          AND (ct.category = 'period' OR mc.remaining_count > 0)
          AND (
            EXISTS (
              SELECT 1 FROM card_type_courses ctc
              WHERE ctc.card_type_id = ct.id AND ctc.course_category_id = ${booking.course_category_id}
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
        SET remaining_count = CASE WHEN c.category = 'count' THEN mc.remaining_count - 1 ELSE mc.remaining_count END,
            updated_at = NOW()
        FROM candidate c
        WHERE mc.id = c.id AND (c.category = 'period' OR mc.remaining_count > 0)
        RETURNING mc.id, mc.remaining_count, c.category
      ), att AS (
        INSERT INTO attendance (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
        SELECT 1, ${booking.sid}, ${booking.member_id}, ${bookingId}, ${status}, ${coachId}, NOW(), ${body.note || null}
        FROM card
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance WHERE session_id = ${booking.sid} AND member_id = ${booking.member_id}
        )
        RETURNING id, member_id
      ), tx AS (
        INSERT INTO card_transactions
          (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
        SELECT 1, card.id, ${booking.member_id}, ${bookingId}, 'deduct',
               CASE WHEN card.category = 'count' THEN -1 ELSE 0 END,
               card.remaining_count, ${body.note || (status === "attended" ? "到课扣次" : "未到扣次")}, ${coachId}
        FROM card WHERE EXISTS (SELECT 1 FROM att)
        RETURNING id
      ), bu AS (
        UPDATE bookings SET status = ${status}, updated_at = NOW()
        WHERE id = ${bookingId} AND tenant_id = 1 AND status = 'booked'
          AND EXISTS (SELECT 1 FROM att)
        RETURNING id
      )
      SELECT (SELECT id FROM att) AS attendance_id,
             (SELECT id FROM card) AS card_id,
             (SELECT remaining_count FROM card) AS remaining_count,
             (SELECT category FROM card) AS category`;
    const r = rows[0] || {};
    if (!r.attendance_id) {
      const [again] = await rawSql`
        SELECT * FROM attendance WHERE session_id = ${booking.sid} AND member_id = ${booking.member_id}`;
      if (again) return NextResponse.json({ attendance: again, duplicate: true, card: null }, { status: 200 });
      const [coveringCard] = await rawSql`
        SELECT mc.id, mc.remaining_count, ct.category
        FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
        WHERE mc.tenant_id = 1 AND mc.member_id = ${booking.member_id} AND mc.status = 'active'
          AND (mc.valid_from IS NULL OR mc.valid_from::date <= CURRENT_DATE)
          AND (mc.valid_until IS NULL OR mc.valid_until::date >= CURRENT_DATE)
          AND (
            EXISTS (
              SELECT 1 FROM card_type_courses ctc
              WHERE ctc.card_type_id = ct.id AND ctc.course_category_id = ${booking.course_category_id}
            )
            OR NOT EXISTS (
              SELECT 1 FROM card_type_courses ctc_none
              WHERE ctc_none.card_type_id = ct.id
            )
          )
        ORDER BY mc.id LIMIT 1`;
      if (!coveringCard) return bad("该会员没有可扣这节课的卡", 422);
      if (coveringCard.category === "count" && Number(coveringCard.remaining_count || 0) <= 0) return bad("会员卡剩余次数不足", 422);
      return bad("签到失败，请重试", 409);
    }
    return NextResponse.json({
      attendanceId: r.attendance_id,
      cardId: r.card_id,
      remainingCount: r.remaining_count,
      category: r.category,
    }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("uniq_attendance")) {
      const [again] = await rawSql`
        SELECT * FROM attendance WHERE session_id = ${booking.sid} AND member_id = ${booking.member_id}`;
      if (again) return NextResponse.json({ attendance: again, duplicate: true, card: null }, { status: 200 });
    }
    console.error("[coach/check-in] error", err);
    return bad("签到失败，请重试", 500);
  }
}
