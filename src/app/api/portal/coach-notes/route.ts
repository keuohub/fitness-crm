import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coachNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

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

  const notes = await db
    .select()
    .from(coachNotes)
    .where(eq(coachNotes.memberId, memberId))
    .orderBy(desc(coachNotes.createdAt))
    .limit(10);

  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      tags: JSON.parse(n.tags || "[]"),
      coachNote: n.coachNote,
      aiMessage: n.aiMessage,
      createdAt: n.createdAt,
    }))
  );
}
