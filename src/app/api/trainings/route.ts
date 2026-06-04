import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  // Ownership check
  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const data = await db
    .select()
    .from(trainings)
    .where(eq(trainings.memberId, memberId))
    .orderBy(desc(trainings.trainingDate));

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { memberId, trainingDate, durationMinutes, type, focusArea, notes } = body;

  if (!memberId || !trainingDate) {
    return NextResponse.json(
      { error: "缺少必填字段 memberId 或 trainingDate" },
      { status: 400 }
    );
  }

  // Ownership check
  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const __r_record = await db
    .insert(trainings)
    .values({
      tenantId: 1,
      memberId,
      coachId: body.coachId ?? 1,
      trainingDate,
      durationMinutes: durationMinutes ?? null,
      type: type ?? "private",
      focusArea: focusArea ?? null,
      notes: notes ?? null,
    })
    .returning();
  const record = (__r_record as any)[0];

  return NextResponse.json(record, { status: 201 });
}
