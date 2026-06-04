// 成长语料库 · 徕舞
// 根据会员原话关键词匹配，生成个性化成长反馈
// 原则：不同会员看到不同内容，让每个会员感受到「我被看见」

export interface GrowthMessage {
  category: string;
  keywords: string[];
  reflections: string[];
  coachWords: string[];
}

export const GROWTH_MESSAGE_LIBRARY: GrowthMessage[] = [
  // ── 身体变化 ──
  {
    category: "身体变化",
    keywords: ["更灵活", "不酸", "轻松", "有力", "线条", "瘦了", "变轻", "体态", "站姿", "姿态", "肩颈", "背", "腰", "力量", "有力气", "更稳"],
    reflections: [
      "身体正在记住每一次训练。",
      "变化不是一夜之间发生的，但每一天都在发生。",
      "你的身体比你想象的更懂得回应。",
      "慢慢地，身体开始讲述一个不同的故事。",
    ],
    coachWords: [
      "身体的改变是坚持最诚实的回答。",
      "你感受到的每一分轻松，都是训练给你的回馈。",
      "变化没有捷径，但每一次出现都在靠近。",
    ],
  },
  // ── 情绪改善 ──
  {
    category: "情绪改善",
    keywords: ["开心", "快乐", "放松", "平静", "不焦虑", "心情好", "舒服", "释放", "解压", "治愈", "平和", "安稳", "睡得好", "睡得更", "睡眠"],
    reflections: [
      "运动是最好的情绪出口。",
      "当身体被好好对待，心也会跟着安静下来。",
      "训练不只改变身体，也在整理情绪。",
      "你把压力留在了垫子上，把平静带回了生活里。",
    ],
    coachWords: [
      "最好的训练不是最累的，是让你走出教室感到轻盈的。",
      "当你把情绪交给身体，身体会还你平静。",
    ],
  },
  // ── 自信成长 ──
  {
    category: "自信成长",
    keywords: ["自信", "敢", "突破", "以前不敢", "第一次", "做到了", "进步", "变好", "更好", "不一样", "改变", "惊喜", "没想到", "居然"],
    reflections: [
      "自信不是别人给你的，是一次次做到之后自己攒下来的。",
      "每一个'我做到了'的瞬间，都是在重新认识自己。",
      "成长就是从'我不行'到'我试试'，再到'我可以'。",
      "你比自己想象的更强大。",
    ],
    coachWords: [
      "当你开始相信自己能做到，训练就已经完成了一半。",
      "真正的不一样，不是别人觉得你变了，是你自己觉得自己变了。",
    ],
  },
  // ── 长期坚持 ──
  {
    category: "长期坚持",
    keywords: ["坚持", "习惯", "持续", "不放弃", "继续", "风雨无阻", "每星期", "每周", "每次", "不间断", "始终", "一直"],
    reflections: [
      "坚持不是一个动词，是一种选择。",
      "习惯的力量在于，它替你省去了每天重新决定的过程。",
      "你不需要每天充满动力，你只需要每天出现。",
      "当你回头看时才发现，那些看似普通的日子，串起来就是一条很长的路。",
    ],
    coachWords: [
      "长期主义不是口号，是像你一样一天一天走过来的。",
      "最好的坚持不是咬牙，是慢慢成为生活的一部分。",
    ],
  },
  // ── 感恩陪伴 ──
  {
    category: "感恩陪伴",
    keywords: ["谢谢", "感谢", "教练", "陪伴", "这里", "工作室", "徕舞", "像家", "第二个家", "温暖"],
    reflections: [
      "成长从来不是一个人的事。",
      "有人陪伴的坚持，比独自前行走得更远。",
      "这个空间承载的，不只有训练，还有每一次想放弃时被拉回来的瞬间。",
    ],
    coachWords: [
      "谢谢你信任我们，把身体和成长交给我们。",
      "被需要是一种幸福，谢谢你让我们的工作变得有意义。",
    ],
  },
  // ── 周年纪念 ──
  {
    category: "周年纪念",
    keywords: ["周年", "一年", "365", "一整年", "三年", "五年", "年"],
    reflections: [
      "一年前的你和现在的你，已经是两个人。",
      "三百多天的坚持，值得被郑重地记住。",
      "时间是最好的见证者，它从不说话，但从不撒谎。",
      "这一年，你不是在坚持训练，你是在重塑生活。",
    ],
    coachWords: [
      "能够陪伴你走过一整年，是我们的荣幸。",
      "当你回顾这一年，你会发现自己做了多么了不起的事。",
    ],
  },
];

