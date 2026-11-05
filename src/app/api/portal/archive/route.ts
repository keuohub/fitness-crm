import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { getMemberArchive } from "@/lib/member-archive";
import { getPortalMemberId } from "@/lib/auth/member-session";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return noStore({ error: "未登录" }, { status: 401 });

  try {
    const archive = await getMemberArchive(memberId);
    return noStore(archive);
  } catch (err) {
    console.error("archive error:", err);
    return noStore({ error: "加载失败" }, { status: 500 });
  }
}
