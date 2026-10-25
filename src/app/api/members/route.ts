import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, questionnaireSubmissions, memberMemories, dailyHealthLogs, trainings, aiFeedbackReports, photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const data = await db.select().from(members).orderBy(members.createdAt);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const body = await request.json();

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "请填写会员姓名" }, { status: 400 });
  const phone = body.phone ? String(body.phone).trim() : null;
  if (phone) {
    const [dup] = await db.select({ id: members.id }).from(members).where(eq(members.phone, phone)).limit(1);
    if (dup) return NextResponse.json({ error: "这个手机号已经有一位会员了，请直接搜索该会员" }, { status: 409 });
  }

  // 登录凭据：邀请码 8 位（大写字母与数字）+ 登录 PIN 6 位数字，可在后台手动指定
  const genCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[crypto.randomInt(chars.length)];
    return out;
  };
  const genPin = () => String(crypto.randomInt(100000, 1000000));
  let portalCode = body.portalCode ? String(body.portalCode).trim().toUpperCase() : "";
  if (portalCode && !/^[A-Z0-9]{4,20}$/.test(portalCode)) {
    return NextResponse.json({ error: "邀请码只能是 4 到 20 位大写字母或数字" }, { status: 400 });
  }
  let loginPin = body.loginPin ? String(body.loginPin).trim() : "";
  if (loginPin && !/^[0-9]{4,8}$/.test(loginPin)) {
    return NextResponse.json({ error: "登录 PIN 只能是 4 到 8 位数字" }, { status: 400 });
  }
  if (!portalCode) {
    for (let i = 0; i < 20; i++) {
      const c = genCode();
      const [dup] = await db.select({ id: members.id }).from(members).where(eq(members.portalCode, c)).limit(1);
      if (!dup) { portalCode = c; break; }
    }
  }
  if (!loginPin) loginPin = genPin();

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
      notes: body.notes || null,
      mentorName: body.mentorName || null,
      portalCode,
      loginPin,
      portalEnabled: 1,
      tenantId: 1,
    })
    .returning();

  const member = (result as any)[0];
  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
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
