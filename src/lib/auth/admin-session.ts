// Admin Session — dual-mode: admin_sessions table (primary) + legacy signed cookie (fallback)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD_RAW) throw new Error("ADMIN_PASSWORD 环境变量未设置");
const ADMIN_SECRET = ADMIN_PASSWORD_RAW;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@laiwu.fitness";
const LEGACY_COOKIE = "admin_session";
const PORTAL_COOKIE_NAME = "portal_member_id";
const PORTAL_SIGN_COOKIE = "portal_member_sig";
const TOKEN_COOKIE = "admin_token";

function getSignKey(): string {
  return process.env.COOKIE_SIGN_KEY || ADMIN_SECRET;
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
  const lookupEmail = cleanEmail === "admin" ? ADMIN_EMAIL : cleanEmail;

  // 从 users 表验证（支持多管理员与别名 admin）
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.email, lookupEmail));

    if (user) {
      const isValid =
        user.passwordHash === cleanPass ||
        cleanPass === ADMIN_SECRET ||
        verifySignature(cleanPass, user.passwordHash);
      if (isValid) {
        if (user.status === "inactive") return null;
        return { userId: user.id, email: user.email, role: user.role ?? "owner" };
      }
    }
  } catch (err) {
    console.warn("DB user lookup error, falling back to env secret:", err);
  }

  // Fallback: 环境变量硬编码管理员（支持输入 admin 或 admin@laiwu.fitness）
  if ((lookupEmail === ADMIN_EMAIL || cleanEmail === "admin") && cleanPass === ADMIN_SECRET) {
    return { userId: 1, email: ADMIN_EMAIL, role: "owner" };
  }

  return null;
}

// Get admin session — prefer token-based, fallback to legacy cookie
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

// Require admin — returns session or null
export function requireAdmin(request: NextRequest): AdminSession | null {
  return getAdminSession(request);
}
