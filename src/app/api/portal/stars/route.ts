import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { monthlyStars } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_STARS = [
  {
    id: 1,
    name: "林晓",
    avatarUrl: "/brand/stars/member_star_1.jpg",
    joinDays: 140,
    trainCount: 42,
    courseType: "大器械私教",
    journey: "相伴自律 140 天 · 42 节大器械私教",
    quote: "“肩颈松弛下来之后，呼吸都深了，连夜里的睡眠都踏实了许多。”",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    name: "许诺",
    avatarUrl: "/brand/stars/member_star_2.jpg",
    joinDays: 210,
    trainCount: 68,
    courseType: "大器械私教",
    journey: "相伴自律 210 天 · 68 节大器械私教",
    quote: "“以前总习惯性耸肩，在这里找回了背部力量，整个人自然挺拔了。”",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    name: "宋予安",
    avatarUrl: "/brand/stars/member_star_3.jpg",
    joinDays: 95,
    trainCount: 30,
    courseType: "精选普拉提",
    journey: "相伴自律 95 天 · 30 节精选普拉提",
    quote: "“把注意力收回到每一次呼与吸，身体比想象中更有内在的韧性。”",
    sortOrder: 3,
    isActive: 1,
  },
  {
    id: 4,
    name: "温澜",
    avatarUrl: "/brand/stars/member_star_4.jpg",
    joinDays: 180,
    trainCount: 56,
    courseType: "维密减脂",
    journey: "相伴自律 180 天 · 56 节维密减脂",
    quote: "“假胯宽纠正之后，不仅腿部线条顺畅了，走路腰也不再酸沉。”",
    sortOrder: 4,
    isActive: 1,
  },
  {
    id: 5,
    name: "苏晴",
    avatarUrl: "/brand/stars/star-1.jpg",
    joinDays: 320,
    trainCount: 96,
    courseType: "深度蜕变",
    journey: "相伴自律 320 天 · 96 节深度蜕变",
    quote: "“在呼吸的节律里，重新找回身体原本的力量与从容。”",
    sortOrder: 5,
    isActive: 1,
  },
  {
    id: 6,
    name: "念安",
    avatarUrl: "/brand/stars/star-2.jpg",
    joinDays: 260,
    trainCount: 80,
    courseType: "大器械私教",
    journey: "相伴自律 260 天 · 80 节大器械私教",
    quote: "“每一次对抗与拉伸，都是与自己身体最真实踏实的对话。”",
    sortOrder: 6,
    isActive: 1,
  },
];

export async function GET() {
  try {
    // 确保数据表存在并补齐字段 (幂等自愈)
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
      ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS join_days INTEGER;
      ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS train_count INTEGER;
      ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS course_type TEXT;
      ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS journey TEXT;
    `;

    const rows = await db
      .select()
      .from(monthlyStars)
      .where(eq(monthlyStars.isActive, 1))
      .orderBy(asc(monthlyStars.sortOrder));

    if (rows && rows.length > 0) {
      const formatted = rows.map((r) => {
        let j = r.journey;
        if (!j && (r.joinDays || r.trainCount)) {
          j = `相伴自律 ${r.joinDays || 0} 天 · ${r.trainCount || 0} 节${r.courseType || "私教"}`;
        }
        return {
          ...r,
          journey: j || "",
        };
      });
      return NextResponse.json(formatted);
    }

    // 若无记录，初始化首批 6 位真实会员
    for (const star of DEFAULT_STARS) {
      await db.insert(monthlyStars).values({
        name: star.name,
        avatarUrl: star.avatarUrl,
        joinDays: star.joinDays,
        trainCount: star.trainCount,
        courseType: star.courseType,
        journey: star.journey,
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
