// Growth Stage Engine — determines member's growth phase

export interface GrowthStage {
  id: string;
  title: string;
  description: string;
  daysRequired: number;
}

const STAGES: GrowthStage[] = [
  {
    id: "embark",
    title: "启程阶段",
    description: "刚刚加入徕舞，正在建立训练节奏。身体需要时间适应，每一次出现都是胜利。",
    daysRequired: 0,
  },
  {
    id: "habit",
    title: "习惯建立",
    description: "训练开始融入生活。连续出现是身体给的最强信号，改变正在悄然发生。",
    daysRequired: 30,
  },
  {
    id: "steady",
    title: "稳定成长",
    description: "训练不再是任务，而是对自己的承诺。身体的变化开始被看见，坚持正在产生复利。",
    daysRequired: 90,
  },
  {
    id: "deep",
    title: "深度蜕变",
    description: "半年以上的坚持，身体已经从内到外被重塑。你不是在训练，你是在成为更好的自己。",
    daysRequired: 180,
  },
  {
    id: "longterm",
    title: "长期主义",
    description: "一年过去，坚持已经变成了你是谁的一部分。这不是终点，这是新的起点。",
    daysRequired: 365,
  },
];

export function getGrowthStage(daysSinceJoin: number): GrowthStage {
  let stage = STAGES[0];
  for (const s of STAGES) {
    if (daysSinceJoin >= s.daysRequired) {
      stage = s;
    }
  }
  return stage;
}

export function getNextStage(daysSinceJoin: number): GrowthStage | null {
  for (const s of STAGES) {
    if (daysSinceJoin < s.daysRequired) {
      return s;
    }
  }
  return null;
}
