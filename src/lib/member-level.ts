export interface MemberLevel {
  level: number;
  title: string;
  progress: number; // 0-1，当前等级内的进度
}

const LEVELS = [
  { maxDays: 29, level: 1, title: "启程" },
  { maxDays: 89, level: 2, title: "习惯建立" },
  { maxDays: 179, level: 3, title: "稳定成长" },
  { maxDays: 364, level: 4, title: "深度蜕变" },
  { maxDays: Infinity, level: 5, title: "长期主义者" },
];

export function getMemberLevel(days: number): MemberLevel {
  for (const tier of LEVELS) {
    if (days <= tier.maxDays) {
      const prevMax = LEVELS.indexOf(tier) === 0 ? 0 : LEVELS[LEVELS.indexOf(tier) - 1].maxDays;
      const range = tier.maxDays - prevMax;
      const progress = range <= 0 ? 1 : Math.min(1, (days - prevMax) / range);
      return { level: tier.level, title: tier.title, progress };
    }
  }
  return { level: 5, title: "长期主义者", progress: 1 };
}

export function daysSince(joinedAt: string | undefined): number {
  if (!joinedAt) return 0;
  const d = new Date(joinedAt);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
