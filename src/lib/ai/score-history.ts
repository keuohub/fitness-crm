// Score History Engine — compute growth score at different time points

import type { GrowthEvent } from "@/types/growth";
import { computeGrowthScore, type GrowthScoreOutput } from "./growth-score";

export interface ScoreHistoryPoint {
  daysAgo: number;
  label: string;
  score: GrowthScoreOutput;
}

/**
 * Compute what the growth score would have been at N days ago and at 30/N days ago.
 * Filters events to only those that occurred before the cutoff date.
 */
export function computeScoreHistory(
  events: GrowthEvent[],
  daysSinceJoin: number
): ScoreHistoryPoint[] {
  const cutoff7 = daysAgoDate(7);
  const cutoff30 = daysAgoDate(30);
  const cutoff90 = daysAgoDate(90);

  return [
    {
      daysAgo: 7,
      label: "7天前",
      score: scoreAtDate(events, cutoff7, daysSinceJoin - 7),
    },
    {
      daysAgo: 30,
      label: "30天前",
      score: scoreAtDate(events, cutoff30, daysSinceJoin - 30),
    },
    {
      daysAgo: 90,
      label: "90天前",
      score: scoreAtDate(events, cutoff90, daysSinceJoin - 90),
    },
  ];
}

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function scoreAtDate(
  events: GrowthEvent[],
  cutoffDate: string,
  adjustedDays: number
): GrowthScoreOutput {
  const filtered = events.filter((e) => e.date <= cutoffDate);

  const trainings = filtered.filter((e) => e.type === "training");
  const dates = [...new Set(trainings.map((e) => e.date))].sort();
  let maxStreak = 0;
  let current = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) current = 1;
    else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > maxStreak) maxStreak = current;
  }

  return computeGrowthScore({
    trainingCount: trainings.length,
    consecutiveTrainingDays: maxStreak,
    questionnaireCount: filtered.filter((e) => e.type === "questionnaire").length,
    photoCount: filtered.filter((e) => e.type === "photo").length,
    feedbackCount: filtered.filter((e) => e.type === "ai_report").length,
    daysSinceJoin: Math.max(1, adjustedDays),
  });
}
