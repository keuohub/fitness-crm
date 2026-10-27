import { NextResponse } from "next/server";
import { db } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(venueItems)
      .where(eq(venueItems.isActive, 1))
      .orderBy(asc(venueItems.sortOrder), asc(venueItems.id));

    if (rows && rows.length > 0) {
      const formatted = rows.map((r: any, idx: number) => {
        const orderNum = String(r.sortOrder || idx + 1).padStart(2, "0");
        const defaultTag = `${orderNum} / 空间实景`;
        return {
          id: r.id,
          title: r.title || r.name || "空间实景",
          name: r.name || r.title || "空间实景",
          tag: (r.tag && r.tag.trim()) ? r.tag.trim() : defaultTag,
          desc: r.desc || "",
          imageUrl: r.imageUrl,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        };
      });
      return NextResponse.json(formatted);
    }

    // 空表返回空数组，不自动灌入默认场馆
    return NextResponse.json([]);
  } catch (err: any) {
    console.error("GET /api/portal/venue error:", err);
    return NextResponse.json([]);
  }
}
