import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_VENUES = [
  {
    id: 1,
    title: "静谧大器械空间",
    name: "静谧大器械空间",
    tag: "01 / 核心床静修区",
    desc: "德国原装进口实木核心床，配合温润漫射自然光照，专注于深层小肌群与呼吸节律。",
    imageUrl: "/images/venue/venue-1.jpg",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    title: "体态视觉评测室",
    name: "体态视觉评测室",
    tag: "02 / 私享评估间",
    desc: "专业医学级体态网格评估镜与多机位影像记录，精准捕捉肋骨外翻、骨盆前倾、脊柱曲度等体态代偿。",
    imageUrl: "/images/venue/venue-2.jpg",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    title: "更衣与呼吸准备区",
    name: "更衣与呼吸准备区",
    tag: "03 / 私密更衣空间",
    desc: "全独立私密更衣室、天然香氛与温润软装，进阶前卸下外界喧嚣，完成身心的静谧转场。",
    imageUrl: "/images/venue/venue-3.jpg",
    sortOrder: 3,
    isActive: 1,
  },
  {
    id: 4,
    title: "私密普拉提室",
    name: "私密普拉提室",
    tag: "04 / 一对一专属室",
    desc: "独享式大器械练习单元，隔绝外界干扰，导师全程一对一专注观察发力细节与呼吸安全。",
    imageUrl: "/images/venue/venue-4.jpg",
    sortOrder: 4,
    isActive: 1,
  },
];

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

    for (const v of DEFAULT_VENUES) {
      await db.insert(venueItems).values({
        title: v.title,
        name: v.name,
        tag: v.tag,
        desc: v.desc,
        imageUrl: v.imageUrl,
        sortOrder: v.sortOrder,
        isActive: v.isActive,
      });
    }

    const seeded = await db
      .select()
      .from(venueItems)
      .where(eq(venueItems.isActive, 1))
      .orderBy(asc(venueItems.sortOrder));

    return NextResponse.json(seeded);
  } catch (err: any) {
    console.error("GET /api/portal/venue error:", err);
    return NextResponse.json(DEFAULT_VENUES);
  }
}
