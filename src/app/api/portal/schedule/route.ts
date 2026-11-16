import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { reconcileBookedCounts } from "@/lib/booked-count";

// 严格按北京时间 (Asia/Shanghai UTC+8) 计算当前日期
const beijingToday = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const u = new URL(request.url);
  const from = u.searchParams.get("from") || beijingToday();
  const to = u.searchParams.get("to") || addDays(from, 7);
  if (!isDate(from) || !isDate(to)) return NextResponse.json({ error: "日期格式错误" }, { status: 400 });

  // 会员正要看"还剩几个位"，先把名额计数和真实预约对齐（内部有 60 秒节流）
  await reconcileBookedCounts();

  const sessions = await rawSql`
    SELECT s.id, s.course_category_id, s.coach_id, s.room_id, s.title,
           s.session_date, s.start_time, s.end_time, s.capacity, s.booked_count, s.status,
           c.name AS course_name, c.key AS course_key, c.category_type, c.difficulty_stars,
           c.cover_image, c.description AS course_desc,
           u2.name AS coach_name, r.name AS room_name
    FROM class_sessions s
    JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN users u2 ON u2.id = s.coach_id
    LEFT JOIN rooms r ON r.id = s.room_id
    WHERE s.tenant_id = 1 AND s.session_date BETWEEN ${from} AND ${to} AND s.status <> 'cancelled'
    ORDER BY s.session_date, s.start_time`;

  // 查每个课次的排队人数 (waitlist count)
  const waitlistCounts = await rawSql`
    SELECT session_id, COUNT(*)::int AS cnt
    FROM bookings
    WHERE tenant_id = 1 AND status = 'waitlist'
    GROUP BY session_id
  `;
  const waitlistMap = new Map(waitlistCounts.map((w: any) => [w.session_id, Number(w.cnt || 0)]));

  const mine = await rawSql`
    SELECT b.id, b.session_id, b.status, b.booked_at
    FROM bookings b JOIN class_sessions s ON s.id = b.session_id
    WHERE b.tenant_id = 1 AND b.member_id = ${memberId}
      AND b.status IN ('booked', 'waitlist') AND s.session_date BETWEEN ${from} AND ${to}`;
  const mineMap = new Map(mine.map((b: any) => [b.session_id, b]));

  const waitlistPositions = new Map<number, number>();
  for (const m of mine) {
    if (m.status === 'waitlist') {
      const [posRow] = await rawSql`
        SELECT COUNT(*)::int AS pos
        FROM bookings
        WHERE tenant_id = 1 AND session_id = ${m.session_id} AND status = 'waitlist'
          AND booked_at <= ${m.booked_at}
      `;
      waitlistPositions.set(m.session_id, Number(posRow?.pos || 1));
    }
  }

  const rows = sessions.map((s: any) => {
    const myRec = mineMap.get(s.id);
    const bookedByMe = myRec?.status === 'booked';
    const waitlistedByMe = myRec?.status === 'waitlist';
    const waitlistCount = waitlistMap.get(s.id) || 0;
    const waitlistPosition = waitlistPositions.get(s.id) || 0;
    return {
      id: s.id,
      courseName: s.course_name,
      courseKey: s.course_key || "",
      categoryType: s.category_type || "boutique",
      difficultyStars: Number(s.difficulty_stars || 3),
      coverImage: s.cover_image || "",
      description: s.course_desc || "",
      coachName: s.coach_name,
      roomName: s.room_name,
      title: s.title,
      sessionDate: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
      capacity: s.capacity,
      bookedCount: s.booked_count,
      remaining: Math.max(0, Number(s.capacity) - Number(s.booked_count)),
      waitlistCount,
      status: s.status,
      bookedByMe,
      waitlistedByMe,
      waitlistPosition,
      bookingId: myRec?.id || null,
      bookingStatus: myRec?.status || null,
    };
  });

  const response = NextResponse.json({ from, to, sessions: rows });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
