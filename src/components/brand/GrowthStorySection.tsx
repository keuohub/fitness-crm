"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const STORY = [
  { day: 1,   title: "第一次训练",    desc: "从健康问卷开始，建立个人成长基线。系统记录你的起点，教练记录你的每一步。" },
  { day: 30,  title: "建立习惯",      desc: "连续 30 天的坚持，身体开始回应。训练记录自动生成趋势，你开始看到变化。" },
  { day: 90,  title: "身体变化",      desc: "体态照片对比显示明显变化。系统生成季度回顾，分析你的进步和下一步方向。" },
  { day: 180, title: "长期成长",      desc: "半年的坚持已经融入生活。里程碑勋章、成长分享，你的故事激励着更多人。" },
  { day: 365, title: "新的自己",      desc: "一年过去了，365 天的记录构成了完整的成长档案。这不是终点，是新的起点。" },
];

export default function GrowthStorySection() {
  return (
    <section id="story" className="max-w-3xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-20">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>Growth Story</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">成长的故事</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">每一位加入徕舞的女性，都在书写自己的成长故事。</p>
      </motion.div>

      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-[15px] top-4 bottom-4 w-[1px] hidden sm:block"
          style={{ background: `linear-gradient(180deg, ${COLORS.primary}30 0%, ${COLORS.border} 60%, transparent 100%)` }} />

        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="space-y-12 sm:space-y-16">
          {STORY.map((item, i) => (
            <motion.div key={item.day} variants={staggerItem} className="relative sm:pl-16">
              {/* Node + day badge */}
              <div className="hidden sm:flex absolute left-[8px] top-1 flex-col items-center">
                <div className="w-[15px] h-[15px] rounded-full border-[3px] border-white ring-2"
                  style={{ backgroundColor: i === 0 ? COLORS.primary : i === 4 ? COLORS.primary : "#3E2723", borderColor: "#FFF" }} />
              </div>

              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-3xl sm:text-4xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">Day {item.day}</span>
                {i > 0 && (
                  <div className="hidden sm:block flex-1 h-[1px] mt-4 opacity-20" style={{ backgroundColor: COLORS.border }} />
                )}
              </div>

              <h3 className="text-xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-2">{item.title}</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed max-w-[34em]">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
