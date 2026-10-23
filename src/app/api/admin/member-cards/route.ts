import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminUser, requireRole } from "@/lib/auth/rbac";
import { rawSql } from "@/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
const today = () => new Date().toISOString().slice(0, 10);
function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function maxDate(a: string | null, b: string) {
  if (!a) return b;
  return a > b ? a : b;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin && !requireAdmin(request)) return bad("需要管理员登录", 401);
  const memberId = new URL(request.url).searchParams.get("memberId");
  const rows = memberId
    ? await rawSql`
        SELECT mc.*, ct.name AS card_name, ct.category, ct.validity_days, ct.weekly_limit,
               ct.total_count AS type_total, m.name AS member_name, m.phone AS member_phone
        FROM member_cards mc
        JOIN card_types ct ON ct.id = mc.card_type_id
        JOIN members m ON m.id = mc.member_id
        WHERE mc.tenant_id = 1 AND mc.member_id = ${Number(memberId)}
        ORDER BY mc.id DESC LIMIT 200`
    : await rawSql`
        SELECT mc.*, ct.name AS card_name, ct.category, ct.validity_days, ct.weekly_limit,
               ct.total_count AS type_total, m.name AS member_name, m.phone AS member_phone
        FROM member_cards mc
        JOIN card_types ct ON ct.id = mc.card_type_id
        JOIN members m ON m.id = mc.member_id
        WHERE mc.tenant_id = 1
        ORDER BY mc.id DESC LIMIT 100`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin && !requireAdmin(request)) return bad("权限不足，仅店长或店主可开卡", 403);
  const body = await request.json();
  const memberId = Number(body.memberId);
  const cardTypeId = Number(body.cardTypeId);
  if (!memberId || !cardTypeId) return bad("缺少会员或卡类型");

  const [member] = await rawSql`SELECT id, name, status FROM members WHERE id = ${memberId} AND tenant_id = 1`;
  if (!member) return bad("会员不存在", 404);
  if (member.status === "archived") return bad("该会员已归档，不能开卡");

  const [ct] = await rawSql`SELECT * FROM card_types WHERE id = ${cardTypeId} AND tenant_id = 1 AND is_active = 1`;
  if (!ct) return bad("卡类型不存在或已停用", 404);
  if (!["count", "period"].includes(ct.category)) return bad("暂不支持该卡类别");

  const key = body.idempotencyKey ? String(body.idempotencyKey) : null;
  if (key) {
    const [existing] = await rawSql`SELECT * FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key}`;
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

  const validFrom = String(body.validFrom || today());
  let totalCount: number | null = null;
  let remaining: number | null = null;
  let validUntil: string | null = null;

  if (ct.category === "count") {
    totalCount = Number(ct.total_count || 0);
    if (!totalCount) return bad("次数卡未配置总次数");
    remaining = totalCount;
    validUntil = body.validUntil ? String(body.validUntil) : (ct.validity_days ? addDays(validFrom, Number(ct.validity_days)) : null);
  } else {
    validUntil = body.validUntil ? String(body.validUntil) : addDays(validFrom, Number(ct.validity_days || 0));
    if (!validUntil) return bad("期限卡未配置有效天数");
  }

  const priceCents = body.priceCents != null ? Math.max(0, Math.round(Number(body.priceCents))) : Number(ct.price_cents || 0);

  try {
    const rows = await rawSql`
      WITH inserted AS (
        INSERT INTO member_cards
          (tenant_id, member_id, card_type_id, status, total_count, remaining_count,
           valid_from, valid_until, purchased_at, price_cents, idempotency_key, created_at, updated_at)
        VALUES
          (1, ${memberId}, ${cardTypeId}, 'active', ${totalCount}, ${remaining},
           ${validFrom}, ${validUntil}, ${today()}, ${priceCents}, ${key}, NOW(), NOW())
        RETURNING *
      ), tx AS (
        INSERT INTO card_transactions
          (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, created_at)
        SELECT 1, id, ${memberId}, 'purchase', ${remaining ?? 0}, ${remaining}, ${"开卡"}, ${key}, NOW()
        FROM inserted
        RETURNING id
      )
      SELECT * FROM inserted`;
    if (!rows.length) {
      if (key) {
        const [existing] = await rawSql`SELECT * FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key}`;
        if (existing) return NextResponse.json(existing, { status: 200 });
      }
      return bad("开卡失败");
    }
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    if (String(err?.message || "").includes("uniq_member_card_idem") && key) {
      const [existing] = await rawSql`SELECT * FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key}`;
      if (existing) return NextResponse.json(existing, { status: 200 });
    }
    console.error("[admin/member-cards] issue error", err);
    return bad("开卡失败，请重试", 500);
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin && !requireAdmin(request)) return bad("权限不足，仅店长或店主可续卡加课", 403);
  const body = await request.json();
  const memberCardId = Number(body.memberCardId);
  if (!memberCardId) return bad("缺少 memberCardId");

  const [card] = await rawSql`
    SELECT mc.*, ct.category, ct.total_count AS type_total, ct.validity_days, ct.price_cents AS type_price
    FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.id = ${memberCardId} AND mc.tenant_id = 1`;
  if (!card) return bad("持卡记录不存在", 404);

  const key = body.idempotencyKey ? String(body.idempotencyKey) : null;
  if (key) {
    const [existingTx] = await rawSql`SELECT id FROM card_transactions WHERE tenant_id = 1 AND idempotency_key = ${key}`;
    if (existingTx) return NextResponse.json(card, { status: 200 });
  }

  let totalCount = card.total_count;
  let remaining = card.remaining_count;
  let validUntil = card.valid_until;
  let txAmount = 0;

  if (card.category === "count") {
    const added = body.addedCount != null ? Math.max(1, Math.round(Number(body.addedCount))) : Number(card.type_total || 0);
    if (!added) return bad("续卡次数必须大于 0");
    totalCount = Number(card.total_count || 0) + added;
    remaining = Number(card.remaining_count || 0) + added;
    txAmount = added;
  } else {
    const days = body.extendDays != null ? Math.max(1, Math.round(Number(body.extendDays))) : Number(card.validity_days || 0);
    if (!days) return bad("续卡天数必须大于 0");
    validUntil = addDays(maxDate(card.valid_until, today()), days);
  }
  const priceCents = body.priceCents != null ? Math.max(0, Math.round(Number(body.priceCents))) : Number(card.type_price || 0);

  const rows = await rawSql`
    WITH existing AS (
      SELECT id FROM card_transactions WHERE tenant_id = 1 AND idempotency_key = ${key}
    ), updated AS (
      UPDATE member_cards
      SET status = 'active', total_count = ${totalCount}, remaining_count = ${remaining},
          valid_until = ${validUntil}, price_cents = ${priceCents}, updated_at = NOW()
      WHERE id = ${memberCardId} AND tenant_id = 1
        AND NOT EXISTS (SELECT 1 FROM existing)
      RETURNING *
    ), tx AS (
      INSERT INTO card_transactions
        (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, created_at)
      SELECT 1, id, member_id, 'purchase', ${txAmount}, ${remaining}, ${"续卡"}, ${key}, NOW()
      FROM updated
      RETURNING id
    )
    SELECT * FROM updated`;

  if (!rows.length) {
    const [fresh] = await rawSql`SELECT * FROM member_cards WHERE id = ${memberCardId} AND tenant_id = 1`;
    return NextResponse.json(fresh, { status: 200 });
  }
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin && !requireAdmin(request)) return bad("权限不足，仅店长或店主可冻结或解冻卡", 403);
  const body = await request.json();
  const id = Number(body.memberCardId);
  const action = String(body.action || "");
  if (!id) return bad("缺少 memberCardId");
  if (!["freeze", "unfreeze"].includes(action)) return bad("action 只能是 freeze 或 unfreeze");
  const status = action === "freeze" ? "frozen" : "active";
  const [row] = await rawSql`
    UPDATE member_cards SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  if (!row) return bad("持卡记录不存在", 404);
  await rawSql`
    INSERT INTO card_transactions (tenant_id, member_card_id, member_id, type, amount, balance_after, note, created_at)
    VALUES (1, ${id}, ${row.member_id}, 'adjust', 0, ${row.remaining_count}, ${action === "freeze" ? "冻结" : "解冻"}, NOW())`;
  return NextResponse.json(row);
}
