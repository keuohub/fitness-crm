import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberMemories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

const clean = (s: string) => (s || "")
  .replace(/^v2\s*/gm, "")
  .replace(/FORM_VERSION.*$/gm, "")
  .replace(/^\s*\n/gm, "")
  .trim();

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [latest] = await db
    .select({
      id: memberMemories.id,
      content: memberMemories.content,
      memoryType: memberMemories.memoryType,
      createdAt: memberMemories.createdAt,
    })
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(desc(memberMemories.createdAt))
    .limit(1);

  if (!latest) return NextResponse.json(null);

  const fullContent = clean(latest.content || "");
  const lines = fullContent.split("\n").filter(Boolean);

  const excerpt = lines.slice(0, 2).join(" · ").slice(0, 60);

  const typeLabel: Record<string, string> = {
    self_report: "成长记录",
    milestone: "成长里程碑",
    note: "教练观察",
    preference: "我的偏好",
    ai_summary: "成长记录",
  };

  return NextResponse.json({
    id: latest.id,
    typeLabel: typeLabel[latest.memoryType] || latest.memoryType,
    excerpt: excerpt || "查看记录",
    content: fullContent,
    lines,
    date: latest.createdAt?.slice(0, 10) || "",
  });
}
