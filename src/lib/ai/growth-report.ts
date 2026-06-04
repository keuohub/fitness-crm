// AI Growth Report Generator — rule-based engine (no GPT)

import type { GrowthEvent } from "@/types/growth";
import { getGrowthStats } from "@/lib/member-growth";
import { computeGrowthScore } from "./growth-score";
import { getGrowthStage, getNextStage } from "./growth-stage";
import { computeScoreHistory, type ScoreHistoryPoint } from "./score-history";
import { analyzeTrend, type TrendResult } from "./trend-analysis";
import { computeMomentum, computeConsistency, type MomentumResult, type ConsistencyResult } from "./momentum-consistency";

export interface GrowthReport {
  memberId: number;
  memberName: string;
  generatedAt: string;
  daysSinceJoin: number;
  stage: {
    id: string;
    title: string;
    description: string;
  };
  nextStage: { title: string; daysToReach: number } | null;
  score: {
    value: number;
    label: string;
    breakdown: {
      frequency: number;
      streak: number;
      completeness: number;
      photos: number;
      feedback: number;
    };
  };
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];

  // ─── SPRINT 20: Trend Intelligence ───
  scoreHistory: ScoreHistoryPoint[];
  trend: TrendResult;
  momentum: MomentumResult;
  consistency: ConsistencyResult;
}

export function generateGrowthReport(params: {
  memberId: number;
  memberName: string;
  joinedAt?: string;
  events: GrowthEvent[];
}): GrowthReport {
  const { memberId, memberName, joinedAt, events } = params;
  const stats = getGrowthStats(events);

  const daysSinceJoin = joinedAt
    ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const stage = getGrowthStage(daysSinceJoin);
  const next = getNextStage(daysSinceJoin);

  const { score, label, breakdown } = computeGrowthScore({
    trainingCount: stats.trainingCount,
    consecutiveTrainingDays: stats.consecutiveTrainingDays,
    questionnaireCount: stats.questionnaireCount,
    photoCount: stats.photoCount,
    feedbackCount: stats.feedbackCount,
    daysSinceJoin,
  });

  const summary = generateSummary({
    memberName, daysSinceJoin, stageTitle: stage.title,
    trainingCount: stats.trainingCount, streak: stats.consecutiveTrainingDays,
    score, label,
  });

  const strengths = analyzeStrengths({ trainingCount: stats.trainingCount, streak: stats.consecutiveTrainingDays, photoCount: stats.photoCount, questionnaireCount: stats.questionnaireCount, daysSinceJoin });
  const risks = analyzeRisks({ trainingCount: stats.trainingCount, streak: stats.consecutiveTrainingDays, photoCount: stats.photoCount, questionnaireCount: stats.questionnaireCount, feedbackCount: stats.feedbackCount, daysSinceJoin });
  const recommendations = generateRecommendations({ stageId: stage.id, trainingCount: stats.trainingCount, streak: stats.consecutiveTrainingDays, photoCount: stats.photoCount, questionnaireCount: stats.questionnaireCount, daysSinceJoin });

  // SPRINT 20: Trend intelligence
  const scoreHistory = computeScoreHistory(events, daysSinceJoin);
  const trend = analyzeTrend(events);
  const momentum = computeMomentum(events);
  const consistency = computeConsistency(events);

  return {
    memberId, memberName,
    generatedAt: new Date().toISOString(),
    daysSinceJoin,
    stage: { id: stage.id, title: stage.title, description: stage.description },
    nextStage: next ? { title: next.title, daysToReach: next.daysRequired - daysSinceJoin } : null,
    score: { value: score, label, breakdown },
    summary, strengths, risks, recommendations,
    scoreHistory, trend, momentum, consistency,
  };
}

