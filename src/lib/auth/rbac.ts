// RBAC — Role-Based Access Control
// requireRole("owner") | requireRole("manager") | requireRole("coach")

import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, adminSessions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export type AdminRole = "owner" | "manager" | "coach" | "viewer";

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  owner: 4,
  manager: 3,
  coach: 2,
  viewer: 1,
};

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
}

/**
 * 从 admin_sessions 或 admin_session cookie 获取当前管理员信息
 */
export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
  // 1. admin_sessions token (server-side)
  const token = request.cookies.get("admin_token")?.value;
  if (token) {
    const [session] = await db
      .select({
        adminId: adminSessions.adminId,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(adminSessions)
      .innerJoin(users, eq(adminSessions.adminId, users.id))
      .where(and(eq(adminSessions.token, token), gte(adminSessions.expiresAt, new Date().toISOString())));

    if (session) {
      if (session.status === "inactive") return null;
      return {
        id: session.adminId,
        name: session.name,
        email: session.email,
        role: session.role as AdminRole,
      };
    }
  }

  // 2. Fallback: legacy signed admin_session cookie
  const legacyRaw = request.cookies.get("admin_session")?.value;
  if (legacyRaw) {
    try {
      const { userId } = JSON.parse(legacyRaw);
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status })
        .from(users)
        .where(eq(users.id, userId));

      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AdminRole,
        };
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * 要求指定角色或更高权限
 * 返回 admin user 或 null（调用方返回 403）
 */
export async function requireRole(
  request: NextRequest,
  minimumRole: AdminRole
): Promise<AdminUser | null> {
  const user = await getAdminUser(request);
  if (!user) return null;

  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) return null;
  return user;
}

/**
 * 检查当前管理员是否有指定权限
 */
export async function hasRole(
  request: NextRequest,
  role: AdminRole
): Promise<boolean> {
  const user = await getAdminUser(request);
  if (!user) return false;
  return (ROLE_HIERARCHY[user.role] || 0) >= ROLE_HIERARCHY[role];
}

/**
 * 更新 users 表的 role
 */
export async function setUserRole(userId: number, role: AdminRole): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

/**
 * 检查是否为 owner
 */
export async function isOwner(request: NextRequest): Promise<boolean> {
  return hasRole(request, "owner");
}
