"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function FounderLetterSection() {
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
          一封信
        </p>

        <h2 className="text-xl sm:text-2xl font-normal text-[#1A1A1A] tracking-normal mb-16 max-w-[12ch]">
          致正在认真练习的你
        </h2>

        <div className="space-y-8 text-base leading-[2] text-[#1A1A1A]">
          <p>
            不是每个人都需要成为运动达人。
          </p>
          <p>
            我们更关心的是，一个人能否在忙碌生活里，为自己保留稳定的训练习惯。
          </p>
          <p>
            有人希望减掉多余脂肪。
            有人希望改善体态与身体线条。
            有人希望在产后重新找回身体的力量与自信。
            也有人只是想拥有更轻盈、更有能量的自己。
          </p>
          <p>
            徕舞记录的不只是一次次训练。
            而是身体在时间里的变化。
            那些看不见的坚持，
            终将变成看得见的改变。
          </p>
        </div>

        <p className="text-sm text-[#4A4A4A] mt-16">
          徕舞女子塑形
        </p>
      </motion.div>
    </section>
  );
}
