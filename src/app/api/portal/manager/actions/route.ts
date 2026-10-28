import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members, classSessions, bookings, courseCategories, rooms, teamMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { memberHasStaffAccess } from "@/lib/staff-access";
import { shanghaiToday } from "@/lib/shanghai-date";
import { normalizePhone } from "@/lib/member-import";
import { generatePortalCode, generateLoginPin } from "@/lib/auth/member-credentials";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

// 校验管家/管理权限
async function checkManagerAuth(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return null;

  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return null;

  const staff = await memberHasStaffAccess(member);
  return staff.allowed ? member : null;
}

export async function GET(request: NextRequest) {
  const manager = await checkManagerAuth(request);
  if (!manager) return bad("无权访问管家操作接口", 403);

  const u = new URL(request.url);
  const action = u.searchParams.get("action") || "";

  // 1. 获取某天的场次以及每个场次下的详细预约学员名单
  if (action === "bookings") {
    const date = u.searchParams.get("date") || shanghaiToday();
    const sessions = await rawSql`
      SELECT
        cs.id,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.capacity,
        cs.booked_count,
        cs.status,
        COALESCE(c.name, cs.title) as course_name,
        COALESCE(coach_user.name, '专业导师') as coach_name,
        COALESCE(r.name, '主操房') as room_name
      FROM class_sessions cs
      LEFT JOIN course_categories c ON cs.course_category_id = c.id
      LEFT JOIN users coach_user ON cs.coach_id = coach_user.id
      LEFT JOIN rooms r ON cs.room_id = r.id
      WHERE cs.session_date = ${date}
      ORDER BY cs.start_time ASC
    `.catch(() => []);

    const sessionIds = sessions.map((s: any) => s.id);
    let sessionBookings: any[] = [];
    if (sessionIds.length > 0) {
      sessionBookings = await rawSql`
        SELECT
          b.id,
          b.session_id,
          b.member_id,
          b.status,
          b.booked_at,
          m.name as member_name,
          m.phone as member_phone,
          m.member_code
        FROM bookings b
        JOIN members m ON b.member_id = m.id
        WHERE b.session_id = ANY(${sessionIds})
          AND b.status IN ('booked', 'attended')
        ORDER BY b.id ASC
      `.catch(() => []);
    }

    const sessionsWithBookings = sessions.map((s: any) => ({
      ...s,
      attendees: sessionBookings.filter((b: any) => b.session_id === s.id),
    }));

    return NextResponse.json({ date, sessions: sessionsWithBookings });
  }

  // 2. 获取所有课程项目（供小程序直接编辑课程名称、星级、简介与分类）
  if (action === "courses") {
    const list = await rawSql`
      SELECT id, name, category_type, difficulty_stars, description, cover_image
      FROM course_categories
      ORDER BY id ASC
    `.catch(() => []);
    return NextResponse.json({ courses: list });
  }

  // 3. 获取导师与教室字典（供排课下拉选择）
  if (action === "options") {
    const coaches = await rawSql`SELECT id, name FROM team_members WHERE is_active = 1 ORDER BY sort_order ASC`.catch(() => []);
    const roomList = await rawSql`SELECT id, name, capacity FROM rooms ORDER BY id ASC`.catch(() => []);
    const courses = await rawSql`SELECT id, name, category_type FROM course_categories ORDER BY id ASC`.catch(() => []);
    return NextResponse.json({ coaches, rooms: roomList, courses });
  }

  return bad("未知 action");
}

