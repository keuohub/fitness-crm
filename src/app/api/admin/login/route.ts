import { NextRequest, NextResponse } from "next/server";
import { verifyAdminLogin, setAdminCookie, clearAdminCookie } from "@/lib/auth/admin-session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "缺少账号或密码" }, { status: 400 });
    }

    const session = await verifyAdminLogin(email, password);
    if (!session) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    setAdminCookie(response, session);
    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearAdminCookie(response);
  return response;
}
