// 会员成长阶段 · 全站唯一定义源
// 之前 me.js / transformation.js / growth.js 各写一套，还出现「身体掌控」与「掌控新生」不一致。
// 现在由服务端统一计算，前端只负责显示。

export type MemberStage = {
  key: "awaken" | "control" | "command" | "grace";
  name: string;
  levelTitle: string;
  target: number;
  progress: number;
  remaining: number;
  whisperTitle: string;
  whisperBody: string;
};

const STAGES = [
  {
    key: "grace" as const,
    min: 51,
    name: "终生优雅",
    levelTitle: "身体掌权者 · 终生优雅",
    target: 100,
    whisperTitle: "自律已成习惯，岁月对你只剩温柔偏爱",
    whisperBody: "你不再需要刻意坚持，因为挺拔与从容早已成为你的呼吸本能。这是你赠予自己最好的礼物。",
  },
  {
    key: "command" as const,
    min: 21,
    name: "身体掌权",
    levelTitle: "身体掌权者 · 深度蜕变",
    target: 51,
    whisperTitle: "在自律的时光里，你亲自重塑自己的线条",
    whisperBody: "二十多次的坚持与汗水，雕刻出的不只是紧致挺拔的体态，更是你在生活里从容不迫的底气。",
  },
  {
    key: "control" as const,
    min: 6,
    name: "身体掌控",
    levelTitle: "身体掌控者 · 进阶自律",
    target: 21,
    whisperTitle: "肌肉有了记忆，身姿自然挺拔松弛",
    whisperBody: "不再需要刻意挺胸收腹，核心与背部力量已成为你的内在支撑。曾经困扰你的肩颈紧绷，正悄悄变成从容与舒展。",
  },
  {
    key: "awaken" as const,
    min: 0,
    name: "觉知启程",
    levelTitle: "身体掌权者 · 始于觉知",
    target: 6,
    whisperTitle: "把身体的掌控权，重新交还给自己",
    whisperBody: "生活总在向你索取配合与妥协，而在这里，每一次呼吸与发力，都是对自我最坚定的偏爱。",
  },
];

export function getMemberStage(trainCount: number): MemberStage {
  const n = Number.isFinite(trainCount) && trainCount > 0 ? Math.floor(trainCount) : 0;
  const s = STAGES.find((x) => n >= x.min) || STAGES[STAGES.length - 1];
  const progress = s.target > 0 ? Math.min(100, Math.round((n / s.target) * 100)) : 0;
  return {
    key: s.key,
    name: s.name,
    levelTitle: s.levelTitle,
    target: s.target,
    progress,
    remaining: Math.max(0, s.target - n),
    whisperTitle: s.whisperTitle,
    whisperBody: s.whisperBody,
  };
}

// 训练类型 → 会员端展示名（与库里的 type 值对应，不虚构不存在的分类）
const TYPE_LABEL: Record<string, string> = {
  private: "一对一私教",
  group: "团体课",
  assessment: "体态评估",
  pilates: "精选普拉提",
  equipment: "高定大器械",
  fat_burn: "超模减脂班",
};

export function labelOfTrainingType(type: string): string {
  const t = String(type || "").trim();
  return TYPE_LABEL[t] || t || "训练";
}
