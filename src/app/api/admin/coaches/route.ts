import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { hashSync } from "bcryptjs";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const rows = await rawSql`
    SELECT id, name, email, role, status, avatar_url
    FROM users WHERE tenant_id = 1 AND role = 'coach' AND status = 'active'
    ORDER BY id`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const name = String(b.name || "").trim();
  if (!name) return bad("教练姓名必填");
  const email = String(b.email || `coach-${Date.now()}@laiwu.local`).trim().toLowerCase();
  const [dup] = await rawSql`SELECT id FROM users WHERE email = ${email}`;
  if (dup) return bad("邮箱已存在", 409);
  const plain = String(b.password || crypto.randomBytes(8).toString("hex"));
  const hash = hashSync(plain, 10);
  const [row] = await rawSql`
    INSERT INTO users (tenant_id, name, email, password_hash, role, status, avatar_url)
    VALUES (1, ${name}, ${email}, ${hash}, 'coach', 'active', ${b.avatarUrl || null})
    RETURNING id, name, email, role, status, avatar_url`;
  return NextResponse.json(row, { status: 201 });
}
