import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { db } from "@/db";
import { portalUsageLogs } from "@/db/schema";

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { event, page, durationSeconds } = body;

    if (!event) {
      return NextResponse.json({ error: "缺少 event" }, { status: 400 });
    }

    await db.insert(portalUsageLogs).values({
      memberId,
      event,
      page: page || null,
      durationSeconds: durationSeconds || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Usage tracking error:", err);
    return NextResponse.json({ error: "记录失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Admin-only: view usage stats
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const logs = await db
      .select()
      .from(portalUsageLogs)
      .where(/* recent */ undefined)
      .orderBy(portalUsageLogs.createdAt);

    const recent = logs.filter((l) => l.createdAt >= cutoffStr);

    const summary = {
      totalLogins: recent.filter((l) => l.event === "login").length,
      totalPageViews: recent.filter((l) => l.event === "page_view").length,
      totalShares: recent.filter((l) => l.event === "share").length,
      topPages: topPages(recent),
      uniqueMembers: new Set(recent.map((l) => l.memberId)).size,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Usage stats error:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

function topPages(logs: { page: string | null }[]): { page: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    if (!l.page) continue;
    map.set(l.page, (map.get(l.page) || 0) + 1);
  }
  return [...map.entries()]
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
