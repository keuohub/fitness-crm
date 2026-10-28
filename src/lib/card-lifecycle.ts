import { rawSql } from "@/db";
import { shanghaiToday } from "@/lib/shanghai-date";

/** Mark cards expired or exhausted using the Shanghai business date. */
export async function sweepCardLifecycle(now: Date = new Date()): Promise<void> {
  const today = shanghaiToday(now);
  await rawSql`
    UPDATE member_cards
    SET status = 'expired', updated_at = NOW()
    WHERE tenant_id = 1 AND status = 'active'
      AND valid_until IS NOT NULL AND BTRIM(valid_until) <> ''
      AND LEFT(valid_until, 10) < ${today}
  `;
  await rawSql`
    UPDATE member_cards mc
    SET status = 'exhausted', updated_at = NOW()
    FROM card_types ct
    WHERE mc.card_type_id = ct.id
      AND mc.tenant_id = 1
      AND mc.status = 'active'
      AND ct.category = 'count'
      AND COALESCE(mc.remaining_count, 0) <= 0
  `;
}
