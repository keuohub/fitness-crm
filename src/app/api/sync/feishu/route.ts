import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { fullSync, readSyncLogs, type FullSyncResult } from "@/lib/feishu-sync-engine";

// ─── GET: Sync Status ───

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const logs = readSyncLogs(20);
  const lastSuccess = logs.find((l) => l.source === "members");

  return NextResponse.json({
    lastSyncAt: lastSuccess?.finishedAt || lastSuccess?.startedAt || null,
    recentLogs: logs.slice(0, 10),
  });
}

// ─── POST: Execute Full Sync ───

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const result: FullSyncResult = await fullSync();

    return NextResponse.json({
      success: result.allSuccess,
      startedAt: result.members.startedAt,
      finishedAt: result.members.finishedAt,
      members: {
        total: result.members.totalRecords,
        success: result.members.successCount,
        errors: result.members.errorCount,
      },
      care: Object.fromEntries(
        Object.entries(result.care).map(([key, val]) => [
          key,
          { total: val.totalRecords, success: val.successCount, errors: val.errorCount },
        ])
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "同步失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
