import { NextRequest, NextResponse } from "next/server";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { getGrowthStage } from "@/lib/ai/growth-stage";
import { generateGrowthReport } from "@/lib/ai/growth-report";
import { db } from "@/db";
import { members, trainings, photos, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import type { GrowthEvent } from "@/types/growth";

const trainingTypeLabel = (t: string) =>
  ({ private: "私教", group: "团课", assessment: "评估" }[t] || t);

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

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

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  try {
    const [member] = await db.select().from(members).where(eq(members.id, memberId));
    if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

    // Fetch raw data
    const [rawTrainings, rawPhotos, rawQuestionnaires, rawFeedback] = await Promise.all([
      db.select().from(trainings).where(eq(trainings.memberId, memberId)).orderBy(desc(trainings.trainingDate)),
      db.select().from(photos).where(eq(photos.memberId, memberId)).orderBy(desc(photos.takenAt)),
      db.select().from(questionnaireSubmissions).where(eq(questionnaireSubmissions.memberId, memberId)).orderBy(desc(questionnaireSubmissions.submittedAt)),
      db.select().from(aiFeedbackReports).where(eq(aiFeedbackReports.memberId, memberId)).orderBy(desc(aiFeedbackReports.createdAt)),
    ]);

    // Convert to GrowthEvent[]
    const events: GrowthEvent[] = [];

    for (const t of rawTrainings) {
      events.push({
        id: `training_${t.id}`,
        type: "training",
        date: t.trainingDate,
        title: `${trainingTypeLabel(t.type)}训练`,
        description: t.focusArea || t.notes || undefined,
        source: "/api/trainings",
        payload: t,
      });
    }

    for (const p of rawPhotos) {
      events.push({
        id: `photo_${p.id}`,
        type: "photo",
        date: p.takenAt || p.createdAt || "",
        title: p.photoType === "body" ? "体型照片" : p.photoType === "posture" ? "体态照片" : "进度照片",
        source: "/api/photos",
        payload: p,
      });
    }

    for (const q of rawQuestionnaires) {
      events.push({
        id: `questionnaire_${q.id}`,
        type: "questionnaire",
        date: q.submittedAt,
        title: "健康问卷更新",
        source: "/api/questionnaire",
        payload: q,
      });
    }

    for (const f of rawFeedback) {
      const label = f.reportType === "weekly" ? "周报" : f.reportType === "monthly" ? "月报" : f.reportType === "yearly" ? "年度回顾" : f.reportType === "daily" ? "每日关怀" : "阶段回顾";
      events.push({
        id: `feedback_${f.id}`,
        type: "ai_report",
        date: f.generatedAt || f.createdAt || "",
        title: label,
        source: "/api/ai/period-report",
        payload: f,
      });
    }

    const report = generateGrowthReport({
      memberId,
      memberName: member.name,
      joinedAt: member.joinedAt || undefined,
      events,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("Growth report error:", err);
    return NextResponse.json({ error: "生成报告失败" }, { status: 500 });
  }
}
