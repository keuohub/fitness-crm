import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const u = new URL(request.url);
  const date = u.searchParams.get("date") || today();
  const sessionId = Number(u.searchParams.get("sessionId") || 0);
  if (!sessionId && !isDate(date)) return bad("日期格式错误");

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

  return NextResponse.json({ date, sessions, bookings });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const body = await request.json();
  const bookingId = Number(body.bookingId);
  if (!bookingId) return bad("缺少 bookingId");
  const [booking] = await rawSql`SELECT * FROM bookings WHERE id = ${bookingId} AND tenant_id = 1`;
  if (!booking) return bad("预约不存在", 404);
  if (booking.status === "cancelled") return NextResponse.json({ booking, duplicate: true });
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
  return NextResponse.json({ booking: rows[0] || booking });
}