function generateSummary(p: { memberName: string; daysSinceJoin: number; stageTitle: string; trainingCount: number; streak: number; score: number; label: string }): string {
  const parts = [
    `${p.memberName}加入徕舞 ${p.daysSinceJoin} 天，处于${p.stageTitle}。`,
    `累计完成 ${p.trainingCount} 次训练，连续训练最长 ${p.streak} 天。`,
    `成长评分为 ${p.score} 分，属于"${p.label}"水平。`,
  ];
  if (p.score >= 70) parts.push("各项数据均衡优秀，继续保持当前的节奏。");
  else if (p.score >= 40) parts.push("已有良好开端，坚持记录和训练将让成长更加清晰可见。");
  else parts.push("成长刚刚开始，每一次记录都是在建立属于自己的成长档案。");
  return parts.join("");
}

function analyzeStrengths(p: { trainingCount: number; streak: number; photoCount: number; questionnaireCount: number; daysSinceJoin: number }): string[] {
  const strengths: string[] = [];
  const weeks = Math.max(1, p.daysSinceJoin / 7);
  const perWeek = p.trainingCount / weeks;
  if (perWeek >= 3) strengths.push("训练频率较高，保持每周3次以上的训练节奏");
  else if (perWeek >= 1.5) strengths.push("训练频率稳定，每周坚持1-2次训练");
  if (p.streak >= 14) strengths.push("连续训练能力强，最长达" + p.streak + "天不间断");
  else if (p.streak >= 7) strengths.push("有连续训练的能力，已达成一周连续打卡");
  if (p.photoCount >= 5) strengths.push("体态记录完整，持续通过照片见证身体变化");
  else if (p.photoCount >= 1) strengths.push("已开始记录体态照片，这是可视化成长的第一步");
  if (p.questionnaireCount >= 2) strengths.push("健康档案完善，定期更新问卷让成长路径更清晰");
  else if (p.questionnaireCount >= 1) strengths.push("已完成健康问卷，建立了个人成长基线");
  if (strengths.length === 0) strengths.push(p.trainingCount >= 1 ? "已经迈出第一步，每一次训练都是成长的种子" : "加入徕舞就是最好的开始");
  return strengths.slice(0, 3);
}

function analyzeRisks(p: { trainingCount: number; streak: number; photoCount: number; questionnaireCount: number; feedbackCount: number; daysSinceJoin: number }): string[] {
  const risks: string[] = [];
  const weeks = Math.max(1, p.daysSinceJoin / 7);
  const perWeek = p.trainingCount / weeks;
  if (p.daysSinceJoin > 30 && perWeek < 1) risks.push("训练频率偏低，建议每周至少保持1次训练以维持成长节奏");
  if (p.daysSinceJoin > 60 && perWeek < 2) risks.push("建议增加训练频率至每周2次，让身体持续收到训练刺激");
  if (p.photoCount === 0 && p.daysSinceJoin > 30) risks.push("尚未上传体态照片，建议尽快完成首次拍照以建立视觉基线");
  if (p.questionnaireCount === 0) risks.push("尚未完成健康问卷，缺少个人起点数据将影响成长分析精度");
  if (p.feedbackCount === 0 && p.daysSinceJoin > 14) risks.push("暂无 AI 反馈记录，完成训练和问卷后系统将自动生成成长报告");
  return risks;
}

function generateRecommendations(p: { stageId: string; trainingCount: number; streak: number; photoCount: number; questionnaireCount: number; daysSinceJoin: number }): string[] {
  const recs: string[] = [];
  if (p.stageId === "embark") recs.push("建立稳定的训练节奏，每周坚持1-2次训练是当前最重要的目标");
  else if (p.stageId === "habit") recs.push("尝试挑战连续7天训练打卡，让习惯更加牢固");
  else if (p.stageId === "steady") recs.push("可以逐步增加训练强度，探索不同的训练类型");
  else if (p.stageId === "deep") recs.push("你已经有了坚实的训练基础，尝试挑战新的训练目标");
  else if (p.stageId === "longterm") recs.push("作为长期主义者，你的训练经验可以成为其他会员的榜样");
  if (p.photoCount === 0) recs.push("建议上传第一张体态照片，这是视觉化的成长起点");
  if (p.questionnaireCount === 0) recs.push("完成一份健康问卷，让系统更好地理解你的身体状况");
  return recs.slice(0, 4);
}
