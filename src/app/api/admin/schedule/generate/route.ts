import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
async function conflicts(date: string, start: string, end: string, coachId: number, roomId: number | null) {
  const coach = await rawSql`
    SELECT s.id FROM class_sessions s
    WHERE s.tenant_id = 1 AND s.session_date = ${date} AND s.status <> 'cancelled'
      AND s.coach_id = ${coachId} AND s.start_time < ${end} AND s.end_time > ${start}`;
  const room = roomId ? await rawSql`
    SELECT s.id FROM class_sessions s
    WHERE s.tenant_id = 1 AND s.session_date = ${date} AND s.status <> 'cancelled'
      AND s.room_id = ${roomId} AND s.start_time < ${end} AND s.end_time > ${start}` : [];
  const w: string[] = [];
  if (coach.length) w.push(`教练时间冲突 ${date} ${start}`);
  if (room.length) w.push(`教室时间冲突 ${date} ${start}`);
  return w;
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const b = await request.json();
  const weekStart = String(b.weekStart || "");
  if (!isDate(weekStart)) return bad("weekStart 格式应为 YYYY-MM-DD");
  const templates = await rawSql`SELECT * FROM schedule_templates WHERE tenant_id = 1 AND is_active = 1 ORDER BY weekday, start_time`;
  let created = 0, skipped = 0;
  const warnings: string[] = [];
  for (const t of templates) {
    const date = addDays(weekStart, Number(t.weekday) - 1);
    if (t.effective_from && date < t.effective_from) { skipped++; continue; }
    if (t.effective_to && date > t.effective_to) { skipped++; continue; }
    const [dup] = await rawSql`
      SELECT id FROM class_sessions
      WHERE tenant_id = 1 AND template_id = ${t.id} AND session_date = ${date} LIMIT 1`;
    if (dup) { skipped++; continue; }
    const w = await conflicts(date, t.start_time, t.end_time, t.coach_id, t.room_id);
    warnings.push(...w);
    await rawSql`
      INSERT INTO class_sessions
        (tenant_id, template_id, course_category_id, coach_id, room_id, title,
         session_date, start_time, end_time, capacity, status)
      VALUES
        (1, ${t.id}, ${t.course_id}, ${t.coach_id}, ${t.room_id}, ${null},
         ${date}, ${t.start_time}, ${t.end_time}, ${t.capacity}, 'open')`;
    created++;
  }
  return NextResponse.json({ created, skipped, warnings });
}
