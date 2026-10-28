import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members, classSessions, bookings, memberCards, courseCategories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { memberHasStaffAccess } from "@/lib/staff-access";
import { shanghaiToday } from "@/lib/shanghai-date";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 1. 验证是否具备管理端权限 (小桥 / 教练 / 馆长)
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) {
    return NextResponse.json({ error: "会员不存在" }, { status: 404 });
  }

  const staff = await memberHasStaffAccess(member);
  if (!staff.allowed) {
    return NextResponse.json({ error: "暂无管理权限" }, { status: 403 });
  }
  const today = shanghaiToday();

  // 2. 真实并行查询核心看板数据
  const [
    todayBookingsRes,
    todayCardsRes,
    todayMembersRes,
    recentActivitiesRes,
    allMembersRes,
    todaySessionsRes,
  ] = await Promise.all([
    // 今日预约数
    rawSql`
      SELECT count(*)::int as count
      FROM bookings b
      JOIN class_sessions cs ON b.session_id = cs.id
      WHERE cs.session_date = ${today}
        AND b.status IN ('booked', 'attended')
    `.catch(() => [{ count: 0 }]),

    // 今日新增会员卡
    rawSql`
      SELECT count(*)::int as count
      FROM member_cards
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date = ${today}::date
    `.catch(() => [{ count: 0 }]),

    // 今日新增会员
    rawSql`
      SELECT count(*)::int as count
      FROM members
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date = ${today}::date
    `.catch(() => [{ count: 0 }]),

    // 动态通报条 (最新 6 条预约/取消/出勤动态)
    rawSql`
      SELECT
        b.id,
        b.status,
        b.created_at,
        b.cancelled_at,
        b.updated_at,
        m.name as member_name,
        COALESCE(c.name, cs.title, '普拉提课程') as course_name,
        cs.session_date,
        cs.start_time
      FROM bookings b
      LEFT JOIN members m ON b.member_id = m.id
      LEFT JOIN class_sessions cs ON b.session_id = cs.id
      LEFT JOIN course_categories c ON cs.course_category_id = c.id
      ORDER BY b.updated_at DESC
      LIMIT 6
    `.catch(() => []),

    // 在籍会员数
    rawSql`
      SELECT count(*)::int as total,
             count(CASE WHEN portal_enabled = 1 THEN 1 END)::int as portal_count
      FROM members
      WHERE status = 'active'
    `.catch(() => [{ total: 0, portal_count: 0 }]),

    // 今日课程场次与预约名单
    rawSql`
      SELECT
        cs.id,
        cs.title,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.capacity,
        cs.booked_count,
        cs.status as session_status,
        COALESCE(c.name, cs.title) as course_name,
        COALESCE(coach_user.name, '专业导师') as coach_name,
        COALESCE(r.name, '主操房') as room_name
      FROM class_sessions cs
      LEFT JOIN course_categories c ON cs.course_category_id = c.id
      LEFT JOIN users coach_user ON cs.coach_id = coach_user.id
      LEFT JOIN rooms r ON cs.room_id = r.id
      WHERE cs.session_date = ${today}
      ORDER BY cs.start_time ASC
    `.catch(() => []),
  ]);

  const response = NextResponse.json({
    managerName: member.name,
    managerRole: staff.role || "coach",
    todayBookingsCount: Number(todayBookingsRes[0]?.count || 0),
    todayNewCardsCount: Number(todayCardsRes[0]?.count || 0),
    todayNewMembersCount: Number(todayMembersRes[0]?.count || 0),
    totalMembersCount: Number(allMembersRes[0]?.total || 0),
    portalEnabledCount: Number(allMembersRes[0]?.portal_count || 0),
    recentActivities: recentActivitiesRes.map((r: any) => ({
      id: Number(r.id),
      status: String(r.status || "booked"),
      created_at: String(r.created_at || ""),
      cancelled_at: r.cancelled_at ? String(r.cancelled_at) : null,
      updated_at: String(r.updated_at || r.created_at || ""),
      member_name: String(r.member_name || "会员"),
      course_name: String(r.course_name || "普拉提课程"),
      session_date: String(r.session_date || ""),
      start_time: String(r.start_time || ""),
    })),
    todaySessions: todaySessionsRes.map((s: any) => ({
      id: Number(s.id),
      courseName: String(s.course_name),
      startTime: String(s.start_time),
      endTime: String(s.end_time),
      coachName: String(s.coach_name),
      roomName: String(s.room_name),
      capacity: Number(s.capacity || 0),
      bookedCount: Number(s.booked_count || 0),
      status: String(s.session_status || "open"),
    })),
  });

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
