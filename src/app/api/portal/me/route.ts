import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

  return NextResponse.json({
    memberId: member.id,
    memberName: member.name,
    joinedAt: member.joinedAt,
    portalEnabled: member.portalEnabled,
  });
}
