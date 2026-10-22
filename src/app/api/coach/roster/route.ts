import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachId } from "@/lib/auth/coach-session";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return NextResponse.json({ error: "教练未登录" }, { status: 401 });
  const sessionId = Number(new URL(request.url).searchParams.get("sessionId"));
  if (!sessionId) return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  const [session] = await rawSql`
    SELECT s.*, c.name AS course_name, r.name AS room_name
    FROM class_sessions s JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN rooms r ON r.id = s.room_id
    WHERE s.id = ${sessionId} AND s.tenant_id = 1`;
  if (!session) return NextResponse.json({ error: "课次不存在" }, { status: 404 });
  if (session.coach_id !== coachId) return NextResponse.json({ error: "无权查看其他教练的课" }, { status: 403 });
  const roster = await rawSql`
    SELECT b.id AS booking_id, b.member_id, b.status AS booking_status,
           m.name AS member_name, m.phone AS member_phone,
           a.id AS attendance_id, a.status AS attendance_status, a.marked_at
    FROM bookings b JOIN members m ON m.id = b.member_id
    LEFT JOIN attendance a ON a.session_id = b.session_id AND a.member_id = b.member_id
    WHERE b.session_id = ${sessionId} AND b.tenant_id = 1
    ORDER BY b.id`;
  return NextResponse.json({ session, roster });
}
