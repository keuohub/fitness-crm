import { NextResponse } from "next/server";
import { getRecentActivities } from "@/lib/analytics/platform-stats";

export async function GET() {
  try {
    const activities = await getRecentActivities();
    return NextResponse.json({ activities });
  } catch (e) {
    console.error("activities error:", e);
    return NextResponse.json({ activities: [] }, { status: 500 });
  }
}
