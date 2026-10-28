import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
import { ensureGrowthSchema } from "@/lib/growth-schema";
import { validateMeasurement } from "@/lib/growth-metrics";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  await ensureGrowthSchema();
  const memberId = Number(new URL(request.url).searchParams.get("memberId"));
  if (!memberId) return bad("缺少 memberId");
  const rows = await rawSql`
    SELECT id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note, recorded_role, created_at
    FROM body_measurements WHERE tenant_id = 1 AND member_id = ${memberId}
    ORDER BY measured_on DESC, id DESC`;
  return NextResponse.json({ measurements: rows });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return bad("需要管理员登录", 401);
  await ensureGrowthSchema();
  const body = await request.json().catch(() => ({}));
  const memberId = Number(body.memberId);
  if (!memberId) return bad("缺少 memberId");
  const [member] = await rawSql`SELECT id FROM members WHERE id = ${memberId} AND tenant_id = 1`;
  if (!member) return bad("会员不存在", 404);
  const parsed = validateMeasurement(body);
  if (!parsed.ok) return bad(parsed.error);
  const v = parsed.value;
  const [row] = await rawSql`
    INSERT INTO body_measurements
      (tenant_id, member_id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note, recorded_by, recorded_role)
    VALUES
      (1, ${memberId}, ${v.measuredOn}, ${v.weightKg}, ${v.waistCm}, ${v.hipCm}, ${v.bustCm}, ${v.thighCm}, ${v.note || null}, ${admin.userId}, 'admin')
    RETURNING *`;
  return NextResponse.json({ measurement: row }, { status: 201 });
}
