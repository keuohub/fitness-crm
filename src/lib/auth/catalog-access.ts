import { getValidAdminSession } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";

const RANK: Record<string, number> = { owner: 4, admin: 4, manager: 3, coach: 2, viewer: 1 };

/** Card types and course types are catalog edits. Coaches can read, only owner/manager can change. */
export async function requireCatalogEditor(request: NextRequest): Promise<NextResponse | null> {
  const session = await getValidAdminSession(request);
  if (!session) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  const role = session.role || "owner";
  if ((RANK[role] ?? 0) < RANK.manager) {
    return NextResponse.json({ error: "仅店主或店长可以修改卡种和课种" }, { status: 403 });
  }
  return null;
}
