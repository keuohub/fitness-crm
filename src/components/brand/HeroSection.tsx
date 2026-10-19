"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

export default function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ background: "#FFFFFF" }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative z-10 text-center"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base tracking-[0.15em] font-medium mb-16"
          style={{ color: COLORS.primary }}
        >
          钟祥 · 徕舞女子塑形
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-[16ch] mx-auto text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] sm:leading-[1.05]"
          style={{ color: COLORS.secondary }}
        >
          成长值得被记录
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] sm:leading-[1.05] mt-4"
          style={{ color: COLORS.muted || "#9E9E9E" }}
        >
          坚持值得被看见
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-sm sm:text-base leading-[1.7] tracking-normal mt-12 max-w-prose mx-auto text-center"
          style={{ color: COLORS.muted || "#4A4A4A" }}
        >
          不是一次训练改变了身体
          <br className="sm:hidden" />
          <span className="hidden sm:inline">，</span>
          而是一次次记录，让成长慢慢发生。
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-14"
        >
          <a
            href="/portal"
            className="inline-block text-sm tracking-[0.1em] font-medium px-8 py-3 rounded-none transition-colors duration-200 hover:bg-[#333333] transition-colors duration-200"
            style={{ backgroundColor: COLORS.primary, color: "#FFFFFF" }}
          >
            了解成长系统
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
