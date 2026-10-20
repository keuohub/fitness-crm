import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_TEAM = [
  {
    id: 1,
    name: "小桥",
    roleTitle: "徕舞主理人",
    avatarUrl: "/brand/team/team-1.jpg",
    bio: "慢下来，用呼吸唤醒身体的每一寸记忆。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    name: "嘉敏",
    roleTitle: "普拉提导师",
    avatarUrl: "/brand/team/team-2.jpg",
    bio: "专注当下每一次发力，感受从容舒展的蜕变。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    name: "若琳",
    roleTitle: "普拉提导师",
    avatarUrl: "/brand/team/team-3.jpg",
    bio: "在对抗与平衡中，雕刻坚韧而柔软的内在力量。",
    sortOrder: 3,
    isActive: 1,
  },
];

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

    for (const m of DEFAULT_TEAM) {
      await db.insert(teamMembers).values({
        name: m.name,
        roleTitle: m.roleTitle,
        avatarUrl: m.avatarUrl,
        bio: m.bio,
        sortOrder: m.sortOrder,
        isActive: m.isActive,
      });
    }

    const seeded = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, 1))
      .orderBy(asc(teamMembers.sortOrder));

    return NextResponse.json(seeded.length > 0 ? seeded : DEFAULT_TEAM);
  } catch (err) {
    console.warn("portal/team error, returning default team:", err);
    return NextResponse.json(DEFAULT_TEAM);
  }
}
