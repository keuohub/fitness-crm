import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db, rawSql } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
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
      .orderBy(asc(teamMembers.sortOrder), desc(teamMembers.id));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/admin/team error:", err);
    return NextResponse.json({ error: err.message || "获取团队成员列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, roleTitle, avatarUrl, bio, experience, creds, quote, sortOrder = 0, isActive = 1 } = body;

    if (!name || !roleTitle || !avatarUrl) {
      return NextResponse.json({ error: "姓名、称谓与照片为必填项" }, { status: 400 });
    }

    const [created] = await db
      .insert(teamMembers)
      .values({
        name,
        roleTitle,
        avatarUrl,
        bio: bio || null,
        experience: experience || "",
        creds: creds || "",
        quote: quote || "",
        sortOrder: Number(sortOrder) || 0,
        isActive: Number(isActive) || 1,
      })
      .returning();

    invalidateCache("team");
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("POST /api/admin/team error:", err);
    return NextResponse.json({ error: err.message || "添加团队成员失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, name, roleTitle, avatarUrl, bio, experience, creds, quote, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (roleTitle !== undefined) updateData.roleTitle = roleTitle;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (experience !== undefined) updateData.experience = experience;
    if (creds !== undefined) updateData.creds = creds;
    if (quote !== undefined) updateData.quote = quote;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    const [updated] = await db
      .update(teamMembers)
      .set(updateData)
      .where(eq(teamMembers.id, Number(id)))
      .returning();

    invalidateCache("team");
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/admin/team error:", err);
    return NextResponse.json({ error: err.message || "更新团队成员失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, Number(id)));

    invalidateCache("team");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/team error:", err);
    return NextResponse.json({ error: err.message || "删除团队成员失败" }, { status: 500 });
  }
}
