// SMS 验证码体系 — 5分钟有效，单次使用，登录限流

import { db } from "@/db";
import { smsCodes } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import crypto from "crypto";

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute between sends
const MAX_CODES_PER_WINDOW = 3;

/**
 * 生成并存储验证码
 * 开发环境固定 123456，生产环境随机6位
 */
export async function generateSMSCode(phone: string): Promise<{ code: string; error?: string }> {
  // 限流：1分钟内不超过3次
  const oneMinAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recent = await db
    .select({ id: smsCodes.id })
    .from(smsCodes)
    .where(and(eq(smsCodes.phone, phone), gte(smsCodes.createdAt, oneMinAgo)));

  if (recent.length >= MAX_CODES_PER_WINDOW) {
    return { code: "", error: "发送太频繁，请稍后再试" };
  }

  const code = process.env.NODE_ENV === "production"
    ? String(Math.floor(100000 + Math.random() * 900000))
    : "123456";

  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS).toISOString();

  await db.insert(smsCodes).values({ phone, code, expiresAt });

  return { code };
}

/**
 * 验证手机号+验证码
 */
export async function verifySMSCode(phone: string, code: string): Promise<boolean> {
  const now = new Date().toISOString();

  const [record] = await db
    .select({ id: smsCodes.id, used: smsCodes.used, expiresAt: smsCodes.expiresAt })
    .from(smsCodes)
    .where(
      and(
        eq(smsCodes.phone, phone),
        eq(smsCodes.code, code),
        eq(smsCodes.used, 0),
        gte(smsCodes.expiresAt, now)
      )
    )
    .orderBy(desc(smsCodes.createdAt))
    .limit(1);

  if (!record) return false;

  // 标记已使用
  await db.update(smsCodes).set({ used: 1 }).where(eq(smsCodes.id, record.id));

  return true;
}

/**
 * 清理过期验证码
 */
export async function cleanExpiredSMSCodes(): Promise<number> {
  const result = await db.delete(smsCodes).where(lte(smsCodes.expiresAt, new Date().toISOString()));
  return 0; // SQLite driver does not return rowCount
}
