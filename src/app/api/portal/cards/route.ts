import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";

const today = () => new Date().toISOString().slice(0, 10);

function effectiveStatus(card: any) {
  if (card.status === "frozen") return "frozen";
  if (card.valid_until && String(card.valid_until).slice(0, 10) < today()) return "expired";
  if (card.category === "count" && Number(card.remaining_count || 0) <= 0) return "exhausted";
  return card.status || "active";
}

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const cards = await rawSql`
    SELECT mc.id, mc.card_type_id, mc.status, mc.total_count, mc.remaining_count,
           mc.valid_from, mc.valid_until, mc.purchased_at, mc.price_cents,
           ct.name AS card_name, ct.category, ct.weekly_limit
    FROM member_cards mc
    JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.tenant_id = 1 AND mc.member_id = ${memberId}
    ORDER BY mc.id DESC`;

  const transactions = await rawSql`
    SELECT id, member_card_id, type, amount, balance_after, note, created_at
    FROM card_transactions
    WHERE tenant_id = 1 AND member_id = ${memberId}
    ORDER BY id DESC LIMIT 100`;

  const formatted = cards.map((c: any) => ({
    id: c.id,
    cardTypeId: c.card_type_id,
    name: c.card_name,
    category: c.category,
    status: effectiveStatus(c),
    totalCount: c.total_count,
    remainingCount: c.remaining_count,
    validFrom: c.valid_from,
    validUntil: c.valid_until,
    purchasedAt: c.purchased_at,
    priceCents: c.price_cents,
    weeklyLimit: c.weekly_limit,
    transactions: transactions
      .filter((t: any) => t.member_card_id === c.id)
      .map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after,
        note: t.note,
        createdAt: t.created_at,
      })),
  }));

  const response = NextResponse.json({ cards: formatted });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
