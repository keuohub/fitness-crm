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
    <section className="max-w-[32em] mx-auto px-6 py-32 md:py-40 bg-white">
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

        <h2 className="text-3xl sm:text-4xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-20 max-w-[12ch]">
          徕舞成长日记
        </h2>
      </motion.div>

      <div className="relative">
        {/* timeline line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[1px]"
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

              <p className="text-xs text-[#6E6E73] tracking-wide mb-2">
                {entry.date}
              </p>
              <p className="text-base text-[#1D1D1F] leading-[1.9]">
                {entry.event}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
