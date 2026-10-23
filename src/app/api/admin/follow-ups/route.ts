import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
const today = () => new Date().toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  const t = today();
  const in30 = addDays(t, 30);

  const lowBalance = await rawSql`
    SELECT mc.id AS card_id, mc.member_id, mc.remaining_count, mc.valid_until,
           m.name AS member_name, m.phone AS member_phone, ct.name AS card_name
    FROM member_cards mc
    JOIN members m ON m.id = mc.member_id
    JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.tenant_id = 1 AND mc.status = 'active' AND ct.category = 'count'
      AND mc.remaining_count <= 3
      AND (mc.valid_until IS NULL OR mc.valid_until >= ${t})
    ORDER BY mc.remaining_count, mc.valid_until LIMIT 100`;

  const expiring = await rawSql`
    SELECT mc.id AS card_id, mc.member_id, mc.valid_until, mc.remaining_count,
           m.name AS member_name, m.phone AS member_phone, ct.name AS card_name
    FROM member_cards mc
    JOIN members m ON m.id = mc.member_id
    JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.tenant_id = 1 AND mc.status = 'active'
      AND mc.valid_until IS NOT NULL AND mc.valid_until >= ${t} AND mc.valid_until <= ${in30}
    ORDER BY mc.valid_until LIMIT 100`;

  const inactive30d = await rawSql`
    SELECT m.id AS member_id, m.name AS member_name, m.phone AS member_phone,
           MAX(s.session_date) AS last_attended
    FROM members m
    JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active' AND mc.tenant_id = 1
    LEFT JOIN attendance a ON a.member_id = m.id AND a.status = 'attended'
    LEFT JOIN class_sessions s ON s.id = a.session_id
    WHERE m.tenant_id = 1 AND m.status <> 'archived'
    GROUP BY m.id, m.name, m.phone
    HAVING MAX(s.session_date) IS NULL OR MAX(s.session_date) < ${addDays(t, -30)}
    ORDER BY MAX(s.session_date) NULLS FIRST LIMIT 100`;

  const birthRows = await rawSql`
    SELECT id AS member_id, name AS member_name, phone AS member_phone, birthday
    FROM members WHERE tenant_id = 1 AND status <> 'archived' AND birthday IS NOT NULL`;
  const now = new Date(t + "T00:00:00Z");
  const birthdays = birthRows.map((m: any) => {
    const b = new Date(String(m.birthday).slice(0, 10) + "T00:00:00Z");
    let next = new Date(Date.UTC(now.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
    if (next < now) next = new Date(Date.UTC(now.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate()));
    const days = Math.round((next.getTime() - now.getTime()) / 86400000);
    return { ...m, next_birthday: next.toISOString().slice(0, 10), days_until: days };
  }).filter((m: any) => m.days_until >= 0 && m.days_until <= 30)
    .sort((a: any, b: any) => a.days_until - b.days_until)
    .slice(0, 100);

  return NextResponse.json({
    counts: { lowBalance: lowBalance.length, inactive30d: inactive30d.length, expiring: expiring.length, birthdays: birthdays.length },
    lowBalance, inactive30d, expiring, birthdays,
  });
}
