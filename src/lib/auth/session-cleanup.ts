// Session 自动清理任务
// 删除过期 member_sessions 和 admin_sessions

import { db } from "@/db";
import { memberSessions, adminSessions } from "@/db/schema";
import { lte } from "drizzle-orm";

export async function cleanExpiredSessions(): Promise<{ memberSessions: number; adminSessions: number }> {
  const now = new Date().toISOString();

  const memberResult = await db.delete(memberSessions).where(lte(memberSessions.expiresAt, now));
  const adminResult = await db.delete(adminSessions).where(lte(adminSessions.expiresAt, now));

  return {
    memberSessions: 0, // SQLite
    adminSessions: 0, // SQLite
  };
}
