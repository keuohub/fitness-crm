"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const JOURNAL = [
  { date: "2025.03", event: "第一位会员完成 50 次训练" },
  { date: "2025.06", event: "成长记录系统上线" },
  { date: "2025.10", event: "累计记录达到 1000 次训练" },
  { date: "2026.01", event: "成长报告系统上线" },
  { date: "2026.06", event: "持续迭代中" },
];

export default function MonthlyJournalSection() {
  return (
    <section className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-16"
          style={{ color: COLORS.primary }}
        >
          时间线
        </p>

        <h2 className="text-xl sm:text-2xl font-normal text-[#1A1A1A] tracking-normal mb-20 max-w-[12ch]">
          徕舞成长日记
        </h2>
      </motion.div>

      <div className="relative">
        {/* timeline line */}
        <div
           
          style={{ backgroundColor: COLORS.border }}
        />

        <div className="space-y-16">
          {JOURNAL.map((entry, i) => (
            <motion.div
              key={entry.date}
              {...MICRO.scrollReveal}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              className="relative pl-10"
            >
              {/* dot */}
              <div
                className="absolute left-[-4px] top-1.5 w-[9px] h-[9px] rounded-full"
                style={{
                  backgroundColor: i === 0 ? COLORS.primary : COLORS.border,
                }}
              />

              <p className="text-xs text-[#4A4A4A] tracking-wide mb-2">
                {entry.date}
              </p>
              <p className="text-base text-[#1A1A1A] leading-[1.7]">
                {entry.event}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
