// Admin Users Management API
// GET: List all admin users (require owner/manager)
// POST: Create new admin user (require owner)
// PATCH: Update role/status (require owner)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminSessions } from "@/db/schema";
import { eq, not } from "drizzle-orm";
import { getAdminUser, requireRole } from "@/lib/auth/rbac";
import { hashSync } from "bcryptjs";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const all = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const owner = await requireRole(request, "owner");
  if (!owner) return NextResponse.json({ error: "权限不足" }, { status: 403 });

  const { name, email, password, role } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
  }

  const validRoles = ["owner", "manager", "coach", "viewer"];
  const assignedRole = validRoles.includes(role) ? role : "coach";

  // Check duplicate
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return NextResponse.json({ error: "该邮箱已存在" }, { status: 409 });

  const [newUser] = await db.insert(users).values({
    tenantId: 1,
    name,
    email,
    passwordHash: hashSync(password, 10), // 使用 bcrypt 强哈希存储
    role: assignedRole,
  }).returning({ id: users.id });

  return NextResponse.json({ id: newUser.id, name, email, role: assignedRole }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const owner = await requireRole(request, "owner");
  if (!owner) return NextResponse.json({ error: "权限不足" }, { status: 403 });

  const { id, role, status, password } = await request.json();
  if (!id) return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });

  const validRoles = ["owner", "manager", "coach", "viewer"];

  if (role && validRoles.includes(role)) {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }

  if (password && typeof password === "string" && password.trim()) {
    await db.update(users).set({ passwordHash: hashSync(password.trim(), 10) }).where(eq(users.id, id));
    // 密码变更后立即吊销该用户所有活跃会话
    await db.delete(adminSessions).where(eq(adminSessions.adminId, id));
  }

  if (status && ['active','inactive'].includes(status)) {
    await db.update(users).set({ status }).where(eq(users.id, id));
    if (status === 'inactive') {
      // 账号停用后立即吊销全部会话
      await db.delete(adminSessions).where(eq(adminSessions.adminId, id));
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const owner = await requireRole(request, "owner");
  if (!owner) return NextResponse.json({ error: "权限不足" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });

  // 不能删除自己
  if (id === owner.id) return NextResponse.json({ error: "不能删除自己" }, { status: 400 });

  // 不能删除最后一个 owner
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
  if (target?.role === "owner") {
    const ownerCount = await db.select().from(users).where(eq(users.role, "owner"));
    if (ownerCount.length <= 1) {
      return NextResponse.json({ error: "不能删除最后一个 Owner" }, { status: 400 });
    }
  }

  // 物理删除前吊销其所有服务端会话
  await db.delete(adminSessions).where(eq(adminSessions.adminId, id));
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
