import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { db } from "@/db";
import { coachNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return noStore({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return noStore({ error: "memberId 无效" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return noStore({ error: "无权访问" }, { status: 401 });
  }

  const notes = await db
    .select()
    .from(coachNotes)
    .where(eq(coachNotes.memberId, memberId))
    .orderBy(desc(coachNotes.createdAt))
    .limit(10);

  return noStore(
    notes.map((n) => ({
      id: n.id,
      tags: JSON.parse(n.tags || "[]"),
      coachNote: n.coachNote,
      aiMessage: n.aiMessage,
      createdAt: n.createdAt,
    }))
  );
}
