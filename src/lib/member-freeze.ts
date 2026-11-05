import { rawSql } from "@/db";

/**
 * 会员停卡 / 复卡
 *
 * 为什么要有这个文件：
 * members.freeze_status / freeze_start / freeze_end 三个字段一直存在，
 * 但全站只有一个只读徽章读它，没有任何地方能写入 —— 等于死字段。
 * 结果是"陪伴天数"只按入会日期硬算，会员去外地两个月，天数照涨；
 * 卡有效期也不会顺延，回来发现卡已经过期。
 *
 * 约定：
 * - 停卡期间陪伴天数不计（见 api/portal/me）。
 * - 复卡时按实际停卡天数顺延所有带到期日的卡，写入 card_transactions 留痕。
 * - 顺延用 idempotency_key 去重，重复调用不会把卡越推越远。
 */

export const DAY_MS = 86400000;

/** 解析各种历史格式的日期文本（2026-5-14 / 2026/05/14 / 2026.5.14） */
export function parseDay(value: unknown): number | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const ts = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(ts) ? null : ts;
  }
  const ts = new Date(text).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** 统一输出 YYYY-MM-DD，避免 2026-5-14 那种不补零格式继续扩散 */
export function formatDay(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function todayText(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 停卡实际占用的天数（整日差）。
 * 与 portal/me 里陪伴天数扣减的口径必须一致，否则"总天数 − 停卡天数"对不上。
 */
export function frozenDaysOf(freezeStart: number, freezeEnd: number): number {
  const diff = Math.floor((freezeEnd - freezeStart) / DAY_MS);
  return diff > 0 ? diff : 0;
}

interface FreezeState {
  id: number;
  tenantId: number;
  freezeStatus: string | null;
  freezeStart: string | null;
  freezeEnd: string | null;
}

async function loadFreezeState(memberId: number): Promise<FreezeState | null> {
  const [row] = await rawSql`
    SELECT id, tenant_id AS "tenantId", freeze_status AS "freezeStatus",
           freeze_start AS "freezeStart", freeze_end AS "freezeEnd"
      FROM members
     WHERE id = ${memberId}
     LIMIT 1
  `;
  return (row as FreezeState) || null;
}

/**
 * 顺延该会员所有带到期日的卡。
 * 只动 valid_until 非空的卡（次卡本来就没期限，顺延无意义）。
 * 返回实际顺延的卡数。
 */
export async function extendCardsForFreeze(
  memberId: number,
  tenantId: number,
  freezeStart: string,
  frozenDays: number,
  note: string
): Promise<number> {
  if (frozenDays <= 0) return 0;

  const cards = await rawSql`
    SELECT id, valid_until AS "validUntil", remaining_count AS "remainingCount"
      FROM member_cards
     WHERE member_id = ${memberId}
       AND valid_until IS NOT NULL
       AND status = 'active'
  `;

  let extended = 0;
  for (const card of cards as any[]) {
    const untilTs = parseDay(card.validUntil);
    if (untilTs === null) continue;

    // 同一张卡、同一次停卡只顺延一次
    const idem = `freeze_extend:${card.id}:${freezeStart}`;
    const [dup] = await rawSql`
      SELECT 1 AS hit FROM card_transactions
       WHERE tenant_id = ${tenantId} AND idempotency_key = ${idem}
       LIMIT 1
    `;
    if (dup) continue;

    const nextUntil = formatDay(untilTs + frozenDays * DAY_MS);

    await rawSql`
      UPDATE member_cards
         SET valid_until = ${nextUntil},
             updated_at = now()
       WHERE id = ${card.id}
    `;

    await rawSql`
      INSERT INTO card_transactions
        (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, created_at)
      VALUES
        (${tenantId}, ${card.id}, ${memberId}, 'freeze_extend', 0,
         ${card.remainingCount ?? null}, ${`${note} · 到期日 ${card.validUntil} → ${nextUntil}`},
         ${idem}, now())
      ON CONFLICT DO NOTHING
    `;

    extended += 1;
  }

  return extended;
}

/** 写入审计日志，方便日后核对"谁在什么时候停的卡" */
async function writeAudit(
  tenantId: number,
  action: string,
  memberId: number,
  before: unknown,
  after: unknown
) {
  try {
    await rawSql`
      INSERT INTO audit_logs (tenant_id, actor_type, action, entity_type, entity_id, before_json, after_json, created_at)
      VALUES (${tenantId}, 'admin', ${action}, 'member', ${memberId},
              ${JSON.stringify(before ?? null)}, ${JSON.stringify(after ?? null)}, now())
    `;
  } catch (err) {
    console.error("[member-freeze] audit error:", err);
  }
}

export async function freezeMember(
  memberId: number,
  startDay: string,
  endDay: string | null,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const state = await loadFreezeState(memberId);
  if (!state) return { ok: false, error: "会员不存在" };
  if (state.freezeStatus === "frozen") {
    return { ok: false, error: "该会员已在停卡中，请先复卡再重新办理" };
  }

  const startTs = parseDay(startDay);
  if (startTs === null) return { ok: false, error: "停卡开始日期格式不对" };
  if (endDay) {
    const endTs = parseDay(endDay);
    if (endTs === null) return { ok: false, error: "预计复卡日期格式不对" };
    if (endTs < startTs) return { ok: false, error: "预计复卡日期不能早于开始日期" };
  }

  await rawSql`
    UPDATE members
       SET freeze_status = 'frozen',
           freeze_start = ${startDay},
           freeze_end = ${endDay || null},
           updated_at = now()
     WHERE id = ${memberId}
  `;

  await writeAudit(state.tenantId, "member.freeze", memberId, state, {
    freezeStart: startDay,
    freezeEnd: endDay,
    reason: reason || null,
  });

  return { ok: true };
}

export async function unfreezeMember(
  memberId: number,
  endDayInput?: string,
  reason?: string
): Promise<{ ok: boolean; error?: string; frozenDays?: number; extendedCards?: number }> {
  const state = await loadFreezeState(memberId);
  if (!state) return { ok: false, error: "会员不存在" };
  if (!state.freezeStart) return { ok: false, error: "该会员没有停卡记录" };

  const startTs = parseDay(state.freezeStart);
  if (startTs === null) return { ok: false, error: "停卡开始日期无法识别，请先修正" };

  const endDay = endDayInput || todayText();
  const endTs = parseDay(endDay);
  if (endTs === null) return { ok: false, error: "复卡日期格式不对" };
  if (endTs < startTs) return { ok: false, error: "复卡日期不能早于停卡开始日期" };

  const frozenDays = frozenDaysOf(startTs, endTs);

  await rawSql`
    UPDATE members
       SET freeze_status = 'active',
           freeze_end = ${endDay},
           updated_at = now()
     WHERE id = ${memberId}
  `;

  const extendedCards = await extendCardsForFreeze(
    memberId,
    state.tenantId,
    formatDay(startTs),
    frozenDays,
    `停卡复卡顺延（${state.freezeStart} ~ ${endDay}，共 ${frozenDays} 天）${reason ? ` · ${reason}` : ""}`
  );

  await writeAudit(state.tenantId, "member.unfreeze", memberId, state, {
    freezeEnd: endDay,
    frozenDays,
    extendedCards,
    reason: reason || null,
  });

  return { ok: true, frozenDays, extendedCards };
}

/**
 * 到了预计复卡日就自动复卡并把卡顺延到位。
 *
 * 为什么需要懒触发：后台排了"11月20日复卡"，到那天没人点按钮，
 * 会员打开小程序看到的还是"停卡中"，卡也不会顺延。
 * 在会员进「我的」和后台打开会员档案时都会跑一次。
 */
export async function settleExpiredFreeze(
  memberId: number
): Promise<{ settled: boolean; extendedCards: number }> {
  const state = await loadFreezeState(memberId);
  if (!state || state.freezeStatus !== "frozen" || !state.freezeEnd) {
    return { settled: false, extendedCards: 0 };
  }

  const startTs = parseDay(state.freezeStart);
  const endTs = parseDay(state.freezeEnd);
  if (startTs === null || endTs === null) return { settled: false, extendedCards: 0 };

  const todayTs = parseDay(todayText())!;
  if (endTs > todayTs) return { settled: false, extendedCards: 0 };

  const frozenDays = frozenDaysOf(startTs, endTs);
  const extendedCards = await extendCardsForFreeze(
    memberId,
    state.tenantId,
    formatDay(startTs),
    frozenDays,
    `停卡到期自动复卡（${state.freezeStart} ~ ${state.freezeEnd}，共 ${frozenDays} 天）`
  );

  await rawSql`
    UPDATE members
       SET freeze_status = 'active',
           updated_at = now()
     WHERE id = ${memberId}
  `;

  await writeAudit(state.tenantId, "member.unfreeze.auto", memberId, state, {
    freezeEnd: state.freezeEnd,
    frozenDays,
    extendedCards,
  });

  return { settled: true, extendedCards };
}
