"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { BRAND_CORE_MESSAGE } from "@/lib/brand-voice";

export default function HeroSection() {
  return (
    <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 sm:px-12 lg:px-20 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] sm:text-xs tracking-[0.15em] font-medium mb-12"
          style={{ color: COLORS.primary }}
        >
          钟祥 · 徕舞女子塑形
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="max-w-[14ch] mx-auto text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold tracking-[-0.02em] leading-[1.15] sm:leading-[1.02]"
          style={{ color: COLORS.secondary }}
        >
          成长值得被记录 <br /> 坚持值得被{" "}
          <span style={{ color: COLORS.primary }}>看见</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-sm sm:text-base leading-[1.7] tracking-normal mt-12 max-w-[34em] mx-auto text-center"
          style={{ color: "#6E6E73" }}
        >
          不是一次训练改变了身体，<br />
          而是一次次记录，让成长慢慢发生。
        </motion.p>
      </motion.div>
    </section>
  );
}
