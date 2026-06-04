import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberMemories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");
  const type = searchParams.get("type");

  try {
    let query = db.select().from(memberMemories).orderBy(desc(memberMemories.createdAt));

    if (memberIdParam) {
      const memberId = parseInt(memberIdParam, 10);
      if (!isNaN(memberId)) {
        // dynamic filter
        const all = await query;
        const filtered = all.filter((m) => m.memberId === memberId && (type ? m.memoryType === type : true));
        return NextResponse.json({ memories: filtered });
      }
    }

    const all = await query;
    const filtered = type ? all.filter((m) => m.memoryType === type) : all;
    return NextResponse.json({ memories: filtered });
  } catch (err) {
    console.error("Memories error:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { memberId, memoryType, content, structuredData } = body;

    if (!memberId || !content) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    await db.insert(memberMemories).values({
      memberId,
      tenantId: 1,
      memoryType: memoryType || "note",
      content,
      structuredData: structuredData || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Memory insert error:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
