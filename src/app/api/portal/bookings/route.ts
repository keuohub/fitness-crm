import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const today = () => new Date().toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function sessionStart(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).getTime();
}
async function settings() {
  const rows = await rawSql`SELECT key, value FROM studio_settings WHERE tenant_id = 1`;
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
}

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return bad("未登录", 401);
  const u = new URL(request.url);
  const scope = u.searchParams.get("scope") || "all";
  const rows = await rawSql`
    SELECT b.id, b.session_id, b.status, b.booked_at, b.cancelled_at, b.cancel_reason,
           s.session_date, s.start_time, s.end_time, s.capacity, s.booked_count,
           c.name AS course_name, u2.name AS coach_name, r.name AS room_name
    FROM bookings b
    JOIN class_sessions s ON s.id = b.session_id
    JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN users u2 ON u2.id = s.coach_id
    LEFT JOIN rooms r ON r.id = s.room_id
    WHERE b.tenant_id = 1 AND b.member_id = ${memberId}
      AND (${scope !== "upcoming"} OR (b.status = 'booked' AND s.session_date >= ${today()}))
    ORDER BY s.session_date DESC, s.start_time DESC LIMIT 100`;
  const response = NextResponse.json({ bookings: rows });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return bad("未登录", 401);
  const body = await request.json();
  const sessionId = Number(body.sessionId);
  if (!sessionId) return bad("缺少 sessionId");
  const key = body.idempotencyKey ? String(body.idempotencyKey) : `m${memberId}-${sessionId}-${Date.now()}`;

  const [existing] = await rawSql`
    SELECT * FROM bookings WHERE tenant_id = 1 AND member_id = ${memberId}
      AND session_id = ${sessionId} AND status = 'booked' LIMIT 1`;
  if (existing) return NextResponse.json({ booking: existing, duplicate: true }, { status: 200 });

  const [session] = await rawSql`
    SELECT s.*, c.name AS course_name FROM class_sessions s
    JOIN course_categories c ON c.id = s.course_category_id
    WHERE s.id = ${sessionId} AND s.tenant_id = 1`;
  if (!session) return bad("课次不存在", 404);
  if (session.status !== "open") return bad("该课次不可预约", 409);

  // 预约卡种与课程权限强校验（P0-A）
  const [validCard] = await rawSql`
    SELECT mc.id, ct.category, ct.name AS card_name
    FROM member_cards mc
    JOIN card_types ct ON ct.id = mc.card_type_id
    JOIN class_sessions s ON s.id = ${sessionId}
    WHERE mc.tenant_id = 1 AND mc.member_id = ${memberId}
      AND mc.status = 'active'
      AND (mc.valid_from IS NULL OR mc.valid_from::date <= CURRENT_DATE)
      AND (mc.valid_until IS NULL OR mc.valid_until::date >= CURRENT_DATE)
      AND (ct.category = 'period' OR mc.remaining_count > 0)
      AND (
        EXISTS (
          SELECT 1 FROM card_type_courses ctc
          WHERE ctc.card_type_id = ct.id
            AND ctc.course_category_id = s.course_category_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM card_type_courses ctc_none
          WHERE ctc_none.card_type_id = ct.id
        )
      )
    ORDER BY CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END,
             CASE WHEN mc.valid_until IS NULL THEN 1 ELSE 0 END,
             mc.valid_until, mc.id
    LIMIT 1`;

  if (!validCard) {
    // 区分三种错误状态：
    // a. 检查会员是否有任何有效卡（不论课种）
    const validOtherCards = await rawSql`
      SELECT mc.id, ct.name AS card_name
      FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
      WHERE mc.tenant_id = 1 AND mc.member_id = ${memberId}
        AND mc.status = 'active'
        AND (mc.valid_from IS NULL OR mc.valid_from::date <= CURRENT_DATE)
        AND (mc.valid_until IS NULL OR mc.valid_until::date >= CURRENT_DATE)
        AND (ct.category = 'period' OR mc.remaining_count > 0)
      LIMIT 1`;

    if (validOtherCards.length > 0) {
      // 有有效卡，但该卡无权约本课
      const allowedCardTypes = await rawSql`
        SELECT ct.name FROM card_types ct
        JOIN card_type_courses ctc ON ctc.card_type_id = ct.id
        WHERE ctc.course_category_id = ${session.course_category_id} AND ct.is_active = 1
      `;
      const allowedNames = allowedCardTypes.map((r: any) => r.name).join("或");
      return bad(`这张卡不能约${session.course_name}，请使用${allowedNames || "对应专属卡"}或联系小桥`, 422);
    }

    // b. 检查是否有历史卡（过期、冻结、次数耗尽）
    const [anyCard] = await rawSql`
      SELECT id, status FROM member_cards
      WHERE tenant_id = 1 AND member_id = ${memberId} ORDER BY id DESC LIMIT 1`;
    return bad(anyCard ? "会员卡已冻结、过期或次数不足，暂不能预约" : "还没有有效会员卡，请联系小桥开卡后再预约", 422);
  }

  const s = await settings();
  const cutoffHours = Number(s.cancel_cutoff_hours || 2);
  const advanceDays = Number(s.booking_advance_days || 7);
  const sameDayLimit = Number(s.same_day_limit || 2);
  const start = sessionStart(session.session_date, session.start_time);
  const now = Date.now();
  if (start <= now + cutoffHours * 3600_000) return bad("距开课不足 2 小时，无法预约", 409);
  if (start > now + advanceDays * 86400_000) return bad(`最多提前 ${advanceDays} 天预约`, 409);

  const [{ n }] = await rawSql`
    SELECT COUNT(*)::int AS n FROM bookings b
    JOIN class_sessions s ON s.id = b.session_id
    WHERE b.tenant_id = 1 AND b.member_id = ${memberId} AND b.status = 'booked'
      AND s.session_date = ${session.session_date}`;
  if (Number(n) >= sameDayLimit) return bad(`同一天最多预约 ${sameDayLimit} 节`, 409);

  try {
    const rows = await rawSql`
      WITH seat AS (
        UPDATE class_sessions
        SET booked_count = booked_count + 1, updated_at = NOW()
        WHERE id = ${sessionId} AND tenant_id = 1 AND status = 'open'
          AND booked_count < capacity
        RETURNING id, capacity, booked_count
      ), inserted AS (
        INSERT INTO bookings (tenant_id, session_id, member_id, status, idempotency_key)
        SELECT 1, ${sessionId}, ${memberId}, 'booked', ${key} FROM seat
        RETURNING *
      )
      SELECT inserted.*, seat.capacity, seat.booked_count FROM inserted, seat`;
    if (!rows.length) {
      const [again] = await rawSql`
        SELECT * FROM bookings WHERE tenant_id = 1 AND member_id = ${memberId}
          AND session_id = ${sessionId} AND status = 'booked' LIMIT 1`;
      if (again) return NextResponse.json({ booking: again, duplicate: true }, { status: 200 });
      return bad("名额已满", 409);
    }
    const booking = rows[0];
    return NextResponse.json({
      booking,
      remaining: Math.max(0, Number(booking.capacity) - Number(booking.booked_count)),
    }, { status: 201 });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("uniq_booking_idem") || msg.includes("uniq_active_booking")) {
      const [again] = await rawSql`
        SELECT * FROM bookings WHERE tenant_id = 1 AND member_id = ${memberId}
          AND session_id = ${sessionId} AND status = 'booked' LIMIT 1`;
      if (again) return NextResponse.json({ booking: again, duplicate: true }, { status: 200 });
    }
    console.error("[portal/bookings] reserve error", err);
    return bad("预约失败，请重试", 500);
  }
}
