import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

function calcDurationHours(start: string, end: string): number {
  if (!start || !end) return 1;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 1;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? Number((mins / 60).toFixed(2)) : 1;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);

  const u = new URL(request.url);
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

  // 默认当月
  let from = u.searchParams.get("from");
  let to = u.searchParams.get("to");
  const month = u.searchParams.get("month");

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    from = `${month}-01`;
    to = `${month}-${String(lastDay).padStart(2, "0")}`;
  } else if (!from || !to) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(curYear, now.getMonth() + 1, 0)).getUTCDate();
    from = `${curYear}-${curMonth}-01`;
    to = `${curYear}-${curMonth}-${String(lastDay).padStart(2, "0")}`;
  }

  // 1. 获取所有在任教练
  const coachesRows = await rawSql`
    SELECT id, name, email, avatar_url
    FROM users
    WHERE tenant_id = 1 AND is_coach = 1 AND status = 'active'
    ORDER BY id
  `;

  // 教练姓名去重保护
  const seen = new Set<string>();
  const coaches = coachesRows.filter((r: any) => {
    const n = (r.name || "").trim();
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  // 2. 查询该时间段内的所有排课与学员统计
  const sessionRows = await rawSql`
    SELECT 
      s.id,
      s.coach_id,
      s.session_date,
      s.start_time,
      s.end_time,
      s.capacity,
      s.status AS session_status,
      c.name AS course_name,
      r.name AS room_name,
      COUNT(CASE WHEN b.status IN ('attended', 'checked_in') THEN 1 END) AS attended_count,
      COUNT(CASE WHEN b.status NOT IN ('cancelled') AND b.id IS NOT NULL THEN 1 END) AS booked_count
    FROM class_sessions s
    JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN rooms r ON r.id = s.room_id
    LEFT JOIN bookings b ON b.session_id = s.id
    WHERE s.tenant_id = 1 
      AND s.session_date BETWEEN ${from} AND ${to}
    GROUP BY s.id, c.name, r.name
    ORDER BY s.session_date, s.start_time
  `;

  // 3. 按教练汇总课时与绩效
  let totalOrgSessions = 0;
  let totalOrgCompletedSessions = 0;
  let totalOrgCompletedHours = 0;
  let totalOrgUpcomingSessions = 0;
  let totalOrgCancelledSessions = 0;
  let totalOrgAttendedCount = 0;
  let totalOrgBookedCount = 0;

  const coachStats = coaches.map((coach: any) => {
    const coachSessions = sessionRows.filter((s: any) => s.coach_id === coach.id);

    let totalSessions = 0;
    let completedSessions = 0;
    let completedHours = 0;
    let upcomingSessions = 0;
    let cancelledSessions = 0;
    let totalBookings = 0;
    let totalAttended = 0;
    let totalCapacity = 0;

    const formattedSessions = coachSessions.map((s: any) => {
      const isCancelled = s.session_status === "cancelled";
      const isPastDate = s.session_date < todayStr;
      const isTodayPast = s.session_date === todayStr && s.end_time <= nowTime;
      const isCompleted = !isCancelled && (isPastDate || isTodayPast || s.session_status === "completed");
      const isUpcoming = !isCancelled && !isCompleted;

      const durationHours = calcDurationHours(s.start_time, s.end_time);
      const attended = Number(s.attended_count || 0);
      const booked = Number(s.booked_count || 0);
      const cap = Number(s.capacity || 0);

      totalSessions++;
      totalCapacity += cap;
      totalBookings += booked;
      totalAttended += attended;

      if (isCancelled) {
        cancelledSessions++;
      } else if (isCompleted) {
        completedSessions++;
        completedHours += durationHours;
      } else {
        upcomingSessions++;
      }

      return {
        id: s.id,
        sessionDate: s.session_date,
        startTime: s.start_time,
        endTime: s.end_time,
        durationHours,
        courseName: s.course_name,
        roomName: s.room_name || "待分配教室",
        capacity: cap,
        bookedCount: booked,
        attendedCount: attended,
        status: isCancelled ? "cancelled" : isCompleted ? "completed" : "upcoming",
        rawStatus: s.session_status,
      };
    });

    totalOrgSessions += totalSessions;
    totalOrgCompletedSessions += completedSessions;
    totalOrgCompletedHours += completedHours;
    totalOrgUpcomingSessions += upcomingSessions;
    totalOrgCancelledSessions += cancelledSessions;
    totalOrgAttendedCount += totalAttended;
    totalOrgBookedCount += totalBookings;

    // 出勤率计算 (实际到课人次 / 预约人次)
    const attendanceRate = totalBookings > 0 ? Math.round((totalAttended / totalBookings) * 100) : 0;
    // 满班率计算 (实际到课人次 / 排课总容量)
    const fillRate = totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;

    return {
      coachId: coach.id,
      coachName: coach.name,
      email: coach.email,
      avatarUrl: coach.avatar_url,
      totalSessions,
      completedSessions,
      completedHours: Number(completedHours.toFixed(1)),
      upcomingSessions,
      cancelledSessions,
      totalBookings,
      totalAttended,
      totalCapacity,
      attendanceRate,
      fillRate,
      sessions: formattedSessions,
    };
  });

  // 按已上课时数降序排列（绩效与课时排行）
  coachStats.sort((a: any, b: any) => b.completedHours - a.completedHours || b.totalSessions - a.totalSessions);

  return NextResponse.json({
    period: { from, to, month: month || from.slice(0, 7) },
    summary: {
      totalCoaches: coaches.length,
      totalSessions: totalOrgSessions,
      completedSessions: totalOrgCompletedSessions,
      completedHours: Number(totalOrgCompletedHours.toFixed(1)),
      upcomingSessions: totalOrgUpcomingSessions,
      cancelledSessions: totalOrgCancelledSessions,
      totalBookings: totalOrgBookedCount,
      totalAttended: totalOrgAttendedCount,
    },
    coaches: coachStats,
  });
}
