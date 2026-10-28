import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { releaseBooking } from "@/lib/waitlist";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
function sessionStart(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).getTime();
}
async function cutoffHours() {
  const [r] = await rawSql`SELECT value FROM studio_settings WHERE tenant_id = 1 AND key = 'cancel_cutoff_hours'`;
  return Number(r?.value || 2);
}

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return bad("未登录", 401);
  const body = await request.json();
  const bookingId = Number(body.bookingId);
  if (!bookingId) return bad("缺少 bookingId");

  const [booking] = await rawSql`
    SELECT b.*, s.session_date, s.start_time FROM bookings b
    JOIN class_sessions s ON s.id = b.session_id
    WHERE b.id = ${bookingId} AND b.tenant_id = 1`;
  if (!booking) return bad("预约不存在", 404);
  if (booking.member_id !== memberId) return bad("无权操作该预约", 403);
  if (booking.status === "cancelled") return NextResponse.json({ booking, duplicate: true }, { status: 200 });
  if (!["booked", "waitlisted"].includes(booking.status)) return bad("该预约不可取消", 409);

  if (booking.status === "booked") {
    const start = sessionStart(booking.session_date, booking.start_time);
    const now = Date.now();
    if (start <= now) return bad("课程已开始，无法取消", 409);
    const hours = await cutoffHours();
    if (start - now < hours * 3600_000) return bad(`距开课不足 ${hours} 小时，请联系前台`, 409);
  }

  const result = await releaseBooking({
    bookingId,
    memberId,
    reason: body.reason || (booking.status === "waitlisted" ? "退出候补" : "会员取消"),
  });
  if (!result.ok) return bad(result.error, result.status);
  return NextResponse.json({ ok: true, duplicate: result.duplicate, promoted: result.promoted });
}
