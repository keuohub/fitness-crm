import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiFeedbackReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  const allReports = await db
    .select()
    .from(aiFeedbackReports)
    .where(eq(aiFeedbackReports.memberId, memberId))
    .orderBy(desc(aiFeedbackReports.createdAt))
    .limit(5);

  const report = allReports.find((r) => r.reportType === "initial_assessment") || null;

  if (!report) {
    return NextResponse.json({ assessment: null });
  }

  return NextResponse.json({
    assessment: report.content,
    reportId: report.id,
    generatedAt: report.generatedAt,
  });
}
