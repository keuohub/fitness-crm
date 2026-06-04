// 成长服务层 — 将 GrowthTimeline 数据聚合逻辑抽取为可复用函数

interface GrowthStats {
  trainingCount: number;
  questionnaireCount: number;
  photoCount: number;
  feedbackCount: number;
  consecutiveTrainingDays: number;
}

/** 基于事件列表计算统计 */
export function getGrowthStats(events: { type: string; date: string }[]): GrowthStats {
  const trainings = events.filter((e) => e.type === "training");
  const dates = [...new Set(trainings.map((e) => e.date))].sort();

  let maxStreak = 0;
  let current = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > maxStreak) maxStreak = current;
  }

  return {
    trainingCount: trainings.length,
    questionnaireCount: events.filter((e) => e.type === "questionnaire").length,
    photoCount: events.filter((e) => e.type === "photo").length,
    feedbackCount: events.filter((e) => e.type === "ai_report").length,
    consecutiveTrainingDays: maxStreak,
  };
}

/** 获取最近 N 条事件 */
export function getRecentEvents<T extends { date: string }>(events: T[], n: number): T[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}
