import { NextRequest, NextResponse } from "next/server";
import { getMemberArchive } from "@/lib/member-archive";
import { getPortalMemberId } from "@/lib/auth/member-session";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const archive = await getMemberArchive(memberId);
    return NextResponse.json(archive);
  } catch (err) {
    console.error("archive error:", err);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
