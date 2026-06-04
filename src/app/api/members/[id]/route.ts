import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, questionnaireSubmissions, memberMemories, dailyHealthLogs, trainings, aiFeedbackReports, photos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

  return NextResponse.json(member);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: "无效 id" }, { status: 400 });

    const body = await request.json();

    const tagsValue = body.tags
      ? JSON.stringify(
          body.tags
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        )
      : null;

    const result = await db
      .update(members)
      .set({
        name: body.name,
        phone: body.phone || null,
        gender: body.gender || null,
        stage: body.stage || null,
        tags: tagsValue,
        status: body.status || "active",
        joinedAt: body.joinedAt || null,
        birthday: body.birthday || null,
        notes: body.notes || null,
      })
      .where(eq(members.id, id))
      .returning();

    const updated = (result as any)[0];
    if (!updated) {
      return NextResponse.json({ error: "会员不存在" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的 id" }, { status: 400 });
    }

    await db.delete(questionnaireSubmissions).where(eq(questionnaireSubmissions.memberId, id));
    await db.delete(memberMemories).where(eq(memberMemories.memberId, id));
    await db.delete(dailyHealthLogs).where(eq(dailyHealthLogs.memberId, id));
    await db.delete(trainings).where(eq(trainings.memberId, id));
    await db.delete(aiFeedbackReports).where(eq(aiFeedbackReports.memberId, id));
    await db.delete(photos).where(eq(photos.memberId, id));
    await db.delete(members).where(eq(members.id, id));

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
