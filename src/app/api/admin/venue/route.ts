import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

async function ensureVenueSchema() {
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
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS name TEXT;`;
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS tag TEXT;`;
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS "desc" TEXT;`;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();

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
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();
    const body = await req.json();
    const { title, name, tag, desc: descText, imageUrl, sortOrder = 0, isActive = 1 } = body;

    const displayTitle = (title || name || "空间实景").trim();
    if (!imageUrl) {
      return NextResponse.json({ error: "照片为必填项" }, { status: 400 });
    }

    const order = Number(sortOrder) || 1;
    const autoIndex = String(order).padStart(2, "0");
    const displayTag = (tag && String(tag).trim()) ? String(tag).trim() : `${autoIndex} / 空间实景`;

    const [created] = await db
      .insert(venueItems)
      .values({
        title: displayTitle,
        name: displayTitle,
        tag: displayTag,
        desc: descText || "",
        imageUrl,
        sortOrder: order,
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
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();
    const body = await req.json();
    const { id, title, name, tag, desc: descText, imageUrl, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = String(title).trim();
      updateData.name = String(title).trim();
    }
    if (name !== undefined && title === undefined) {
      updateData.name = String(name).trim();
      updateData.title = String(name).trim();
    }
    if (tag !== undefined) {
      updateData.tag = String(tag).trim();
    }
    if (descText !== undefined) updateData.desc = descText;
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
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
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
