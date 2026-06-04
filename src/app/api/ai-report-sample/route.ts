import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiFeedbackReports, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const latest = await db
      .select({
        reportType: aiFeedbackReports.reportType,
        content: aiFeedbackReports.content,
        generatedAt: aiFeedbackReports.generatedAt,
        memberName: members.name,
      })
      .from(aiFeedbackReports)
      .innerJoin(members, eq(aiFeedbackReports.memberId, members.id))
      .orderBy(desc(aiFeedbackReports.generatedAt))
      .limit(1);

    if (latest.length === 0) {
      return NextResponse.json({
        exists: false,
        reportType: "暂无报告",
        memberName: "",
        content: "",
        generatedAt: "",
      });
    }

    const r = latest[0];
    return NextResponse.json({
      exists: true,
      reportType: r.reportType,
      memberName: r.memberName,
      content: r.content,
      generatedAt: r.generatedAt,
    });
  } catch (e) {
    console.error("ai-report-sample error:", e);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
