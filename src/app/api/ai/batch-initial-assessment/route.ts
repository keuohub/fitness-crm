import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members as membersTable, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInitialAssessment } from "@/lib/ai/initial-assessment";

interface ProcessResult {
  memberId: number;
  name: string | null;
  status: "success" | "skipped" | "error";
  message: string;
}

// GET: 查询已有初始评估报告的会员
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const reports = await db
      .select({
        memberId: aiFeedbackReports.memberId,
        memberName: membersTable.name,
        generatedAt: aiFeedbackReports.generatedAt,
      })
      .from(aiFeedbackReports)
      .innerJoin(membersTable, eq(aiFeedbackReports.memberId, membersTable.id))
      .where(eq(aiFeedbackReports.reportType, "initial_assessment"));

    return NextResponse.json({
      count: reports.length,
      members: reports.map((r) => ({
        memberId: r.memberId,
        name: r.memberName,
        generatedAt: r.generatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 批量生成初始评估报告
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const results: ProcessResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let totalMembers = 0;

  try {
    // 1. 查询所有有问卷记录的会员
    const allMembers = await db
      .select({
        id: membersTable.id,
        name: membersTable.name,
      })
      .from(membersTable)
      .innerJoin(
        questionnaireSubmissions,
        eq(membersTable.id, questionnaireSubmissions.memberId)
      )
      .groupBy(membersTable.id, membersTable.name);

    totalMembers = allMembers.length;

    // 2. 查询已有 initial_assessment 报告的会员
    const existingReports = await db
      .select({ memberId: aiFeedbackReports.memberId })
      .from(aiFeedbackReports)
      .where(eq(aiFeedbackReports.reportType, "initial_assessment"));

    const existingIds = new Set(existingReports.map((r) => r.memberId));

    // 3. 筛选需要生成的会员
    const toProcess = allMembers.filter((m) => !existingIds.has(m.id));

    // 4. 已跳过的（已有报告）
    for (const m of allMembers) {
      if (existingIds.has(m.id)) {
        results.push({
          memberId: m.id,
          name: m.name,
          status: "skipped",
          message: "已有初始评估报告",
        });
      }
    }

    // 5. 逐个生成
    for (const member of toProcess) {
      try {
        console.log(`[${member.name}] 生成初始评估报告...`);
        const report = await generateInitialAssessment(member.id);

        // 入库
        await db.insert(aiFeedbackReports).values({
          tenantId: 1,
          memberId: member.id,
          reportType: "initial_assessment",
          content: report,
          generatedAt: new Date().toISOString(),
        });

        console.log(`[${member.name}] 完成`);
        results.push({
          memberId: member.id,
          name: member.name,
          status: "success",
          message: "生成成功",
        });
        succeeded++;

        // 间隔 0.5 秒，避免 API 限流
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "未知错误";
        console.error(`[${member.name}] 失败:`, errMsg);
        results.push({
          memberId: member.id,
          name: member.name,
          status: "error",
          message: errMsg,
        });
        failed++;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    processed: totalMembers,
    succeeded,
    failed,
    results,
  });
}
