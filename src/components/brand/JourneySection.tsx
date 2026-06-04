"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

const STAGES = [
  {
    day: "Day 1",
    title: "第一次训练",
    desc: "从健康问卷开始，建立个人成长基线。系统记录你的起点，教练记录你的每一步。",
  },
  {
    day: "Day 30",
    title: "建立习惯",
    desc: "连续 30 天的坚持，身体开始回应。训练记录自动生成趋势，你开始看到变化。",
  },
  {
    day: "Day 90",
    title: "身体变化",
    desc: "体态照片对比显示明显变化。系统生成季度回顾，分析你的进步和下一步方向。",
  },
  {
    day: "Day 180",
    title: "长期成长",
    desc: "半年的坚持已经融入生活。里程碑勋章、成长分享，你的故事激励着更多人。",
  },
  {
    day: "Day 365",
    title: "新的自己",
    desc: "一年过去了，365 天的记录构成了完整的成长档案。这不是终点，是新的起点。",
  },
];

export default function JourneySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="journey" ref={containerRef} className="relative bg-white">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 w-full h-[2px] bg-[#EDE8E2]">
        <motion.div
          className="h-full"
          style={{ width: progressHeight, backgroundColor: COLORS.primary }}
        />
      </div>

      {STAGES.map((stage, i) => (
        <div
          key={stage.day}
          className="min-h-[80vh] sm:min-h-screen flex items-center px-4 sm:px-6"
        >
          <div className="max-w-4xl mx-auto w-full grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Day number */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30%" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="text-center md:text-left"
            >
              <p className="text-6xl sm:text-8xl md:text-9xl font-semibold text-[#1D1D1F] tracking-[-0.04em] leading-none">
                {i + 1}
              </p>
              <p
                className="text-sm font-medium mt-3 tracking-wider"
                style={{ color: COLORS.primary }}
              >
                {stage.day}
              </p>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30%" }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-3 sm:mb-4">
                {stage.title}
              </h3>
              <p className="text-sm sm:text-base text-[#6E6E73] leading-relaxed">
                {stage.desc}
              </p>
            </motion.div>
          </div>
        </div>
      ))}
    </section>
  );
}
