import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const rows = await rawSql`
    SELECT t.*, c.name AS course_name, u.name AS coach_name, r.name AS room_name
    FROM schedule_templates t
    JOIN course_categories c ON c.id = t.course_id
    LEFT JOIN users u ON u.id = t.coach_id
    LEFT JOIN rooms r ON r.id = t.room_id
    WHERE t.tenant_id = 1 ORDER BY t.weekday, t.start_time`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const courseId = Number(b.courseId), coachId = Number(b.coachId);
  const roomId = b.roomId ? Number(b.roomId) : null;
  const weekday = Number(b.weekday);
  const start = String(b.startTime || "");
  if (!courseId || !coachId || !weekday || weekday < 1 || weekday > 7 || !isTime(start)) return bad("缺少课程/教练/星期/开始时间");
  const [course] = await rawSql`SELECT * FROM course_categories WHERE id = ${courseId} AND tenant_id = 1 AND is_active = 1`;
  if (!course) return bad("课程不存在或已停用", 404);
  const [coach] = await rawSql`SELECT id FROM users WHERE id = ${coachId} AND tenant_id = 1 AND status = 'active'`;
  if (!coach) return bad("教练不存在", 404);
  const end = b.endTime ? String(b.endTime) : addMinutes(start, Number(course.duration_minutes || 60));
  if (!isTime(end) || end <= start) return bad("结束时间无效");
  const [row] = await rawSql`
    INSERT INTO schedule_templates
      (tenant_id, course_id, coach_id, room_id, weekday, start_time, end_time, capacity, effective_from, effective_to, is_active)
    VALUES
      (1, ${courseId}, ${coachId}, ${roomId}, ${weekday}, ${start}, ${end},
       ${Math.max(1, Number(b.capacity || course.default_capacity || 6))},
       ${b.effectiveFrom || null}, ${b.effectiveTo || null}, ${b.isActive === 0 ? 0 : 1})
    RETURNING *`;
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const id = Number(b.id);
  if (!id) return bad("缺少 id");
  const [existing] = await rawSql`SELECT * FROM schedule_templates WHERE id = ${id} AND tenant_id = 1`;
  if (!existing) return bad("模板不存在", 404);
  const courseId = b.courseId ? Number(b.courseId) : existing.course_id;
  const coachId = b.coachId ? Number(b.coachId) : existing.coach_id;
  const roomId = b.roomId !== undefined ? (b.roomId ? Number(b.roomId) : null) : existing.room_id;
  const start = b.startTime || existing.start_time;
  const [course] = await rawSql`SELECT * FROM course_categories WHERE id = ${courseId} AND tenant_id = 1`;
  if (!course) return bad("课程不存在", 404);
  const end = b.endTime || existing.end_time || addMinutes(start, Number(course.duration_minutes || 60));
  const [row] = await rawSql`
    UPDATE schedule_templates SET
      course_id = ${courseId}, coach_id = ${coachId}, room_id = ${roomId},
      weekday = ${b.weekday !== undefined ? Number(b.weekday) : existing.weekday},
      start_time = ${start}, end_time = ${end},
      capacity = ${b.capacity !== undefined ? Math.max(1, Number(b.capacity)) : existing.capacity},
      effective_from = ${b.effectiveFrom !== undefined ? b.effectiveFrom : existing.effective_from},
      effective_to = ${b.effectiveTo !== undefined ? b.effectiveTo : existing.effective_to},
      is_active = ${b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.is_active}
    WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少 id");
  const [row] = await rawSql`DELETE FROM schedule_templates WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  if (!row) return bad("模板不存在", 404);
  return NextResponse.json({ success: true });
}
