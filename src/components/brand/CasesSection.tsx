"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const MEMBERS = [
  {
    name: "李女士",
    role: "儿科医生",
    totalTrainings: 87,
    monthsSinceJoin: 14,
    note: "现在最大的变化，是终于能够感受到自己的身体。",
  },
  {
    name: "张女士",
    role: "中学教师",
    totalTrainings: 63,
    monthsSinceJoin: 11,
    note: "十一年伏案工作的肩颈问题，在这里慢慢消解了。不是因为某一次训练，而是因为持续。",
  },
  {
    name: "陈女士",
    role: "设计师",
    totalTrainings: 54,
    monthsSinceJoin: 9,
    note: "训练不是惩罚自己的身体，而是学会与它相处。这个认知改变了很多事。",
  },
];

export default function CasesSection() {
  return (
    <section id="cases" className="max-w-[32em] mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
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
          成长档案
        </p>

        <h2 className="text-3xl sm:text-4xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-20 max-w-[12ch]">
          她们的成长记录
        </h2>
      </motion.div>

      <div className="divide-y divide-[#E8E0D5]">
        {MEMBERS.map((m) => (
          <motion.article
            key={m.name}
            {...MICRO.scrollReveal}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            className="py-12 first:pt-0 last:pb-0"
          >
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-medium mb-6"
              style={{ color: COLORS.primary }}
            >
              {m.role}
            </p>

            <div className="flex items-baseline gap-8 mb-8">
              <div>
                <span
                  className="text-2xl font-semibold text-[#3E2723] tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-number, 'Inter', sans-serif)" }}
                >
                  {m.totalTrainings}
                </span>
                <span className="text-xs text-[#6E6E73] ml-2">次训练</span>
              </div>
              <div>
                <span
                  className="text-2xl font-semibold text-[#3E2723] tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-number, 'Inter', sans-serif)" }}
                >
                  {m.monthsSinceJoin}
                </span>
                <span className="text-xs text-[#6E6E73] ml-2">个月</span>
              </div>
            </div>

            <p className="text-base text-[#3E2723] leading-[1.7] max-w-[32em]">
              {m.note}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
