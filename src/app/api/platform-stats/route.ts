import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/analytics/platform-stats";

export async function GET() {
  try {
    const stats = await getPlatformStats();
    return NextResponse.json(stats);
  } catch (e) {
    console.error("platform-stats error:", e);
    return NextResponse.json(
      { totalMembers: 0, totalTrainings: 0, totalGrowthEvents: 0, totalAIFeedbacks: 0, retentionRate: 0, calculatedAt: "" },
      { status: 500 }
    );
  }
}
