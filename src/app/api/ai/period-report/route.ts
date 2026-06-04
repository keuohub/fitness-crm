import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiFeedbackReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const reports = await db
    .select()
    .from(aiFeedbackReports)
    .where(eq(aiFeedbackReports.memberId, memberId))
    .orderBy(desc(aiFeedbackReports.createdAt));

  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, reportType } = body;

    if (!memberId || !reportType) {
      return NextResponse.json(
        { error: "缺少 memberId 或 reportType" },
        { status: 400 }
      );
    }

    const access = await verifyMemberAccess(request, memberId);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权访问" }, { status: 401 });
    }

    const { generatePeriodReport } = await import("@/lib/report-generator");
    const reportText = await generatePeriodReport(memberId, reportType);

    const [latest] = await db
      .select()
      .from(aiFeedbackReports)
      .where(eq(aiFeedbackReports.memberId, memberId))
      .orderBy(desc(aiFeedbackReports.createdAt))
      .limit(1);

    return NextResponse.json({
      reportId: latest?.id,
      content: reportText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
