import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminUser, requireRole } from "@/lib/auth/rbac";
import { rawSql } from "@/db";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
async function conflicts(date: string, start: string, end: string, coachId: number, roomId: number | null, excludeId?: number) {
  const coach = await rawSql`
    SELECT s.id, s.start_time, s.end_time, c.name AS course_name
    FROM class_sessions s JOIN course_categories c ON c.id = s.course_category_id
    WHERE s.tenant_id = 1 AND s.session_date = ${date} AND s.status <> 'cancelled'
      AND s.coach_id = ${coachId} AND s.start_time < ${end} AND s.end_time > ${start}
      AND (${excludeId || 0} = 0 OR s.id <> ${excludeId || 0})`;
  const room = roomId ? await rawSql`
    SELECT s.id, s.start_time, s.end_time, c.name AS course_name
    FROM class_sessions s JOIN course_categories c ON c.id = s.course_category_id
    WHERE s.tenant_id = 1 AND s.session_date = ${date} AND s.status <> 'cancelled'
      AND s.room_id = ${roomId} AND s.start_time < ${end} AND s.end_time > ${start}
      AND (${excludeId || 0} = 0 OR s.id <> ${excludeId || 0})` : [];
  const warnings: string[] = [];
  if (coach.length) warnings.push(`教练时间冲突：${coach.map((x: any) => `${x.start_time}-${x.end_time} ${x.course_name}`).join("；")}`);
  if (room.length) warnings.push(`教室时间冲突：${room.map((x: any) => `${x.start_time}-${x.end_time} ${x.course_name}`).join("；")}`);
  return warnings;
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const u = new URL(request.url);
  const from = u.searchParams.get("from") || u.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const to = u.searchParams.get("to") || from;
  const coachId = Number(u.searchParams.get("coachId") || 0);
  if (!isDate(from) || !isDate(to)) return bad("日期格式应为 YYYY-MM-DD");
  const rows = coachId
    ? await rawSql`
        SELECT s.*, c.name AS course_name, c.key AS course_key, u.name AS coach_name, r.name AS room_name
        FROM class_sessions s
        JOIN course_categories c ON c.id = s.course_category_id
        LEFT JOIN users u ON u.id = s.coach_id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE s.tenant_id = 1 AND s.session_date BETWEEN ${from} AND ${to} AND s.coach_id = ${coachId}
        ORDER BY s.session_date, s.start_time`
    : await rawSql`
        SELECT s.*, c.name AS course_name, c.key AS course_key, u.name AS coach_name, r.name AS room_name
        FROM class_sessions s
        JOIN course_categories c ON c.id = s.course_category_id
        LEFT JOIN users u ON u.id = s.coach_id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE s.tenant_id = 1 AND s.session_date BETWEEN ${from} AND ${to}
        ORDER BY s.session_date, s.start_time`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const b = await request.json();
  const courseId = Number(b.courseCategoryId), coachId = Number(b.coachId);
  const roomId = b.roomId ? Number(b.roomId) : null;
  const date = String(b.sessionDate || ""), start = String(b.startTime || "");
  if (!courseId || !coachId || !isDate(date) || !isTime(start)) return bad("缺少课程/教练/日期/开始时间");
  const [course] = await rawSql`SELECT * FROM course_categories WHERE id = ${courseId} AND tenant_id = 1 AND is_active = 1`;
  if (!course) return bad("课程不存在或已停用", 404);
  const [coach] = await rawSql`SELECT id FROM users WHERE id = ${coachId} AND tenant_id = 1 AND status = 'active'`;
  if (!coach) return bad("教练不存在", 404);
  if (roomId) {
    const [room] = await rawSql`SELECT id FROM rooms WHERE id = ${roomId} AND tenant_id = 1 AND is_active = 1`;
    if (!room) return bad("教室不存在或已停用", 404);
  }
  const end = b.endTime ? String(b.endTime) : addMinutes(start, Number(course.duration_minutes || 60));
  if (!isTime(end) || end <= start) return bad("结束时间无效");
  const capacity = Math.max(1, Number(b.capacity || course.default_capacity || 6));
  const warnings = await conflicts(date, start, end, coachId, roomId);
  const [row] = await rawSql`
    INSERT INTO class_sessions
      (tenant_id, course_category_id, coach_id, room_id, title, session_date, start_time, end_time, capacity, status, note)
    VALUES
      (1, ${courseId}, ${coachId}, ${roomId}, ${b.title || course.name}, ${date}, ${start}, ${end}, ${capacity}, 'open', ${b.note || null})
    RETURNING *`;
  return NextResponse.json({ session: row, warnings }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin && !requireAdmin(request)) return bad("权限不足，仅店长或店主可修改课次", 403);
  const b = await request.json();
  const id = Number(b.id);
  if (!id) return bad("缺少 id");
  const [existing] = await rawSql`SELECT * FROM class_sessions WHERE id = ${id} AND tenant_id = 1`;
  if (!existing) return bad("课次不存在", 404);
  const courseId = b.courseCategoryId ? Number(b.courseCategoryId) : existing.course_category_id;
  const coachId = b.coachId ? Number(b.coachId) : existing.coach_id;
  const roomId = b.roomId !== undefined ? (b.roomId ? Number(b.roomId) : null) : existing.room_id;
  const date = b.sessionDate || existing.session_date;
  const start = b.startTime || existing.start_time;
  const [course] = await rawSql`SELECT * FROM course_categories WHERE id = ${courseId} AND tenant_id = 1`;
  if (!course) return bad("课程不存在", 404);
  const end = b.endTime || existing.end_time || addMinutes(start, Number(course.duration_minutes || 60));
  if (!isTime(end) || end <= start) return bad("结束时间无效");
  const capacity = b.capacity !== undefined ? Math.max(1, Number(b.capacity)) : existing.capacity;
  const warnings = await conflicts(date, start, end, coachId, roomId, id);
  const [row] = await rawSql`
    UPDATE class_sessions SET
      course_category_id = ${courseId}, coach_id = ${coachId}, room_id = ${roomId},
      title = ${b.title !== undefined ? b.title : existing.title},
      session_date = ${date}, start_time = ${start}, end_time = ${end},
      capacity = ${capacity}, note = ${b.note !== undefined ? b.note : existing.note},
      status = ${b.status || existing.status}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  return NextResponse.json({ session: row, warnings });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin && !requireAdmin(request)) return bad("权限不足，仅店长或店主可取消或删除课次", 403);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少 id");
  const [used] = await rawSql`SELECT id FROM bookings WHERE session_id = ${id} AND status = 'booked' LIMIT 1`;
  if (used) {
    const [row] = await rawSql`UPDATE class_sessions SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
    return NextResponse.json({ success: true, mode: "cancelled", session: row });
  }
  const [row] = await rawSql`DELETE FROM class_sessions WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  if (!row) return bad("课次不存在", 404);
  return NextResponse.json({ success: true, mode: "deleted" });
}
