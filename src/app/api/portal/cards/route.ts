import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { autoSettleFinishedBookings } from "@/lib/booking-settle";
import { shanghaiToday } from "@/lib/shanghai-date";

const today = () => shanghaiToday();

function effectiveStatus(card: any) {
  if (card.status === "frozen") return "frozen";
  if (card.valid_until && String(card.valid_until).slice(0, 10) < today()) return "expired";
  if (card.category === "count" && Number(card.remaining_count || 0) <= 0) return "exhausted";
  return card.status || "active";
}

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // 触发一次后台自动结课消课（下课后自动扣除）
  autoSettleFinishedBookings().catch((err) => console.error("[cards] autoSettle error:", err));

  const cards = await rawSql`
    SELECT mc.id, mc.card_type_id, mc.status, mc.total_count, mc.remaining_count,
           mc.valid_from, mc.valid_until, mc.purchased_at, mc.price_cents,
           ct.name AS card_name, ct.category, ct.validity_days, ct.weekly_limit
    FROM member_cards mc
    JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.tenant_id = 1 AND mc.member_id = ${memberId}
    ORDER BY mc.id DESC`;

  const transactions = await rawSql`
    SELECT id, member_card_id, type, amount, balance_after, note, created_at
    FROM card_transactions
    WHERE tenant_id = 1 AND member_id = ${memberId}
    ORDER BY id DESC LIMIT 100`;

  // 查询每个卡种绑定的课种名称
  const cardCourses = await rawSql`
    SELECT ctc.card_type_id, cc.name AS course_name
    FROM card_type_courses ctc
    JOIN course_categories cc ON cc.id = ctc.course_category_id
    ORDER BY ctc.course_category_id ASC
  `;
  const courseMap = new Map<number, string[]>();
  for (const cc of cardCourses) {
    const list = courseMap.get(cc.card_type_id) || [];
    list.push(String(cc.course_name));
    courseMap.set(cc.card_type_id, list);
  }

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
    // 年卡身份：期限卡且（有效期≥365 天或名称含「年卡」）。会员端据此显示年卡徽章与金色身份条。
    isAnnualCard:
      String(c.category) === "period" &&
      (Number(c.validity_days || 0) >= 365 || String(c.card_name || "").includes("年卡")),
    courseCategoryNames: courseMap.get(c.card_type_id) || [],
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
