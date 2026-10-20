import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { monthlyStars } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_STARS = [
  {
    id: 1,
    name: "苏晴",
    avatarUrl: "/brand/stars/star-1.jpg",
    tag: "从容",
    quote: "在呼吸的节律里，重新找回身体原本的力量。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    name: "念安",
    avatarUrl: "/brand/stars/star-2.jpg",
    tag: "深耕",
    quote: "每一次对抗与拉伸，都是与自己最真实的对话。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    name: "黛萌",
    avatarUrl: "/brand/stars/star-3.jpg",
    tag: "专注",
    quote: "心神定下来，身体自会给出优雅的回应。",
    sortOrder: 3,
    isActive: 1,
  },
  {
    id: 4,
    name: "语晨",
    avatarUrl: "/brand/stars/star-4.jpg",
    tag: "觉知",
    quote: "卸下外界的喧嚣，在这里只专注向内的深邃。",
    sortOrder: 4,
    isActive: 1,
  },
  {
    id: 5,
    name: "若薇",
    avatarUrl: "/brand/stars/star-5.jpg",
    tag: "自在",
    quote: "不执着于速度，每一步坚持都在沉淀笃定。",
    sortOrder: 5,
    isActive: 1,
  },
  {
    id: 6,
    name: "听澜",
    avatarUrl: "/brand/stars/star-6.jpg",
    tag: "恒温",
    quote: "舒展的不仅是脊柱线条，更是内在的从容与热爱。",
    sortOrder: 6,
    isActive: 1,
  },
];

export async function GET() {
  try {
    // 确保数据表存在 (幂等自愈)
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
      .where(eq(monthlyStars.isActive, 1))
      .orderBy(asc(monthlyStars.sortOrder));

    if (rows && rows.length > 0) {
      return NextResponse.json(rows);
    }

    // 若数据库刚建表尚无记录，自动批量预置首批 6 位高阶样片
    for (const star of DEFAULT_STARS) {
      await db.insert(monthlyStars).values({
        name: star.name,
        avatarUrl: star.avatarUrl,
        tag: star.tag,
        quote: star.quote,
        sortOrder: star.sortOrder,
        isActive: star.isActive,
      });
    }

    const seeded = await db
      .select()
      .from(monthlyStars)
      .where(eq(monthlyStars.isActive, 1))
      .orderBy(asc(monthlyStars.sortOrder));

    return NextResponse.json(seeded.length > 0 ? seeded : DEFAULT_STARS);
  } catch (err) {
    console.warn("portal/stars error, returning default stars:", err);
    return NextResponse.json(DEFAULT_STARS);
  }
}
