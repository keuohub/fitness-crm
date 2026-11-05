import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
import { autoSettleFinishedBookings } from "@/lib/booking-settle";
const bad = (msg: string, status = 400) => noStore({ error: msg }, { status });
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const u = new URL(request.url);
  const date = u.searchParams.get("date") || today();
  const sessionId = Number(u.searchParams.get("sessionId") || 0);
  if (!sessionId && !isDate(date)) return bad("日期格式错误");

  // 打开预约名单前先结算已下课的课次：
  // 自动结课原本只在会员打开「我的卡」时懒触发，会员不打开就不扣次、不计课时，
  // 主理人看到的余次和当天账目就会滞后。这里补上，保证后台看到的是结完账的数。
  try {
    await autoSettleFinishedBookings();
  } catch (e) {
    console.error("[admin/reservations] autoSettle error:", e);
  }

  const sessions = sessionId
    ? await rawSql`
        SELECT s.id, s.session_date, s.start_time, s.end_time, s.capacity, s.booked_count, s.status,
               c.name AS course_name, u2.name AS coach_name, r.name AS room_name
        FROM class_sessions s
        JOIN course_categories c ON c.id = s.course_category_id
        LEFT JOIN users u2 ON u2.id = s.coach_id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE s.id = ${sessionId} AND s.tenant_id = 1`
    : await rawSql`
        SELECT s.id, s.session_date, s.start_time, s.end_time, s.capacity, s.booked_count, s.status,
               c.name AS course_name, u2.name AS coach_name, r.name AS room_name
        FROM class_sessions s
        JOIN course_categories c ON c.id = s.course_category_id
        LEFT JOIN users u2 ON u2.id = s.coach_id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE s.tenant_id = 1 AND s.session_date = ${date}
        ORDER BY s.start_time`;

  const bookings = sessionId
    ? await rawSql`
        SELECT b.id, b.session_id, b.member_id, b.status, b.booked_at, b.cancelled_at, b.cancel_reason,
               m.name AS member_name, m.phone AS member_phone
        FROM bookings b JOIN members m ON m.id = b.member_id
        WHERE b.tenant_id = 1 AND b.session_id = ${sessionId}
        ORDER BY b.id DESC`
    : await rawSql`
        SELECT b.id, b.session_id, b.member_id, b.status, b.booked_at, b.cancelled_at, b.cancel_reason,
               m.name AS member_name, m.phone AS member_phone
        FROM bookings b JOIN members m ON m.id = b.member_id
        WHERE b.tenant_id = 1 AND b.session_id IN (
          SELECT id FROM class_sessions WHERE tenant_id = 1 AND session_date = ${date}
        ) ORDER BY b.id DESC`;

  return noStore({ date, sessions, bookings });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const body = await request.json();
  const bookingId = Number(body.bookingId);
  if (!bookingId) return bad("缺少 bookingId");
  const [booking] = await rawSql`SELECT * FROM bookings WHERE id = ${bookingId} AND tenant_id = 1`;
  if (!booking) return bad("预约不存在", 404);

  // ── 签到（人工到课）──────────────────────────────────────
  // 自动结课只处理"课已上完且会员开过小程序"的情况。
  // 会员没预约就来了、或系统判定 unsettled（无匹配卡）时，需要主理人手动补签。
  if (String(body.action || "") === "checkin") {
    if (booking.status === "attended") {
      return noStore({ ok: true, duplicate: true, message: "已经签到过了" });
    }
    if (booking.status === "cancelled") {
      return bad("这笔预约已取消，不能签到", 409);
    }

    const [session] = await rawSql`
      SELECT s.id, s.session_date, s.course_category_id, c.name AS course_name
        FROM class_sessions s JOIN course_categories c ON c.id = s.course_category_id
       WHERE s.id = ${booking.session_id}`;

    // 找一张可用于这节课的有效卡（期限卡优先，其次余次最多的次卡）
    const [card] = await rawSql`
      SELECT mc.id, mc.remaining_count, ct.category
        FROM member_cards mc
        JOIN card_types ct ON ct.id = mc.card_type_id
       WHERE mc.tenant_id = 1
         AND mc.member_id = ${booking.member_id}
         AND mc.status = 'active'
         AND (mc.valid_from IS NULL OR mc.valid_from::date <= ${session?.session_date || today()}::date)
         AND (mc.valid_until IS NULL OR mc.valid_until::date >= ${session?.session_date || today()}::date)
         AND (ct.category = 'period' OR mc.remaining_count > 0)
         AND (
           EXISTS (SELECT 1 FROM card_type_courses ctc
                    WHERE ctc.card_type_id = ct.id
                      AND ctc.course_category_id = ${session?.course_category_id || 0})
           OR NOT EXISTS (SELECT 1 FROM card_type_courses ctc2 WHERE ctc2.card_type_id = ct.id)
         )
       ORDER BY CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END,
                mc.remaining_count DESC, mc.id
       LIMIT 1
       FOR UPDATE OF mc`;

    if (!card) {
      return bad("该会员没有可用的卡，无法签到扣次。请先在后台给她开卡或补次。", 409);
    }

    if (card.category === "count") {
      await rawSql`
        UPDATE member_cards
           SET remaining_count = GREATEST(remaining_count - 1, 0), updated_at = NOW()
         WHERE id = ${card.id}`;
    }

    await rawSql`
      INSERT INTO attendance (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
      VALUES (1, ${booking.session_id}, ${booking.member_id}, ${bookingId}, 'attended', 1, NOW(), '主理人手动签到')
      ON CONFLICT DO NOTHING`;

    await rawSql`
      INSERT INTO card_transactions
        (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
      VALUES (1, ${card.id}, ${booking.member_id}, ${bookingId}, 'deduct',
              ${card.category === "count" ? -1 : 0},
              (SELECT remaining_count FROM member_cards WHERE id = ${card.id}),
              ${"手动签到扣次 · " + (session?.course_name || "")}, 1)`;

    await rawSql`
      UPDATE bookings SET status = 'attended', updated_at = NOW() WHERE id = ${bookingId}`;

    return noStore({
      ok: true,
      bookingId,
      status: "attended",
      cardRemaining: card.category === "count" ? Math.max(0, Number(card.remaining_count || 0) - 1) : null,
    });
  }

  // ── 取消预约 ────────────────────────────────────────────
  if (booking.status === "cancelled") return noStore({ booking, duplicate: true });
  if (booking.status !== "booked") return bad("该预约不可取消", 409);
  const rows = await rawSql`
    WITH updated AS (
      UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(),
        cancel_reason = ${body.reason || "后台取消"}, updated_at = NOW()
      WHERE id = ${bookingId} AND tenant_id = 1 AND status = 'booked' RETURNING *
    ), released AS (
      UPDATE class_sessions SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
      WHERE id IN (SELECT session_id FROM updated) RETURNING id
    ) SELECT * FROM updated`;
  return noStore({ booking: rows[0] || booking });
}
