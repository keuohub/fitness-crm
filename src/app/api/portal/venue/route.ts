import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

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
    await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS name TEXT;`;
    await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS tag TEXT;`;
    await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS "desc" TEXT;`;

    const rows = await db
      .select()
      .from(venueItems)
      .where(eq(venueItems.isActive, 1))
      .orderBy(asc(venueItems.sortOrder));

    if (rows && rows.length > 0) {
      const formatted = rows.map((r: any) => ({
        id: r.id,
        title: r.title || r.name,
        name: r.name || r.title,
        tag: r.tag || "01 / 空间实景",
        desc: r.desc || "",
        imageUrl: r.imageUrl,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      }));
      return NextResponse.json(formatted);
    }

    // 空表返回空数组，不自动灌入默认场馆
    return NextResponse.json([]);
  } catch (err: any) {
    console.error("GET /api/portal/venue error:", err);
    return NextResponse.json([]);
  }
}
