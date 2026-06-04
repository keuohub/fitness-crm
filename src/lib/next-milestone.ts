// 下一步成长目标 — 纯前端计算层，不依赖数据库查询

export interface NextMilestone {
  type: "training" | "time" | "photo";
  title: string;
  subtitle: string;
  progress: number; // 0-1
  remaining: number;
}

const TRAINING_TARGETS = [1, 10, 25, 50, 100, 200];
const TIME_TARGETS = [30, 90, 180, 365];

/**
 * 从现有数据计算当前最重要的一个成长目标
 */
export function computeNextMilestone(params: {
  trainingCount: number;
  daysSinceJoin: number;
  daysSinceLastPhoto: number;
}): NextMilestone | null {
  const { trainingCount, daysSinceJoin, daysSinceLastPhoto } = params;

  // 优先级1：训练次数目标
  const nextTraining = TRAINING_TARGETS.find((t) => trainingCount < t);
  if (nextTraining) {
    const remaining = nextTraining - trainingCount;
    const prev = TRAINING_TARGETS[TRAINING_TARGETS.indexOf(nextTraining) - 1] || 0;
    return {
      type: "training",
      title: `距离 ${nextTraining} 次训练`,
      subtitle: `已完成 ${trainingCount} 次，还差 ${remaining} 次`,
      progress: (trainingCount - prev) / (nextTraining - prev),
      remaining,
    };
  }

  // 优先级2：坚持时间目标
  const nextTime = TIME_TARGETS.find((t) => daysSinceJoin < t);
  if (nextTime) {
    const remaining = nextTime - daysSinceJoin;
    const prev = TIME_TARGETS[TIME_TARGETS.indexOf(nextTime) - 1] || 0;
    const label =
      nextTime === 365 ? "一周年" :
      nextTime === 180 ? "半年" :
      nextTime === 90 ? "三个月" :
      "一个月";
    return {
      type: "time",
      title: `距离 ${label}`,
      subtitle: `已陪你 ${daysSinceJoin} 天，还差 ${remaining} 天`,
      progress: (daysSinceJoin - prev) / (nextTime - prev),
      remaining,
    };
  }

  // 优先级3：体态记录提醒（超过30天未记录）
  if (daysSinceLastPhoto > 30) {
    return {
      type: "photo",
      title: "记录一次新的变化",
      subtitle: `上一次体态记录是 ${daysSinceLastPhoto} 天前`,
      progress: Math.min(1, daysSinceLastPhoto / 90),
      remaining: 0,
    };
  }

  return null;
}
