import { NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const DEFAULT_TEAM = [
  {
    id: 1,
    name: "小桥",
    roleTitle: "创始人 / 教学主理人",
    avatarUrl: "/images/team/team-1.jpg",
    experience: "12 年普拉提与运动解剖研习",
    creds: "PMA 国际认证普拉提导师 · 脊柱侧弯与体态力学康复认证",
    quote: "“不追求花哨夸张的高难动作，而是在每一次深长呼吸里找准深层核心，让紧绷的脊柱自然舒展。”",
    bio: "慢下来，用呼吸唤醒身体的每一寸记忆。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    name: "嘉敏",
    roleTitle: "核心床与体态导师",
    avatarUrl: "/images/team/team-2.jpg",
    experience: "8 年普拉提大器械教学",
    creds: "骨盆稳定性纠正导师 · 下肢力线与假胯宽改善专家",
    quote: "“口令细腻温和，帮你在安全舒适的器械对抗中建立骨盆中立位，找回身体原本的挺拔。”",
    bio: "专注当下每一次发力，感受从容舒展的蜕变。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    name: "若琳",
    roleTitle: "维密体态与塑形导师",
    avatarUrl: "/images/team/team-3.jpg",
    experience: "6 年女性形体塑形研习",
    creds: "维密超模体态训练认证 · 产后腹直肌与盆底肌深度修复导师",
    quote: "“用柔和而坚定的节律唤醒沉睡小肌群，雕刻修长紧致的线条，让身体呈现由内而外的松弛感。”",
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
