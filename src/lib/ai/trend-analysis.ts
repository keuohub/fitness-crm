// Trend Analysis — determine if score is rising, flat, or falling

import type { GrowthEvent } from "@/types/growth";

export type Trend = "rising" | "flat" | "falling";

export interface TrendResult {
  trend: Trend;
  changePercent: number; // positive = improvement, negative = decline
  currentScore: number;
  previousScore: number;
  label: string;
}

/**
 * Compare current 30-day activity against previous 30-day period.
 */
export function analyzeTrend(events: GrowthEvent[]): TrendResult {
  const now = new Date();
  const days30ago = dateStr(daysBefore(now, 30));
  const days60ago = dateStr(daysBefore(now, 60));

  const recent = events.filter((e) => e.date >= days30ago);
  const previous = events.filter((e) => e.date >= days60ago && e.date < days30ago);

  const recentTrainings = recent.filter((e) => e.type === "training").length;
  const previousTrainings = previous.filter((e) => e.type === "training").length;

  const recentActivity = recent.length;
  const previousActivity = previous.length;

  // Combine training count + total event count for trend
  const currentScore = recentTrainings * 2 + recentActivity;
  const prevScore = previousTrainings * 2 + previousActivity;

  let trend: Trend = "flat";
  let changePercent = 0;
  let label = "保持稳定";

  if (prevScore > 0 && currentScore > 0) {
    changePercent = Math.round(((currentScore - prevScore) / prevScore) * 100);
  } else if (currentScore > 0 && prevScore === 0) {
    changePercent = 100;
  } else if (currentScore === 0 && prevScore > 0) {
    changePercent = -100;
  }

  if (changePercent >= 15) {
    trend = "rising";
    label = "明显上升";
  } else if (changePercent >= 5) {
    trend = "rising";
    label = "小幅上升";
  } else if (changePercent <= -15) {
    trend = "falling";
    label = "明显下降";
  } else if (changePercent <= -5) {
    trend = "falling";
    label = "小幅下降";
  }

  return {
    trend,
    changePercent,
    currentScore,
    previousScore: prevScore,
    label,
  };
}

function daysBefore(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
