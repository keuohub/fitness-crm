import { getCoachId } from "./coach-token";
import { rawSql } from "@/db";

export async function getActiveCoachId(request: Request): Promise<number | null> {
  const id = getCoachId(request);
  if (!id) return null;
  const [coach] = await rawSql`
    SELECT id FROM users WHERE id = ${id} AND tenant_id = 1 AND role = 'coach' AND status = 'active'`;
  return coach ? id : null;
}
