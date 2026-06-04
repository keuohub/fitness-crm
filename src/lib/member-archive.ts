/**
 * 会员坚持档案 — 全部从现有数据库推导，零新增字段。
 */

import { db } from "@/db";
import { trainings, photos, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface MemberArchive {
  totalTrainings: number;
  totalTrainingDays: number;
  totalPhotos: number;
  totalQuestionnaires: number;
  totalAIFeedbacks: number;
  totalRecords: number;
  consecutiveMonths: number;
}

interface TrainingsMonthRow {
  month: string;
}

export async function getMemberArchive(memberId: number): Promise<MemberArchive> {
  // 累计训练次数
  const trainingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(trainings)
    .where(eq(trainings.memberId, memberId));
  const totalTrainings = trainingCount[0]?.count ?? 0;

  // 累计训练天数（去重日期）
  const trainingDays = await db
    .select({ count: sql<number>`count(distinct ${trainings.trainingDate})` })
    .from(trainings)
    .where(eq(trainings.memberId, memberId));
  const totalTrainingDays = trainingDays[0]?.count ?? 0;

  // 累计照片
  const photoCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.memberId, memberId));
  const totalPhotos = photoCount[0]?.count ?? 0;

  // 累计问卷
  const qCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId));
  const totalQuestionnaires = qCount[0]?.count ?? 0;

  // 累计 AI 反馈
  const aiCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiFeedbackReports)
    .where(eq(aiFeedbackReports.memberId, memberId));
  const totalAIFeedbacks = aiCount[0]?.count ?? 0;

  const totalRecords = totalTrainings + totalPhotos + totalQuestionnaires + totalAIFeedbacks;

  // 连续训练月份
  const monthRows = await db
    .select({ month: sql<string>`strftime('%Y-%m', ${trainings.trainingDate})` })
    .from(trainings)
    .where(eq(trainings.memberId, memberId))
    .groupBy(sql`strftime('%Y-%m', ${trainings.trainingDate})`)
    .orderBy(sql`strftime('%Y-%m', ${trainings.trainingDate})`);

  let consecutiveMonths = 0;
  const months = monthRows.map((r: TrainingsMonthRow) => r.month);
  if (months.length > 0) {
    let max = 1;
    let curr = 1;
    for (let i = 1; i < months.length; i++) {
      const prev = new Date(months[i - 1] + "-01");
      const cur = new Date(months[i] + "-01");
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + (cur.getMonth() - prev.getMonth());
      curr = diffMonths === 1 ? curr + 1 : 1;
      if (curr > max) max = curr;
    }
    consecutiveMonths = max;
  }

  return {
    totalTrainings,
    totalTrainingDays,
    totalPhotos,
    totalQuestionnaires,
    totalAIFeedbacks,
    totalRecords,
    consecutiveMonths,
  };
}