// ── 匹配函数：根据会员原话关键词匹配最相关的语料 ──
export function matchGrowthMessages(memberWords: string[]): {
  category: string;
  reflection: string;
  coachWord: string;
} | null {
  if (!memberWords.length) return null;

  const scored = GROWTH_MESSAGE_LIBRARY.map((lib) => {
    const hits = lib.keywords.filter((kw) =>
      memberWords.some((w) => w.includes(kw))
    ).length;
    return { lib, hits };
  }).filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits);

  if (!scored.length) {
    // 默认返回"长期坚持"
    const fallback = GROWTH_MESSAGE_LIBRARY.find((l) => l.category === "长期坚持")!;
    return {
      category: fallback.category,
      reflection: fallback.reflections[0],
      coachWord: fallback.coachWords[0],
    };
  }

  const best = scored[0];
  return {
    category: best.lib.category,
    reflection: best.lib.reflections[Math.floor(Math.random() * best.lib.reflections.length)],
    coachWord: best.lib.coachWords[Math.floor(Math.random() * best.lib.coachWords.length)],
  };
}

// ── 根据纪念日天数生成专属文案 ──
export function getAnniversaryMessage(days: number): {
  title: string;
  subtitle: string;
  coachWord: string;
} {
  if (days >= 1825) return {
    title: "五年 · 传承",
    subtitle: "一千八百多天的陪伴。你早已不只是会员，你是徕舞的一部分。",
    coachWord: "能陪伴一个人五年，是一种很深很深的缘分。谢谢你的信任。",
  };
  if (days >= 1095) return {
    title: "三年 · 蜕变",
    subtitle: "三年，一千多天。坚持已经从选择变成了习惯，从习惯变成了你。",
    coachWord: "三年里你教会自己的，比任何人都多。我们只是见证了这一切。",
  };
  if (days >= 365) return {
    title: "一年 · 陪伴",
    subtitle: "三百多天，一个完整的轮回。你走过的每一步，都被记在这里。",
    coachWord: "一年了，你比一年前更了解自己的身体，也更了解自己的力量。",
  };
  if (days >= 180) return {
    title: "半年 · 成长",
    subtitle: "从陌生到熟悉，从尝试到确信。你已经是这里的一部分。",
    coachWord: "半年的坚持，身体已经悄悄讲出了一个新的故事。",
  };
  if (days >= 90) return {
    title: "三个月 · 扎根",
    subtitle: "习惯开始生根。训练不再是被提醒的事，而是你主动想来。",
    coachWord: "当训练变成期待而不是任务，真正的变化就开始了。",
  };
  if (days >= 30) return {
    title: "一个月 · 开始",
    subtitle: "第一个月总是最难的。你做到了，这是最重要的一步。",
    coachWord: "最难的一个月已经过去了，接下来只会越来越顺。",
  };
  return {
    title: "第一天 · 相遇",
    subtitle: "今天是你和徕舞故事的第一页。欢迎你。",
    coachWord: "很高兴认识你，我们慢慢来，不着急。",
  };
}

// ── 写给未来的自己 ──
export function getFutureSelfMessage(stageTitle: string): string {
  const messages: Record<string, string> = {
    "启程": "亲爱的未来的自己，谢谢你愿意开始。也许现在的你还会犹豫、会怀疑，但请相信，每一次出现都是对自己的一份承诺。不用急着看到结果，先享受被陪伴的过程。",
    "习惯建立": "亲爱的未来的自己，你已经走过了最难的一段路。那种'今天练不练'的纠结慢慢变少了，身体开始期待每一次训练。这种感觉，请记住它。",
    "稳定成长": "亲爱的未来的自己，训练已经不再需要特别'坚持'。它像吃饭喝水一样自然地嵌入了你的生活。这种稳定感，是过去几个月的你送给现在最好的礼物。",
    "深度蜕变": "亲爱的未来的自己，当朋友说'你好像不一样了'的时候，你淡淡一笑。你知道他们看见的是外表，而你不知道的是——里面那个人，已经彻底变了。",
    "长期主义者": "亲爱的未来的自己，你已经不需要任何理由来证明坚持是对的。因为你本身就是坚持的结果。回头看这一路，你会感到深深的骄傲。",
  };
  return messages[stageTitle] || messages["启程"];
}
