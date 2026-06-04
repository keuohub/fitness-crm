import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const [row] = await db.select({ v: count() }).from(members);
  return NextResponse.json({ totalMembers: row?.v ?? 0 });
}
