import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    await rawSql`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        bio TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, 1))
      .orderBy(asc(teamMembers.sortOrder));

    if (rows && rows.length > 0) {
      return NextResponse.json(rows);
    }

    // 空表返回空数组，不自动灌入默认导师
    return NextResponse.json([]);
  } catch (err) {
    console.error("portal/team error:", err);
    return NextResponse.json([]);
  }
}
