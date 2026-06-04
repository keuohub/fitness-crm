"use client";

import { motion } from "framer-motion";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

const MOTIVATIONS: Record<string, { title: string; body: string }> = {
  "启程": {
    title: "改变的第一步",
    body: "你已经迈出了最重要的第一步。身体需要时间，习惯需要耐心，每一次出现都是对自己的承诺。",
  },
  "习惯建立": {
    title: "习惯在生长",
    body: "连续出现是最强的信号。身体正在适应，肌肉正在记忆，你已经不是30天前的自己。",
  },
  "稳定成长": {
    title: "成长在加速",
    body: "训练不再是任务，而是生活的一部分。身体的变化开始被看见，坚持的回报正在到来。",
  },
  "深度蜕变": {
    title: "蜕变的季节",
    body: "半年以上的坚持，身体已经从内到外被重塑。你不是在训练，你是在变成更好的版本。",
  },
  "长期主义者": {
    title: "时间的礼物",
    body: "一年过去，你已经不需要被提醒要坚持。因为坚持已经变成你是谁的一部分。这不是终点，是新的起点。",
  },
};

interface Props {
  stageTitle: string;
}

export default function DailyMotivation({ stageTitle }: Props) {
  const m = MOTIVATIONS[stageTitle] || MOTIVATIONS["启程"];

  return (
    <motion.section
      {...MICRO.scrollReveal}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      className="text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-8" style={{ color: COLORS.primary }}>
        每日一语
      </p>
      <div className="relative">
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-6xl font-serif text-[#EDE8E2] leading-none select-none">
          &ldquo;
        </span>
        <p className="font-serif text-2xl sm:text-3xl text-[#3E2723] leading-relaxed italic max-w-xs mx-auto relative z-10">
          {m.title}
        </p>
      </div>
      <p className="text-sm text-[#9E8E7E] mt-6 leading-relaxed max-w-sm mx-auto">
        {m.body}
      </p>
      <p className="text-xs text-[#9E8E7E] mt-6">-- 小桥</p>
    </motion.section>
  );
}
