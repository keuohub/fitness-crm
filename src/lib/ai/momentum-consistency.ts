// Momentum & Consistency Scores

import type { GrowthEvent } from "@/types/growth";

export interface MomentumResult {
  score: number; // 0-100
  label: string;
  recentTrainingDays: number; // last 30 days
  recentEvents: number;
}

export interface ConsistencyResult {
  score: number; // 0-100
  label: string;
  trainingStreak: number;
  recordStreak: number;
  feedbackStreak: number;
}

const DAY30 = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();

/**
 * Momentum = activity level in last 30 days vs expected baseline.
 * High momentum = member is recently very active.
 */
export function computeMomentum(events: GrowthEvent[]): MomentumResult {
  const recent = events.filter((e) => e.date >= DAY30);
  const recentTrainings = recent.filter((e) => e.type === "training");
  const trainingDays = new Set(recentTrainings.map((e) => e.date)).size;

  // Ideal: 8-12 training days in 30 days (~2-3/week)
  const score = Math.min(100, Math.round((trainingDays / 12) * 100));

  let label = "势能不足";
  if (score >= 80) label = "势能强劲";
  else if (score >= 55) label = "稳步前进";
  else if (score >= 30) label = "开始恢复";

  return {
    score,
    label,
    recentTrainingDays: trainingDays,
    recentEvents: recent.length,
  };
}

/**
 * Consistency = long-term streak stability across training, recording, and feedback.
 */
export function computeConsistency(events: GrowthEvent[]): ConsistencyResult {
  const trainings = events.filter((e) => e.type === "training");
  const photos = events.filter((e) => e.type === "photo");
  const feedbacks = events.filter((e) => e.type === "ai_report");

  const trainingStreak = computeStreakFromDates(trainings.map((e) => e.date));
  const photoStreak = computeStreakFromDates(photos.map((e) => e.date));
  const feedbackStreak = computeStreakFromDates(feedbacks.map((e) => e.date));

  // Weighted: training 50%, photo 25%, feedback 25%
  const score = Math.min(100, Math.round(
    (Math.min(1, trainingStreak / 30) * 50) +
    (Math.min(1, photoStreak / 14) * 25) +
    (Math.min(1, feedbackStreak / 14) * 25)
  ));

  let label = "待建立";
  if (score >= 75) label = "高度自律";
  else if (score >= 50) label = "习惯养成";
  else if (score >= 25) label = "开始坚持";

  return {
    score,
    label,
    trainingStreak,
    recordStreak: photoStreak,
    feedbackStreak,
  };
}

function computeStreakFromDates(dates: string[]): number {
  const unique = [...new Set(dates)].sort().reverse();
  if (unique.length === 0) return 0;
  let streak = 1;
  const today = new Date();
  for (let i = 0; i < unique.length - 1; i++) {
    const curr = new Date(unique[i]);
    const next = new Date(unique[i + 1]);
    const diff = (curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 2) streak++;
    else break;
  }
  return streak;
}
