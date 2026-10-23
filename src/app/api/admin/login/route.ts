import { NextRequest, NextResponse } from "next/server";
import { verifyAdminLogin, setAdminCookie, clearAdminCookie, revokeAdminSession } from "@/lib/auth/admin-session";

// 内存级防爆破限流器（多实例下每个实例自限，同时防止单机高频打崩）
interface LoginAttempt {
  failures: number;
  lockedUntil: number;
}
const attemptsMap = new Map<string, LoginAttempt>();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 锁定 15 分钟

function getClientKey(request: NextRequest, email: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "ip_local";
  return `${ip}:${email.toLowerCase().trim()}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "缺少账号或密码" }, { status: 400 });
    }

    const key = getClientKey(request, email);
    const now = Date.now();
    const record = attemptsMap.get(key);

    // 检查是否在锁定期内
    if (record && record.lockedUntil > now) {
      const waitMin = Math.ceil((record.lockedUntil - now) / 60000);
      return NextResponse.json(
        { error: `密码连续错误超限，账号已锁定，请 ${waitMin} 分钟后再试` },
        { status: 429 }
      );
    }

    const session = await verifyAdminLogin(email, password);
    if (!session) {
      // 记录失败次数
      const current = attemptsMap.get(key) || { failures: 0, lockedUntil: 0 };
      current.failures += 1;
      if (current.failures >= MAX_FAILURES) {
        current.lockedUntil = now + LOCKOUT_MS;
      }
      attemptsMap.set(key, current);

      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    // 登录成功，重置失败计数
    attemptsMap.delete(key);

    const response = NextResponse.json({ success: true });
    await setAdminCookie(response, session);
    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  await revokeAdminSession(request, response);
  return response;
}
