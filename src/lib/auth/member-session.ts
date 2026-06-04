// Member Session — session-based auth (phone login) with portal_code fallback
// 优先读取 member_sessions 表（手机号登录），回退 portal_code cookie（邀请码登录）

import { NextRequest } from "next/server";
import { db } from "@/db";
import { memberSessions, members } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";

const SESSION_COOKIE = "member_session";
const LEGACY_ID_COOKIE = "portal_member_id";
const LEGACY_SIG_COOKIE = "portal_member_sig";

function getSignKey(): string {
  return process.env.COOKIE_SIGN_KEY || process.env.ADMIN_PASSWORD || "CHANGE_ME";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSignKey()).update(payload).digest("hex");
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

/**
 * 获取当前请求对应的 memberId
 * 优先 member_sessions（手机号登录），回退 portal_code cookie
 */
export async function getPortalMemberId(request: NextRequest): Promise<number | null> {
  // 1. 手机号 Session
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const [session] = await db
      .select({ memberId: memberSessions.memberId })
      .from(memberSessions)
      .where(and(eq(memberSessions.token, token), gte(memberSessions.expiresAt, new Date().toISOString())));

    if (session) return session.memberId;
  }

  // 2. 回退：portal_code Cookie（邀请码登录）
  const rawId = request.cookies.get(LEGACY_ID_COOKIE)?.value;
  const idSig = request.cookies.get(LEGACY_SIG_COOKIE)?.value;
  if (rawId && idSig && verifySignature(rawId, idSig)) {
    const memberId = parseInt(rawId, 10);
    if (!isNaN(memberId)) {
      // 验证会员仍然存在且 portal_enabled
      const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.id, memberId), eq(members.portalEnabled, 1)));
      if (member) return memberId;
    }
  }

  return null;
}

/**
 * 同步版本，用于不需要 DB 查询的轻量场景（保留兼容旧代码）
 */
export function getPortalMemberIdSync(request: NextRequest): number | null {
  const rawId = request.cookies.get(LEGACY_ID_COOKIE)?.value;
  const idSig = request.cookies.get(LEGACY_SIG_COOKIE)?.value;
  if (rawId && idSig && verifySignature(rawId, idSig)) {
    const memberId = parseInt(rawId, 10);
    if (!isNaN(memberId)) return memberId;
  }
  return null;
}

export { SESSION_COOKIE, sign };
