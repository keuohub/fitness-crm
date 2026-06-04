// 从数据库获取案例需要的数据

import { db } from "@/db";
import { trainings, aiFeedbackReports, photos, questionnaireSubmissions } from "@/db/schema";
import { eq, count, max, sql } from "drizzle-orm";
import { getPlatformStats } from "@/lib/analytics/platform-stats";

export interface CaseData {
  totalTrainings: number;
  totalPhotos: number;
  totalQuestionnaires: number;
  lastTrainingDate: string | null;
  latestAiComment: string | null;
  daysSinceJoin: number;
}

export async function getCaseData(memberId: number): Promise<CaseData> {
  const [trainingCount, photoCount, qCount, lastTraining, latestFeedback] = await Promise.all([
    db.select({ v: count() }).from(trainings).where(eq(trainings.memberId, memberId)),
    db.select({ v: count() }).from(photos).where(eq(photos.memberId, memberId)),
    db.select({ v: count() }).from(questionnaireSubmissions).where(eq(questionnaireSubmissions.memberId, memberId)),
    db
      .select({ date: max(trainings.trainingDate) })
      .from(trainings)
      .where(eq(trainings.memberId, memberId)),
    db
      .select({ content: aiFeedbackReports.content, generatedAt: aiFeedbackReports.generatedAt })
      .from(aiFeedbackReports)
      .where(eq(aiFeedbackReports.memberId, memberId))
      .orderBy(aiFeedbackReports.generatedAt)
      .limit(1),
  ]);

  // Get joinedAt for the member
  const memberRow = await db
    .select({ joinedAt: sql<string>`joined_at` })
    .from(sql`members`)
    .where(eq(sql`id`, memberId));

  const joinedAt = memberRow[0]?.joinedAt ?? null;
  const daysSinceJoin = joinedAt
    ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Extract a short AI comment from content
  let latestAiComment: string | null = null;
  if (latestFeedback.length > 0 && latestFeedback[0].content) {
    const raw = latestFeedback[0].content;
    // Take first ~120 chars as preview
    latestAiComment = raw.length > 120 ? raw.slice(0, 120) + "..." : raw;
  }

  return {
    totalTrainings: trainingCount[0]?.v ?? 0,
    totalPhotos: photoCount[0]?.v ?? 0,
    totalQuestionnaires: qCount[0]?.v ?? 0,
    lastTrainingDate: lastTraining[0]?.date ?? null,
    latestAiComment,
    daysSinceJoin,
  };
}
