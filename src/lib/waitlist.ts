import { rawSql } from "@/db";

let ready: Promise<void> | null = null;

export function ensureWaitlistIndex() {
  if (!ready) {
    ready = rawSql`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_waitlist_booking
      ON bookings(session_id, member_id) WHERE status = 'waitlisted'
    `.then(() => undefined).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/**
 * Cancel a booked or waitlisted reservation.
 * A freed seat is given to the earliest waitlisted member in the same statement,
 * so booked_count does not dip and get grabbed by a new booking first.
 */
export async function releaseBooking(opts: { bookingId: number; reason: string; memberId?: number }) {
  await ensureWaitlistIndex();
  const memberFilter = opts.memberId ?? 0;
  const rows = await rawSql`
    WITH target AS (
      SELECT id, session_id, member_id, status
      FROM bookings
      WHERE id = ${opts.bookingId} AND tenant_id = 1
        AND (${memberFilter} = 0 OR member_id = ${memberFilter})
      FOR UPDATE
    ), cancelled AS (
      UPDATE bookings b
      SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${opts.reason}, updated_at = NOW()
      FROM target t
      WHERE b.id = t.id AND t.status IN ('booked', 'waitlisted')
      RETURNING b.id, b.session_id, b.member_id, b.status, t.status AS prev_status
    ), promoted AS (
      UPDATE bookings b
      SET status = 'booked', updated_at = NOW()
      WHERE b.id = (
        SELECT w.id FROM bookings w
        JOIN cancelled c ON c.session_id = w.session_id AND c.prev_status = 'booked'
        WHERE w.tenant_id = 1 AND w.status = 'waitlisted'
        ORDER BY w.booked_at ASC, w.id ASC
        LIMIT 1
      )
      RETURNING b.id, b.member_id
    ), released AS (
      UPDATE class_sessions s
      SET booked_count = GREATEST(s.booked_count - 1, 0), updated_at = NOW()
      WHERE s.id IN (SELECT session_id FROM cancelled WHERE prev_status = 'booked')
        AND NOT EXISTS (SELECT 1 FROM promoted)
      RETURNING s.id
    )
    SELECT
      (SELECT id FROM cancelled) AS cancelled_id,
      (SELECT prev_status FROM cancelled) AS prev_status,
      (SELECT session_id FROM cancelled) AS session_id,
      (SELECT id FROM promoted) AS promoted_id
  `;
  const row = rows[0] || {};
  if (!row.cancelled_id) {
    const [again] = await rawSql`SELECT id, status, member_id FROM bookings WHERE id = ${opts.bookingId} AND tenant_id = 1`;
    if (!again) return { ok: false as const, status: 404, error: "预约不存在" };
    if (opts.memberId && Number(again.member_id) !== opts.memberId) {
      return { ok: false as const, status: 403, error: "无权操作该预约" };
    }
    if (again.status === "cancelled") return { ok: true as const, duplicate: true, promoted: false };
    return { ok: false as const, status: 409, error: "该预约不可取消" };
  }
  return {
    ok: true as const,
    duplicate: false,
    promoted: Boolean(row.promoted_id),
    sessionId: Number(row.session_id),
    prevStatus: String(row.prev_status || ""),
  };
}
