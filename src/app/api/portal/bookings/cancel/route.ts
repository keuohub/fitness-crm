import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { sendSubscribeMessage } from "@/lib/wechat/subscribe";
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
  if (booking.status !== "booked" && booking.status !== "waitlist") return bad("该预约不可取消", 409);

  // 如果取消的是候补排队，直接取消候补即可，不影响课次席位
  if (booking.status === "waitlist") {
    const [cancelledWaitlist] = await rawSql`
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${body.reason || "会员取消候补"}, updated_at = NOW()
      WHERE id = ${bookingId} AND tenant_id = 1
      RETURNING *`;
    return NextResponse.json({ booking: cancelledWaitlist, message: "已成功取消候补排队" });
  }

  const start = sessionStart(booking.session_date, booking.start_time);
  const now = Date.now();
  if (start <= now) return bad("课程已开始，无法取消", 409);
  const cutoff = (await cutoffHours()) * 3600_000;
  if (start - now < cutoff) return bad("距开课不足 2 小时，请联系前台", 409);

  // 1. 取消当前正选预约
  const [cancelledBooking] = await rawSql`
    UPDATE bookings
    SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${body.reason || "会员取消"}, updated_at = NOW()
    WHERE id = ${bookingId} AND tenant_id = 1 AND status = 'booked'
    RETURNING *`;
  if (!cancelledBooking) {
    const [again] = await rawSql`SELECT * FROM bookings WHERE id = ${bookingId} AND tenant_id = 1`;
    if (again?.status === "cancelled") return NextResponse.json({ booking: again, duplicate: true }, { status: 200 });
    return bad("取消失败", 409);
  }

  // 2. 检查是否有排队中的候补会员 (FIFO 先到先得)
  const [candidate] = await rawSql`
    SELECT b.*, m.name AS member_name, m.wechat_open_id AS openid
    FROM bookings b
    JOIN members m ON m.id = b.member_id
    WHERE b.session_id = ${booking.session_id} AND b.tenant_id = 1 AND b.status = 'waitlist'
    ORDER BY b.booked_at ASC
    LIMIT 1`;

  let promoted = null;
  if (candidate) {
    // 自动晋升第 1 顺位候补学员为正选预约，class_sessions 席位数保持不变 (一退一进)
    const [promotedBooking] = await rawSql`
      UPDATE bookings
      SET status = 'booked', updated_at = NOW()
      WHERE id = ${candidate.id} AND tenant_id = 1
      RETURNING *`;
    promoted = promotedBooking;

    // 异步通知候补成功的会员
    (async () => {
      try {
        if (candidate.openid) {
          await sendSubscribeMessage({
            openid: candidate.openid,
            templateKey: "booking_success",
            page: "pages/schedule/schedule",
            data: {
              thing1: { value: "候补成功·自动锁定席位" },
              time2: { value: `${booking.session_date} ${booking.start_time}` },
              name3: { value: String(candidate.member_name || "学员").slice(0, 10) }
            }
          });
        }
      } catch (e) {}
    })();
  } else {
    // 没有候补会员，正常扣减已约人数
    await rawSql`
      UPDATE class_sessions
      SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
      WHERE id = ${booking.session_id} AND tenant_id = 1`;
  }

  // 异步触发取消预约订阅消息（未配模板则安全跳过）
  (async () => {
    try {
      const [m] = await rawSql`SELECT wechat_open_id AS openid FROM members WHERE id = ${memberId} LIMIT 1`;
      if (m?.openid) {
        await sendSubscribeMessage({
          openid: m.openid,
          templateKey: "booking_cancel",
          page: "pages/schedule/schedule",
          data: {
            thing1: { value: "普拉提预约取消" },
            time2: { value: `${booking.session_date} ${booking.start_time}` }
          }
        });
      }
    } catch (e) {}
  })();

  return NextResponse.json({ booking: cancelledBooking, promoted });
}
