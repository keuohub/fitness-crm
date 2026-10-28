import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { ensureGrowthSchema } from "@/lib/growth-schema";
import { attendanceStreakWeeks, validateMeasurement } from "@/lib/growth-metrics";
import { companionshipDays, shanghaiToday } from "@/lib/shanghai-date";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return bad("未登录", 401);
  await ensureGrowthSchema();
  const today = shanghaiToday();
  const [member] = await rawSql`SELECT joined_at FROM members WHERE id = ${memberId}`;
  const measurements = await rawSql`
    SELECT id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note, recorded_role, created_at
    FROM body_measurements WHERE tenant_id = 1 AND member_id = ${memberId}
    ORDER BY measured_on ASC, id ASC`;
  const attended = await rawSql`
    SELECT s.session_date FROM attendance a
    JOIN class_sessions s ON s.id = a.session_id
    WHERE a.member_id = ${memberId} AND a.status = 'attended'
    ORDER BY s.session_date`;
  const notes = await rawSql`
    SELECT id, content, created_at FROM post_class_notes
    WHERE tenant_id = 1 AND member_id = ${memberId}
    ORDER BY id DESC LIMIT 8`;
  const photos = await rawSql`
    SELECT id, file_path, taken_at, notes FROM photos
    WHERE member_id = ${memberId} AND photo_type = 'progress'
      AND (visibility IS NULL OR visibility = 'private')
    ORDER BY id DESC LIMIT 12`;
  const dates = attended.map((r) => String(r.session_date).slice(0, 10));
  return NextResponse.json({
    companionshipDays: companionshipDays(member?.joined_at),
    streakWeeks: attendanceStreakWeeks(dates, today),
    attendedCount: dates.length,
    measurements,
    notes,
    photos,
  });
}

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return bad("未登录", 401);
  await ensureGrowthSchema();
  const body = await request.json().catch(() => ({}));
  const parsed = validateMeasurement(body);
  if (!parsed.ok) return bad(parsed.error);
  const v = parsed.value;
  const [row] = await rawSql`
    INSERT INTO body_measurements
      (tenant_id, member_id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note, recorded_role)
    VALUES
      (1, ${memberId}, ${v.measuredOn}, ${v.weightKg}, ${v.waistCm}, ${v.hipCm}, ${v.bustCm}, ${v.thighCm}, ${v.note || null}, 'member')
    RETURNING id, measured_on, weight_kg, waist_cm, hip_cm, bust_cm, thigh_cm, note`;
  return NextResponse.json({ measurement: row }, { status: 201 });
}
