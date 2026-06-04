import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiFeedbackReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateDailyFeedback } from "@/lib/ai";

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

  const [report] = await db
    .select()
    .from(aiFeedbackReports)
    .where(eq(aiFeedbackReports.memberId, memberId))
    .orderBy(desc(aiFeedbackReports.createdAt))
    .limit(1);

  if (!report) {
    return NextResponse.json({ feedback: null });
  }

  return NextResponse.json({
    feedback: report.content,
    reportId: report.id,
    generatedAt: report.generatedAt,
  });
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId || typeof memberId !== "number") {
      return NextResponse.json(
        { error: "缺少有效的 memberId" },
        { status: 400 }
      );
    }

    const feedback = await generateDailyFeedback(memberId);

    const __r_report = await db
      .insert(aiFeedbackReports)
      .values({
        tenantId: 1,
        memberId,
        reportType: "daily",
        content: feedback,
        generatedAt: new Date().toISOString(),
      })
      .returning();
    const report = (__r_report as any)[0];

    return NextResponse.json({
      feedback,
      reportId: report.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生成反馈失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
