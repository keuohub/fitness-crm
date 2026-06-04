import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { batchGenerateReports } from "@/lib/report-generator";

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportType } = body;

    if (!reportType) {
      return NextResponse.json(
        { error: "缺少 reportType" },
        { status: 400 }
      );
    }

    const result = await batchGenerateReports(reportType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
