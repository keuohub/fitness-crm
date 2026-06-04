import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionnaireSubmissions, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId 参数" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const data = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(desc(questionnaireSubmissions.submittedAt));

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { memberId, ...fields } = body;

  if (!memberId) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const __r_record = await db
    .insert(questionnaireSubmissions)
    .values({
      memberId,
      tenantId: 1,
      age: fields.age ?? null,
      height: fields.height ?? null,
      weight: fields.weight ?? null,
      avgSleep: fields.avgSleep ?? null,
      name: fields.name ?? null,
      occupation: fields.occupation ?? null,
      workStatus: fields.workStatus ?? null,
      exerciseFrequency: fields.exerciseFrequency ?? null,
      mainConcern: fields.mainConcern ?? null,
      edema: fields.edema ?? null,
      fatigue: fields.fatigue ?? null,
      shoulderNeckPain: fields.shoulderNeckPain ?? null,
      backPain: fields.backPain ?? null,
      lowEnergy: fields.lowEnergy ?? null,
      constipation: fields.constipation ?? null,
      sedentary: fields.sedentary ?? null,
      anxiety: fields.anxiety ?? null,
      bedtime: fields.bedtime ?? null,
      breakfast: fields.breakfast ?? null,
      lunch: fields.lunch ?? null,
      dinner: fields.dinner ?? null,
      takeout: fields.takeout ?? null,
      sugaryDrinks: fields.sugaryDrinks ?? null,
      lateSnack: fields.lateSnack ?? null,
      bingeTime: fields.bingeTime ?? null,
      dietHistory: fields.dietHistory ?? null,
      waterIntake: fields.waterIntake ?? null,
      cravings: fields.cravings ?? null,
      menstrualRegular: fields.menstrualRegular ?? null,
      menstrualBinge: fields.menstrualBinge ?? null,
      menstrualEdema: fields.menstrualEdema ?? null,
      desiredState: fields.desiredState ?? null,
      commitment: fields.commitment ?? null,
    })
    .returning();
  const record = (__r_record as any)[0];

  await db
    .update(members)
    .set({ currentQuestionnaireId: record.id })
    .where(eq(members.id, memberId));

  return NextResponse.json(record, { status: 201 });
}