export async function POST(request: NextRequest) {
  const manager = await checkManagerAuth(request);
  if (!manager) return bad("无权执行管家操作", 403);

  const u = new URL(request.url);
  const action = u.searchParams.get("action") || "";
  const body = await request.json().catch(() => ({}));

  // 1. 取消预约并退还课时
  if (action === "cancel_booking") {
    const bookingId = Number(body.bookingId);
    if (!bookingId) return bad("缺少 bookingId");

    const [booking] = await rawSql`SELECT * FROM bookings WHERE id = ${bookingId}`;
    if (!booking) return bad("预约不存在", 404);
    if (booking.status === "cancelled") return NextResponse.json({ success: true, message: "已是取消状态" });
    if (booking.status !== "booked") return bad("已签到或已结束的预约不能在这里取消，避免把名额和课时算错", 409);

    const rows = await rawSql`
      WITH updated AS (
        UPDATE bookings
        SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${body.reason || "管家端手机取消"}, updated_at = NOW()
        WHERE id = ${bookingId} AND tenant_id = 1 AND status = 'booked'
        RETURNING session_id
      ), released AS (
        UPDATE class_sessions
        SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
        WHERE id IN (SELECT session_id FROM updated)
        RETURNING id
      )
      SELECT session_id FROM updated
    `;
    if (!rows.length) return bad("预约状态已变化，请刷新后再试", 409);

    return NextResponse.json({ success: true, message: "预约已取消，席位已释放" });
  }

  // 2. 现场录入新会员
  if (action === "create_member") {
    const name = String(body.name || "").trim();
    const phoneParsed = normalizePhone(String(body.phone || ""));
    const phone = phoneParsed.phone;
    if (!name || !phone) return bad(phoneParsed.error || "请填写会员姓名和手机号");

    const [exist] = await rawSql`
      SELECT id, name FROM members
      WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = ${phone}
      LIMIT 1
    `.catch(() => []);
    if (exist) return bad(`手机号已被会员【${exist.name}】使用`);

    // 自动分配下一个会员卡号 LWxxxx
    const [maxIdRow] = await rawSql`SELECT MAX(id) as max_id FROM members`.catch(() => [{ max_id: 100 }]);
    const nextCode = `LW${String((maxIdRow?.max_id || 100) + 1).padStart(4, "0")}`;

    let portalCode = "";
    for (let t = 0; t < 20; t++) {
      const c = generatePortalCode();
      const [dup] = await rawSql`SELECT id FROM members WHERE portal_code = ${c} LIMIT 1`;
      if (!dup) { portalCode = c; break; }
    }
    if (!portalCode) return bad("邀请码生成失败，请重试");
    const loginPin = generateLoginPin();
    const [newMem] = await rawSql`
      INSERT INTO members (tenant_id, name, phone, member_code, portal_code, login_pin, status, portal_enabled, joined_at, created_at, updated_at)
      VALUES (1, ${name}, ${phone}, ${nextCode}, ${portalCode}, ${loginPin}, 'active', 1, ${shanghaiToday()}, NOW(), NOW())
      RETURNING id, name, phone, member_code, portal_code, login_pin
    `;

    return NextResponse.json({
      success: true,
      member: newMem,
      message: `会员【${name}】录入成功。邀请码 ${portalCode}，登录 PIN ${loginPin}`,
    });
  }

  // 3. 修改课程信息（名称、分类、星级、简介）
  if (action === "update_course") {
    const courseId = Number(body.id);
    const name = String(body.name || "").trim();
    const categoryType = String(body.categoryType || "boutique");
    const difficultyStars = Math.max(1, Math.min(5, Number(body.difficultyStars || 3)));
    const description = String(body.description || "").trim();

    if (!courseId || !name) return bad("课程ID与名称不能为空");

    await rawSql`
      UPDATE course_categories
      SET name = ${name},
          category_type = ${categoryType},
          difficulty_stars = ${difficultyStars},
          description = ${description}
      WHERE id = ${courseId}
    `;

    return NextResponse.json({ success: true, message: `课程【${name}】已保存并同步小程序` });
  }

  // 4. 快速新增一节排课
  if (action === "create_session") {
    const courseCategoryId = Number(body.courseCategoryId);
    const coachId = Number(body.coachId) || null;
    const roomId = Number(body.roomId) || null;
    const sessionDate = String(body.sessionDate || "").trim();
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();
    const capacity = Number(body.capacity || 6);

    if (!courseCategoryId || !sessionDate || !startTime || !endTime) {
      return bad("排课缺少必要信息（课程、日期或时段）");
    }

    const [course] = await rawSql`SELECT name FROM course_categories WHERE id = ${courseCategoryId} LIMIT 1`.catch(() => []);
    const title = course?.name || "普拉提课程";

    const [newSession] = await rawSql`
      INSERT INTO class_sessions (
        tenant_id, course_category_id, coach_id, room_id, title,
        session_date, start_time, end_time, capacity, booked_count,
        status, created_at, updated_at
      ) VALUES (
        1, ${courseCategoryId}, ${coachId}, ${roomId}, ${title},
        ${sessionDate}, ${startTime}, ${endTime}, ${capacity}, 0,
        'open', NOW(), NOW()
      )
      RETURNING id, title, session_date, start_time, end_time
    `;

    return NextResponse.json({ success: true, session: newSession, message: `排课成功：${sessionDate} ${startTime} ${title}` });
  }

  return bad("未知 action");
}
