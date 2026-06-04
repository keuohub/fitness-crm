import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberMemories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [latest] = await db
    .select({ content: memberMemories.content, createdAt: memberMemories.createdAt })
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(desc(memberMemories.createdAt))
    .limit(1);

  if (!latest) return NextResponse.json(null);

  return NextResponse.json({
    content: latest.content,
    createdAt: latest.createdAt?.slice(0, 10),
  });
}
