import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachId } from "@/lib/auth/coach-session";
import { rawSql } from "@/db";
import { shanghaiToday } from "@/lib/shanghai-date";
const today = () => shanghaiToday();

export async function GET(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return NextResponse.json({ error: "教练未登录" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "日期格式错误" }, { status: 400 });
  const sessions = await rawSql`
    SELECT s.id, s.session_date, s.start_time, s.end_time, s.capacity, s.booked_count, s.status,
           s.title, s.note, c.name AS course_name, r.name AS room_name
    FROM class_sessions s
    JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN rooms r ON r.id = s.room_id
    WHERE s.tenant_id = 1 AND s.coach_id = ${coachId} AND s.session_date = ${date}
    ORDER BY s.start_time`;
  const withCounts = [];
  for (const s of sessions) {
    const [att] = await rawSql`
      SELECT COUNT(*)::int AS attended FROM attendance
      WHERE session_id = ${s.id} AND status = 'attended'`;
    const [ns] = await rawSql`
      SELECT COUNT(*)::int AS no_show FROM attendance
      WHERE session_id = ${s.id} AND status = 'no_show'`;
    withCounts.push({ ...s, attended_count: att.attended, no_show_count: ns.no_show });
  }
  return NextResponse.json({ date, sessions: withCounts });
}
