import { NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyStars } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
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
