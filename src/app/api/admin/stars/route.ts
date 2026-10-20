import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { monthlyStars } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

export async function GET() {
  try {
    await rawSql`
      CREATE TABLE IF NOT EXISTS monthly_stars (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        tag TEXT,
        quote TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    const rows = await db
      .select()
      .from(monthlyStars)
      .orderBy(asc(monthlyStars.sortOrder), desc(monthlyStars.id));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/admin/stars error:", err);
    return NextResponse.json({ error: err.message || "获取月度之星列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, avatarUrl, tag, quote, sortOrder = 0, isActive = 1 } = body;

    if (!name || !avatarUrl) {
      return NextResponse.json({ error: "姓名和照片为必填项" }, { status: 400 });
    }

    const [created] = await db
      .insert(monthlyStars)
      .values({
        name,
        avatarUrl,
        tag: tag || null,
        quote: quote || null,
        sortOrder: Number(sortOrder) || 0,
        isActive: Number(isActive) || 1,
      })
      .returning();

    invalidateCache("stars");
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("POST /api/admin/stars error:", err);
    return NextResponse.json({ error: err.message || "创建月度之星失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, avatarUrl, tag, quote, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (tag !== undefined) updateData.tag = tag;
    if (quote !== undefined) updateData.quote = quote;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    const [updated] = await db
      .update(monthlyStars)
      .set(updateData)
      .where(eq(monthlyStars.id, Number(id)))
      .returning();

    invalidateCache("stars");
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/admin/stars error:", err);
    return NextResponse.json({ error: err.message || "更新月度之星失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    await db.delete(monthlyStars).where(eq(monthlyStars.id, Number(id)));

    invalidateCache("stars");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/stars error:", err);
    return NextResponse.json({ error: err.message || "删除月度之星失败" }, { status: 500 });
  }
}
