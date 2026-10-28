import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { ensureGrowthSchema } from "@/lib/growth-schema";

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.agreed) return NextResponse.json({ error: "请先阅读并同意隐私政策与用户协议" }, { status: 400 });
  await ensureGrowthSchema();
  const version = "2026-10-28";
  await rawSql`
    UPDATE members
    SET privacy_consent_at = ${new Date().toISOString()}, terms_version = ${version}, updated_at = NOW()
    WHERE id = ${memberId}
  `;
  return NextResponse.json({ ok: true, version });
}
