import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachId } from "@/lib/auth/coach-session";
import { rawSql } from "@/db";
import { ensureGrowthSchema } from "@/lib/growth-schema";
import { validateMeasurement } from "@/lib/growth-metrics";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function POST(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return bad("教练未登录", 401);
  await ensureGrowthSchema();
  const body = await request.json().catch(() => ({}));
  const memberId = Number(body.memberId);
  if (!memberId) return bad("缺少 memberId");
  const parsed = validateMeasurement(body);
  if (!parsed.ok) return bad(parsed.error);
  const v = parsed.value;
  const [row] = await rawSql`
    INSERT INTO body_measurements
      (tenant_id, member_id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note, recorded_by, recorded_role)
    VALUES
      (1, ${memberId}, ${v.measuredOn}, ${v.weightKg}, ${v.waistCm}, ${v.hipCm}, ${v.bustCm}, ${v.thighCm}, ${v.note || null}, ${coachId}, 'coach')
    RETURNING id, measured_on, weight_kg, waist_cm`;
  return NextResponse.json({ measurement: row }, { status: 201 });
}
