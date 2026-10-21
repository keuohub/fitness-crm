import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, questionnaireSubmissions, memberMemories, dailyHealthLogs, trainings, aiFeedbackReports, photos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const access = await verifyMemberAccess(request, id);
  if (!access.allowed) {
    return NextResponse.json({ error: "需要管理员登录或会员专属访问" }, { status: 401 });
  }

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

    const updatePayload: any = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.phone !== undefined) updatePayload.phone = body.phone || null;
    if (body.memberCode !== undefined) updatePayload.memberCode = body.memberCode;
    if (body.mentorName !== undefined) updatePayload.mentorName = body.mentorName;
    if (body.totalHours !== undefined) updatePayload.totalHours = Number(body.totalHours);
    if (body.hoursPilates !== undefined) updatePayload.hoursPilates = Number(body.hoursPilates);
    if (body.hoursEquipment !== undefined) updatePayload.hoursEquipment = Number(body.hoursEquipment);
    if (body.hoursFatBurn !== undefined) updatePayload.hoursFatBurn = Number(body.hoursFatBurn);
    if (body.hoursPrivate !== undefined) updatePayload.hoursPrivate = Number(body.hoursPrivate);
    if (body.gender !== undefined) updatePayload.gender = body.gender || null;
    if (body.stage !== undefined) updatePayload.stage = body.stage || null;
    if (tagsValue !== null) updatePayload.tags = tagsValue;
    if (body.status !== undefined) updatePayload.status = body.status || "active";
    if (body.joinedAt !== undefined) updatePayload.joinedAt = body.joinedAt || null;
    if (body.birthday !== undefined) updatePayload.birthday = body.birthday || null;
    if (body.notes !== undefined) updatePayload.notes = body.notes || null;

    const result = await db
      .update(members)
      .set(updatePayload)
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
