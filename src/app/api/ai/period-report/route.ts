import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiFeedbackReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { getCached, setCache } from "@/lib/api-cache";

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

  const cacheKey = `period_report:${memberId}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  const reports = await db
    .select()
    .from(aiFeedbackReports)
    .where(eq(aiFeedbackReports.memberId, memberId))
    .orderBy(desc(aiFeedbackReports.createdAt));

  const formattedReports = reports.map((r) => {
    let typeName = r.reportType;
    if (typeName === "initial_assessment" || typeName === "initial" || typeName === "assessment") {
      typeName = "初见 · 体态测评手札";
    } else if (typeName === "monthly" || typeName === "月报" || typeName === "月度总结") {
      typeName = "月度体态蜕变手札";
    } else if (typeName === "quarterly" || typeName === "季度总结") {
      typeName = "季度蜕变复盘";
    } else if (typeName === "yearly" || typeName === "annual" || typeName === "年度总结") {
      typeName = "年度蜕变手札";
    } else if (typeName === "weekly" || typeName === "周报") {
      typeName = "周度私教来信";
    } else if (typeName === "daily" || typeName === "日报") {
      typeName = "每日蜕变记录";
    }
    return {
      ...r,
      reportType: typeName,
    };
  });

  setCache(cacheKey, formattedReports);

  const response = NextResponse.json(formattedReports);
  response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return response;
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
