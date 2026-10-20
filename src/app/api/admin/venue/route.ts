import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

export async function GET() {
  try {
    await rawSql`
      CREATE TABLE IF NOT EXISTS venue_items (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    const rows = await db
      .select()
      .from(venueItems)
      .orderBy(asc(venueItems.sortOrder), desc(venueItems.id));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/admin/venue error:", err);
    return NextResponse.json({ error: err.message || "获取场馆空间列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, imageUrl, sortOrder = 0, isActive = 1 } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ error: "标题和照片为必填项" }, { status: 400 });
    }

    const [created] = await db
      .insert(venueItems)
      .values({
        title,
        imageUrl,
        sortOrder: Number(sortOrder) || 0,
        isActive: Number(isActive) || 1,
      })
      .returning();

    invalidateCache("venue");
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("POST /api/admin/venue error:", err);
    return NextResponse.json({ error: err.message || "创建场馆项目失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, imageUrl, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    const [updated] = await db
      .update(venueItems)
      .set(updateData)
      .where(eq(venueItems.id, Number(id)))
      .returning();

    invalidateCache("venue");
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/admin/venue error:", err);
    return NextResponse.json({ error: err.message || "更新场馆项目失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    await db.delete(venueItems).where(eq(venueItems.id, Number(id)));

    invalidateCache("venue");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/venue error:", err);
    return NextResponse.json({ error: err.message || "删除场馆项目失败" }, { status: 500 });
  }
}
