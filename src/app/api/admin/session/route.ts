import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";

// 后台页面用它确认「当前 cookie 对应的服务端会话仍然有效」。
// 退出登录/被停用/会话过期后，这里返回 401，AdminShell 会立刻跳回登录页，
// 而不是给一个能打开、但所有接口都 401 的空壳页面。
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  return NextResponse.json(
    { ok: true, email: admin.email, role: admin.role ?? "owner" },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
