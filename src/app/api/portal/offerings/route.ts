import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { courseOfferings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    await rawSql`
      CREATE TABLE IF NOT EXISTS course_offerings (
        id SERIAL PRIMARY KEY,
        num TEXT NOT NULL,
        name TEXT NOT NULL,
        en_name TEXT NOT NULL,
        summary TEXT NOT NULL,
        target TEXT NOT NULL,
        highlight TEXT NOT NULL,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await rawSql`ALTER TABLE course_offerings ADD COLUMN IF NOT EXISTS image_url TEXT;`;

    const rows = await db
      .select()
      .from(courseOfferings)
      .where(eq(courseOfferings.isActive, 1))
      .orderBy(asc(courseOfferings.sortOrder));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("portal/offerings error:", err);
    return NextResponse.json([]);
  }
}
