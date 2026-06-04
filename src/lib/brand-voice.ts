/**
 * 徕舞成长系统 · 品牌语气库
 *
 * 所有官网文案的来源。
 * 后续组件中硬编码的文案应逐步迁移到此文件引用。
 */

export const MISSION = {
  hero: [
    "让身体记住时间",
    "让成长自然发生",
  ],
  subtitle:
    "不是一次训练改变了身体，而是一次次记录，让成长慢慢发生。",
} as const;

export const MANIFESTO = {
  about:
    "我们记录训练，不是为了证明努力。而是希望每一次坚持，都能被时间看见。",
  founder: {
    years: "从业16年，开馆14年。",
    impact: "累计陪伴超过20,000名女性改善体态、建立运动习惯。",
    belief:
      "她始终相信，身体的改变从来不是一场短跑。真正的成长，来自每一次训练后的坚持，每一次想放弃时的继续，以及日复一日的积累。",
    closing:
      "徕舞希望记录这些过程，让成长被记录，让坚持被看见。",
  },
} as const;

export const PHILOSOPHY = {
  space: {
    title: "在安静中专注",
    description: "不追求热闹，只追求专注。这里是训练的空间，也是与自己相处的空间。",
    pillars: [
      {
        title: "训练环境",
        desc: "自然光与安静氛围。一个专注女性身体成长的空间，不嘈杂、不拥挤，每一次训练都是与自己的对话。",
      },
      {
        title: "器械系统",
        desc: "Reformer 核心床等专业普拉提器械。精准的训练工具，帮助身体在正确的轨道上建立力量与柔韧。",
      },
      {
        title: "长期陪伴",
        desc: "记录成长而非售卖课程。从第一次训练到每一次突破，我们关注的是时间的积累，不是单次的效果。",
      },
    ],
  },
} as const;

export const SHORT_COPY = {
  sectionLabels: {
    growth: "成长档案",
    stories: "时间会留下答案",
    activity: "今天的训练记录",
    insight: "成长记录",
    ecosystem: "一个完整的成长生态",
    evidence: "成长应该被量化",
    space: "训练空间",
    howItWorks: "使用流程",
    partner: "谁适合使用徕舞",
  },
  tags: {
    record: "成长记录",
    home: "徕舞成长系统 · 徕舞成长系统",
    footer: "徕舞成长系统 · 徕舞成长系统",
  },
} as const;

/**
 * 品牌语气红线 — 禁止使用的词汇
 */
export const BANNED_WORDS = [
  "蜕变",
  "逆袭",
  "改变人生",
  "惊艳",
  "打卡",
  "塑形神器",
  "完美身材",
] as const;

/**
 * 品牌核心信息 —— 唯一真相源。
 * 所有 Hero 文案、品牌宣言、Slogan 均引用此对象。
 * 禁止在组件中硬编码 Hero 文案。
 */
export const BRAND_CORE_MESSAGE = {
  hero: "成长值得被记录，坚持值得被看见",
  subtitle: "不是一次训练改变了身体，而是一次次记录，让成长慢慢发生。",
} as const;

/**
 * 品牌关键词策略
 *
 * PREFERRED（鼓励使用）：成长、记录、坚持、时间、练习、出现、积累
 * BANNED（已禁用）：蜕变、逆袭、重塑、赋能、系统化、领先
 */
export const BRAND_KEYWORDS = {
  preferred: ["成长", "记录", "坚持", "时间", "练习", "出现", "积累"] as const,
  banned: ["蜕变", "逆袭", "重塑", "赋能", "系统化", "领先"] as const,
} as const;
