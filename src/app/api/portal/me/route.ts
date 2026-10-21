import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, trainings, questionnaireSubmissions, photos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { getMemberStage, labelOfTrainingType } from "@/lib/member-stage";

/**
 * 会员本人档案 · 唯一真实数据源
 *
 * 原则：任何一项没有真实数据就返回 null / 0，绝不用固定值兜底。
 * 之前的 totalHours ?? 42 / joinedAt || "2025-10-20" / mentorName || "导师 小桥"
 * 会让 87 位会员看到同一份假档案，已全部移除。
 */
export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

  // 真实训练记录（用于总节数、分类型节数、阶段进度）
  const trainingRows = await db
    .select({ type: trainings.type, trainingDate: trainings.trainingDate })
    .from(trainings)
    .where(eq(trainings.memberId, memberId));

  const totalHours = trainingRows.length;

  const byTypeMap = new Map<string, number>();
  for (const row of trainingRows) {
    const key = String(row.type || "training");
    byTypeMap.set(key, (byTypeMap.get(key) || 0) + 1);
  }
  const trainingsByType = Array.from(byTypeMap.entries())
    .map(([key, count]) => ({ key, label: labelOfTrainingType(key), count }))
    .sort((a, b) => b.count - a.count);

  // 最近一次训练日期（会员端首页显示「上次练习」用得上）
  const lastTrainingDate =
    trainingRows
      .map((r) => r.trainingDate)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

  const [questionnaireRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId));

  const [photoRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(photos)
    .where(eq(photos.memberId, memberId));

  const questionnaireCount = Number(questionnaireRow?.n || 0);
  const photoCount = Number(photoRow?.n || 0);

  // 伴行天数：只有真实入会日期才计算，否则 null（前端显示「待录入」）
  let joinDays: number | null = null;
  if (member.joinedAt) {
    const t = new Date(String(member.joinedAt).replace(/[-/.]/g, "/")).getTime();
    if (!Number.isNaN(t)) {
      joinDays = Math.max(1, Math.floor((Date.now() - t) / 86400000));
    }
  }

  const stage = getMemberStage(totalHours);

  return NextResponse.json({
    memberId: member.id,
    memberName: member.name,
    // 以下字段缺省一律为 null，由前端显示「待录入」，不再编造
    memberCode: member.memberCode || null,
    joinedAt: member.joinedAt || null,
    avatarUrl: member.avatarUrl || null,
    portalEnabled: member.portalEnabled,
    mentorName: member.mentorName || null,
    status: member.status || null,

    joinDays,
    totalHours,
    trainingsByType,
    lastTrainingDate,
    questionnaireCount,
    photoCount,

    stage,
  });
}
