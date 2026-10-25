import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { rawSql } from "@/db";
import { signCoachToken } from "@/lib/auth/coach-token";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ error: "请输入教练邮箱和密码" }, { status: 400 });

  const [user] = await rawSql`
    SELECT id, name, email, password_hash, role, status
    FROM users WHERE lower(email) = ${email} AND is_coach = 1 AND status = 'active' LIMIT 1`;
  if (!user) return NextResponse.json({ error: "教练账号或密码不正确" }, { status: 401 });

  let ok = false;
  try { ok = compareSync(password, user.password_hash || ""); } catch { ok = false; }
  if (!ok && password === user.password_hash) ok = true;
  if (!ok) return NextResponse.json({ error: "教练账号或密码不正确" }, { status: 401 });

  return NextResponse.json({
    coachId: user.id,
    name: user.name,
    email: user.email,
    token: signCoachToken(user.id),
    tokenExpiresAt: Date.now() + 12 * 60 * 60 * 1000,
  });
}
