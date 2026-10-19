"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function BeliefSection() {
  return (
    <section className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8"
          style={{ color: COLORS.primary }}
        >
          女子塑形 · 体态调整 · 产后恢复
        </p>

        <p className="text-xl sm:text-2xl text-[#1A1A1A] leading-[2.0] tracking-[-0.02em]">
          我们记录训练，
          <br />
          不是为了证明努力。
        </p>

        <p className="text-xl sm:text-2xl text-[#1A1A1A] leading-[2.0] mt-8 tracking-[-0.02em]">
          而是希望每一次坚持，
          <br />
          都能被时间看见。
        </p>

        <div className="mt-20 flex justify-center gap-16">
          <div>
            <p className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] tracking-[-0.02em]"
               style={{ fontFamily: "var(--font-number)" }}>
              3,682
            </p>
            <p className="text-sm text-[#4A4A4A] mt-2">位在籍会员</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] tracking-[-0.02em]"
               style={{ fontFamily: "var(--font-number)" }}>
              88.7%
            </p>
            <p className="text-sm text-[#4A4A4A] mt-2">续课率</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
