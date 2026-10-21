import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { monthlyStars } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

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
    `;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS join_days INTEGER;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS train_count INTEGER;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS course_type TEXT;`;
    await rawSql`ALTER TABLE monthly_stars ADD COLUMN IF NOT EXISTS journey TEXT;`;

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

    // 无真实数据就返回空数组，由前端空状态承接；绝不自动播种虚构会员
    return NextResponse.json([]);
  } catch (err) {
    console.error("portal/stars error:", err);
    return NextResponse.json([]);
  }
}
