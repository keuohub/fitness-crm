"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

interface PlatformStats {
  totalMembers: number;
  totalTrainings: number;
  totalGrowthEvents: number;
  retentionRate: number;
  totalAIFeedbacks: number;
}

export default function EvidenceSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    fetch("/api/platform-stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
        <div className="text-center text-sm text-[#AAAAAA]">加载数据...</div>
      </section>
    );
  }

  if (!stats) return null;

  const STATS = [
    { value: stats.totalMembers, suffix: "", label: "在籍会员", color: COLORS.primary },
    { value: stats.totalTrainings, suffix: "", label: "训练记录", color: "#1A1A1A" },
    { value: stats.totalGrowthEvents, suffix: "", label: "成长事件", color: COLORS.primary },
    { value: stats.retentionRate, suffix: "%", label: "会员续课率", color: "#1A1A1A" },
  ];

  return (
    <section id="evidence" className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        onViewportEnter={() => setInView(true)}
        className="text-center mb-20"
      >
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal">
          成长应该被量化
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-16 sm:gap-20 md:gap-28">
        {STATS.map((s) => (
          <div key={s.label} className="text-center py-4">
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
            <p className="text-sm font-semibold text-[#1A1A1A] mt-5 tracking-wide">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
