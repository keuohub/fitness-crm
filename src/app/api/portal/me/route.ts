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
    memberCode: member.memberCode || `LW-${String(member.id).padStart(6, "0")}`,
    joinedAt: member.joinedAt || "2025-10-20",
    avatarUrl: member.avatarUrl,
    portalEnabled: member.portalEnabled,
    mentorName: member.mentorName || "导师 小桥",
    totalHours: member.totalHours ?? 42,
    hoursPilates: member.hoursPilates ?? 18,
    hoursEquipment: member.hoursEquipment ?? 16,
    hoursFatBurn: member.hoursFatBurn ?? 8,
  });
}
