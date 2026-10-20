import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_VENUES = [
  {
    id: 1,
    title: "",
    imageUrl: "/brand/venue/venue-1.jpg",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    title: "",
    imageUrl: "/brand/venue/venue-2.jpg",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    title: "",
    imageUrl: "/brand/venue/venue-3.jpg",
    sortOrder: 3,
    isActive: 1,
  },
  {
    id: 4,
    title: "",
    imageUrl: "/brand/venue/venue-4.jpg",
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

    const rows = await db
      .select()
      .from(venueItems)
      .where(eq(venueItems.isActive, 1))
      .orderBy(asc(venueItems.sortOrder));

    if (rows && rows.length > 0) {
      return NextResponse.json(rows);
    }

    for (const v of DEFAULT_VENUES) {
      await db.insert(venueItems).values({
        title: v.title,
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

    return NextResponse.json(seeded.length > 0 ? seeded : DEFAULT_VENUES);
  } catch (err) {
    console.warn("portal/venue error, returning default venues:", err);
    return NextResponse.json(DEFAULT_VENUES);
  }
}
