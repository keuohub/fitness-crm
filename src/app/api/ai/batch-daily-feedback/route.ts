import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { manualRun } = await import("@/scripts/daily-feedback-cron");
    const result = await manualRun();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
