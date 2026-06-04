import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, questionnaireSubmissions, memberMemories, dailyHealthLogs, trainings, aiFeedbackReports, photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const data = await db.select().from(members).orderBy(members.createdAt);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

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
    .insert(members)
    .values({
      name: body.name,
      phone: body.phone || null,
      gender: body.gender || null,
      stage: body.stage || null,
      tags: tagsValue,
      memberCode: body.memberCode && body.memberCode.trim()
        ? body.memberCode.trim()
        : await (async () => {
            const lastMembers = await db
              .select({ memberCode: members.memberCode })
              .from(members)
              .orderBy(desc(members.memberCode))
              .limit(1);
            if (lastMembers.length > 0 && lastMembers[0].memberCode) {
              return String(parseInt(lastMembers[0].memberCode, 10) + 1).padStart(4, "0");
            }
            return "0001";
          })(),
      status: body.status || "active",
      joinedAt: body.joinedAt || null,
      birthday: body.birthday || null,
      tenantId: 1,
    })
    .returning();

  const member = (result as any)[0];
  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "缺少有效的 id" }, { status: 400 });
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
