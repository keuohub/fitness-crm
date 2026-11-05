import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
import {
  freezeMember,
  unfreezeMember,
  settleExpiredFreeze,
  parseDay,
  todayText,
  frozenDaysOf,
} from "@/lib/member-freeze";

/**
 * 后台办理停卡 / 复卡
 *
 * GET  ?memberId=  → 当前停卡状态 + 已停天数 + 会被顺延的卡
 * POST { memberId, action: "freeze" | "unfreeze", startDate?, endDate?, reason? }
 */

async function loadState(memberId: number) {
  const [member] = await rawSql`
    SELECT id, name, joined_at AS "joinedAt", freeze_status AS "freezeStatus",
           freeze_start AS "freezeStart", freeze_end AS "freezeEnd"
      FROM members WHERE id = ${memberId} LIMIT 1
  `;
  return member as any;
}

async function loadCards(memberId: number) {
  const rows = await rawSql`
    SELECT id, valid_until AS "validUntil", remaining_count AS "remainingCount"
      FROM member_cards
     WHERE member_id = ${memberId} AND valid_until IS NOT NULL AND status = 'active'
     ORDER BY id
  `;
  return rows as any[];
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const memberId = Number(request.nextUrl.searchParams.get("memberId") || 0);
  if (!memberId) return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });

  // 到了预计复卡日就先自动复卡，避免后台显示"停卡中"但实际早该回来
  await settleExpiredFreeze(memberId).catch(() => {});

  const member = await loadState(memberId);
  if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

  const cards = await loadCards(memberId);
  const startTs = parseDay(member.freezeStart);
  const endTs = parseDay(member.freezeEnd);
  const todayTs = parseDay(todayText())!;

  const ongoing = member.freezeStatus === "frozen";
  // 已停天数：停卡中按到今天算，已复卡按停卡区间算
  const frozenDays =
    startTs === null
      ? 0
      : frozenDaysOf(startTs, ongoing ? todayTs : endTs === null ? todayTs : endTs);

  return NextResponse.json({
    memberId,
    memberName: member.name,
    joinedAt: member.joinedAt || null,
    isFrozen: ongoing,
    freezeStart: member.freezeStart || null,
    freezeEnd: member.freezeEnd || null,
    frozenDays,
    // 停卡中时给"现在复卡会顺延多少天 / 影响几张卡"，让操作者心里有数
    plannedExtendDays: ongoing ? frozenDays : 0,
    extendableCards: cards.map((c) => ({
      id: c.id,
      validUntil: c.validUntil,
      remainingCount: c.remainingCount,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const memberId = Number(body.memberId || 0);
    if (!memberId) return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });

    const action = String(body.action || "").trim();

    if (action === "freeze") {
      const startDate = body.startDate ? String(body.startDate) : todayText();
      const endDate = body.endDate ? String(body.endDate) : null;
      const reason = body.reason ? String(body.reason) : undefined;
      const result = await freezeMember(memberId, startDate, endDate, reason);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

      // 补办历史停卡（开始和结束都在过去）时，直接结算并把卡顺延到位
      const endTs = parseDay(endDate);
      const todayTs = parseDay(todayText())!;
      if (endTs !== null && endTs <= todayTs) {
        await unfreezeMember(memberId, endDate!, reason);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "unfreeze") {
      const result = await unfreezeMember(
        memberId,
        body.endDate ? String(body.endDate) : undefined,
        body.reason
      );
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      return NextResponse.json({
        success: true,
        frozenDays: result.frozenDays,
        extendedCards: result.extendedCards,
      });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    console.error("[admin/member-freeze] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
