import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { hashSync } from "bcryptjs";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  
  // 自动将「导师管理（team_members）」中启用的教练同步到可排课的教练库（users）中，保证两边姓名 100% 一致
  try {
    const mentors = await rawSql`SELECT id, name, avatar_url FROM team_members WHERE is_active = 1`;
    for (const m of mentors) {
      const [exists] = await rawSql`SELECT id FROM users WHERE name = ${m.name} AND is_coach = 1`;
      if (!exists) {
        const email = `coach-${Date.now()}-${Math.floor(Math.random() * 1000)}@laiwu.local`;
        const hash = hashSync(crypto.randomBytes(8).toString("hex"), 10);
        await rawSql`
          INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status, avatar_url)
          VALUES (1, ${m.name}, ${email}, ${hash}, 'coach', 1, 'active', ${m.avatar_url})
        `;
      }
    }
  } catch (e) {
    console.error("Sync team mentors to coach users error:", e);
  }

  const rows = await rawSql`
    SELECT id, name, email, role, status, avatar_url
    FROM users WHERE tenant_id = 1 AND is_coach = 1 AND status = 'active'
    ORDER BY id`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const name = String(b.name || "").trim();
  if (!name) return bad("教练姓名必填");

  // 若该姓名教练已存在且为活跃排课教练，直接返回
  const [exists] = await rawSql`SELECT id, name, email, role, status, avatar_url FROM users WHERE name = ${name} AND is_coach = 1 AND status = 'active'`;
  if (exists) {
    return NextResponse.json(exists, { status: 200 });
  }

  const email = String(b.email || `coach-${Date.now()}@laiwu.local`).trim().toLowerCase();
  const [dup] = await rawSql`SELECT id FROM users WHERE email = ${email}`;
  if (dup) return bad("邮箱已存在", 409);
  const plain = String(b.password || crypto.randomBytes(8).toString("hex"));
  const hash = hashSync(plain, 10);
  const [row] = await rawSql`
    INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status, avatar_url)
    VALUES (1, ${name}, ${email}, ${hash}, 'coach', 1, 'active', ${b.avatarUrl || null})
    RETURNING id, name, email, role, status, avatar_url`;

  // 同时也自动同步进导师库 team_members，保证导师库与排课教练两端名字完全打通
  try {
    const [inTeam] = await rawSql`SELECT id FROM team_members WHERE name = ${name}`;
    if (!inTeam) {
      await rawSql`
        INSERT INTO team_members (tenant_id, name, role_title, avatar_url, is_active, sort_order)
        VALUES (1, ${name}, '资深塑形教练', ${b.avatarUrl || '/images/team/team-2.jpg'}, 1, 50)
      `;
    }
  } catch (e) {
    console.error("Sync to team_members error:", e);
  }

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少教练 id");
  if (id === 1 || id === 11) return bad("系统核心主理人账号不可删除", 400);

  const [used] = await rawSql`SELECT id FROM class_sessions WHERE coach_id = ${id} LIMIT 1`;
  if (used) {
    // 课表中已有排课，软注销教练排课身份，确保历史课次仍保留记录
    await rawSql`UPDATE users SET is_coach = 0 WHERE id = ${id} AND tenant_id = 1`;
    return NextResponse.json({ success: true, mode: "deactivated" });
  }
  await rawSql`UPDATE users SET is_coach = 0, status = 'inactive' WHERE id = ${id} AND tenant_id = 1`;
  return NextResponse.json({ success: true, mode: "removed" });
}
