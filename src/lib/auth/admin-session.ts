// Admin Session — dual-mode: admin_sessions table (primary) + legacy signed cookie (fallback)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminSessions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";
import { hashSync, compareSync } from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@laiwu.fitness";
const LEGACY_COOKIE = "admin_session";
const PORTAL_COOKIE_NAME = "portal_member_id";
const PORTAL_SIGN_COOKIE = "portal_member_sig";
const TOKEN_COOKIE = "admin_token";

// ── 懒校验（Lazy Init）──────────────────────────────────────
// 目的：Docker / 云托管构建阶段不读管理员口令，`next build` 不会因缺少
// ADMIN_PASSWORD 而中断；真正缺失时在**首次使用口令**的那一刻报错（fail-fast）。
function getAdminSecret(): string {
  const raw = process.env.ADMIN_PASSWORD;
  if (!raw) {
    throw new Error(
      "ADMIN_PASSWORD 环境变量未设置：管理员登录口令缺失。\n" +
        "本地请写入 .env.local；云端请在「微信云托管 → 服务设置 → 环境变量」配置后重新发布。"
    );
  }
  return raw;
}

/** 口令缺失时返回 null，供“能走 DB 校验就不必阻断登录”的场景使用 */
function tryGetAdminSecret(): string | null {
  try {
    return getAdminSecret();
  } catch {
    return null;
  }
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
}

function getSignKey(): string {
  return process.env.COOKIE_SIGN_KEY || getAdminSecret();
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSignKey())
    .update(payload)
    .digest("hex");
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

export interface AdminSession {
  userId: number;
  email: string;
  role?: string;
}

// Verify admin credentials
export async function verifyAdminLogin(
  emailInput: string,
  passwordInput: string
): Promise<AdminSession | null> {
  const cleanEmail = (emailInput || "").trim().toLowerCase();
  const cleanPass = (passwordInput || "").trim();
  const lookupEmail = cleanEmail === "admin" ? getAdminEmail() : cleanEmail;
  // 口令仅在本次登录校验时读取；环境变量缺失时降级为“只走 DB 校验”，不会让请求崩溃
  const envSecret = tryGetAdminSecret();

  // 从 users 表验证（支持多管理员与别名 admin）
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.email, lookupEmail));

    if (user) {
      let isValid = false;

      // 1. bcrypt 校验（标准算法）
      try {
        if (user.passwordHash && (user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$"))) {
          isValid = compareSync(cleanPass, user.passwordHash);
        }
      } catch {
        isValid = false;
      }

      // 2. 根管理员环境变量备用
      if (!isValid && envSecret && cleanPass === envSecret) {
        isValid = true;
      }

      // 3. HMAC 签名兼容
      if (!isValid && verifySignature(cleanPass, user.passwordHash)) {
        isValid = true;
      }

      // 4. 历史明文兼容（登录成功后自动升级为 bcrypt 强哈希）
      if (!isValid && user.passwordHash === cleanPass) {
        isValid = true;
        try {
          db.update(users).set({ passwordHash: hashSync(cleanPass, 10) }).where(eq(users.id, user.id)).catch(() => {});
        } catch {
          // 静默容错
        }
      }

      if (isValid) {
        if (user.status === "inactive") return null;
        return { userId: user.id, email: user.email, role: user.role ?? "owner" };
      }
    }
  } catch (err) {
    console.warn("DB user lookup error, falling back to env secret:", err);
  }

  // Fallback: 环境变量硬编码管理员（支持输入 admin 或 admin@laiwu.fitness）
  if ((lookupEmail === getAdminEmail() || cleanEmail === "admin") && envSecret && cleanPass === envSecret) {
    return { userId: 1, email: getAdminEmail(), role: "owner" };
  }

  return null;
}

// Get admin session — server-side DB validation (token-based with status check)
export async function getValidAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const [session] = await db
        .select({
          adminId: adminSessions.adminId,
          email: users.email,
          role: users.role,
          status: users.status,
        })
        .from(adminSessions)
        .innerJoin(users, eq(adminSessions.adminId, users.id))
        .where(and(eq(adminSessions.token, token), gte(adminSessions.expiresAt, new Date().toISOString())));

      if (session) {
        if (session.status === "inactive") return null;
        return { userId: session.adminId, email: session.email, role: session.role ?? "owner" };
      }
      // Token in cookie was revoked or expired in DB -> reject immediately
      return null;
    } catch (err) {
      console.warn("DB session lookup error:", err);
    }
  }

  // Fallback to signature check ONLY if no token cookie was passed (e.g. edge proxy)
  const raw = request.cookies.get(LEGACY_COOKIE)?.value;
  const sig = request.cookies.get(`${LEGACY_COOKIE}_sig`)?.value;
  if (!token && raw && sig && verifySignature(raw, sig)) {
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      // Fall through
    }
  }
  return null;
}

// Get admin session — legacy synchronous helper
export function getAdminSession(request: NextRequest): AdminSession | null {
  // Legacy signed cookie
  const raw = request.cookies.get(LEGACY_COOKIE)?.value;
  const sig = request.cookies.get(`${LEGACY_COOKIE}_sig`)?.value;
  if (raw && sig && verifySignature(raw, sig)) {
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      // Fall through
    }
  }
  return null;
}

// Set admin cookie on response (token-based primary + legacy fallback)
export async function setAdminCookie(
  response: NextResponse,
  session: AdminSession
): Promise<void> {
  // 1. 生成 admin_sessions 记录
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await db.insert(adminSessions).values({
      adminId: session.userId,
      token,
      expiresAt,
    });
  } catch (err) {
    console.warn("Failed to insert adminSessions record, continuing with cookie:", err);
  }

  // Cookie 选项：在 localhost HTTP 环境下必须为 secure: false，否则浏览器会静默丢弃 Cookie
  const cookieOpts = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天有效期
  };

  // Token cookie (primary)
  response.cookies.set(TOKEN_COOKIE, token, cookieOpts);

  // Legacy signed cookie (fallback for middleware)
  const payload = JSON.stringify(session);
  const signature = sign(payload);
  response.cookies.set(LEGACY_COOKIE, payload, cookieOpts);
  response.cookies.set(`${LEGACY_COOKIE}_sig`, signature, cookieOpts);
}

// Clear admin cookie
export function clearAdminCookie(response: NextResponse): void {
  response.cookies.delete(LEGACY_COOKIE);
  response.cookies.delete(`${LEGACY_COOKIE}_sig`);
  response.cookies.delete(TOKEN_COOKIE);
}

// Revoke admin session in DB and clear cookies
export async function revokeAdminSession(request: NextRequest, response: NextResponse): Promise<void> {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(adminSessions).where(eq(adminSessions.token, token));
    } catch (err) {
      console.warn("Failed to delete admin session from DB:", err);
    }
  }
  clearAdminCookie(response);
}

// Require admin — returns session or null
export function requireAdmin(request: NextRequest): AdminSession | null {
  return getAdminSession(request);
}
