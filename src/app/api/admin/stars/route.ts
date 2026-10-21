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
        join_days INTEGER,
        train_count INTEGER,
        course_type TEXT,
        journey TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS join_days INTEGER;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS train_count INTEGER;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS course_type TEXT;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS journey TEXT;`;

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
    const {
      name,
      avatarUrl,
      tag,
      quote,
      joinDays,
      trainCount,
      courseType,
      journey,
      sortOrder = 0,
      isActive = 1,
    } = body;

    if (!name || !avatarUrl) {
      return NextResponse.json({ error: "姓名和照片为必填项" }, { status: 400 });
    }

    // 计算默认 journey
    const finalDays = joinDays !== undefined && joinDays !== null && joinDays !== "" ? Number(joinDays) : null;
    const finalCount = trainCount !== undefined && trainCount !== null && trainCount !== "" ? Number(trainCount) : null;
    let computedJourney = journey;
    if (!computedJourney && (finalDays || finalCount)) {
      computedJourney = `相伴自律 ${finalDays || 0} 天 · ${finalCount || 0} 节${courseType || "私教"}`;
    }

    const [created] = await db
      .insert(monthlyStars)
      .values({
        name,
        avatarUrl,
        tag: tag || null,
        quote: quote || null,
        joinDays: finalDays,
        trainCount: finalCount,
        courseType: courseType || null,
        journey: computedJourney || null,
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
    const {
      id,
      name,
      avatarUrl,
      tag,
      quote,
      joinDays,
      trainCount,
      courseType,
      journey,
      sortOrder,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (tag !== undefined) updateData.tag = tag;
    if (quote !== undefined) updateData.quote = quote;
    if (joinDays !== undefined) updateData.joinDays = joinDays !== null && joinDays !== "" ? Number(joinDays) : null;
    if (trainCount !== undefined) updateData.trainCount = trainCount !== null && trainCount !== "" ? Number(trainCount) : null;
    if (courseType !== undefined) updateData.courseType = courseType;
    if (journey !== undefined) updateData.journey = journey;
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
