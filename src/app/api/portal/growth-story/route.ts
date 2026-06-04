import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberMemories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const records = await db
    .select({
      id: memberMemories.id,
      content: memberMemories.content,
      memoryType: memberMemories.memoryType,
      createdAt: memberMemories.createdAt,
    })
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(desc(memberMemories.createdAt))
    .limit(20);

  const clean = (s: string) => (s || "")
    .replace(/^v2\s*/gm, "")
    .replace(/FORM_VERSION.*$/gm, "")
    .replace(/^\s*\n/gm, "")
    .trim();

  const cleaned = records.map((r) => ({
    id: r.id,
    content: clean(r.content || ""),
    memoryType: r.memoryType,
    date: r.createdAt?.slice(0, 10) || "",
  }));

  return NextResponse.json({
    records: cleaned,
    selfReports: cleaned.filter((r) => r.memoryType === "self_report"),
    milestones: cleaned.filter((r) => r.memoryType === "milestone"),
    coachNotes: cleaned.filter((r) => r.memoryType === "note"),
    preferences: cleaned.filter((r) => r.memoryType === "preference"),
  });
}
