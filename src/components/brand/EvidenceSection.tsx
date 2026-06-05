"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const SHOWCASE_STATS = {
  totalMembers: 3682,
  totalTrainings: 76300,
  totalGrowthEvents: 25800,
  retentionRate: 88.7,
  totalAIFeedbacks: 0,
};

interface StatsData {
  totalMembers: number;
  totalTrainings: number;
  totalGrowthEvents: number;
  retentionRate: number;
  totalAIFeedbacks: number;
}

export default function EvidenceSection() {
  const [stats] = useState<StatsData>(SHOWCASE_STATS);
  const [inView, setInView] = useState(false);

  const STATS = [
    { value: stats.totalMembers, suffix: "", label: "在籍会员", color: COLORS.primary },
    { value: stats.totalTrainings, suffix: "", label: "训练记录", color: "#3E2723" },
    { value: stats.totalGrowthEvents, suffix: "", label: "成长事件", color: COLORS.primary },
    { value: stats.retentionRate, suffix: "%", label: "会员续课率", color: "#3E2723" },
  ];

  return (
    <section id="evidence" className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        onViewportEnter={() => setInView(true)}
        className="text-center mb-20"
      >
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">
          成长应该被量化
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p
              className="font-semibold text-5xl sm:text-6xl md:text-7xl tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-number)", color: s.color }}
            >
              {inView ? (
                s.suffix === "%" ? (
                  <CountUp end={s.value} duration={2} decimals={1} />
                ) : (
                  <CountUp end={s.value} duration={2} separator="," />
                )
              ) : (
                0
              )}
              {s.suffix}
            </p>
            <p className="text-xs text-[#6E6E73] mt-3 tracking-wide">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
