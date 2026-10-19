"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function CTASection() {
  return (
    <section id="cta" className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24 text-center">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="space-y-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal">让会员真正看见成长</h2>
        <p className="text-sm text-[#4A4A4A] max-w-prose mx-auto">
          不是每个月的数据报表，而是一次次被看见的坚持。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a href="#" className="h-12 px-10 rounded-lg text-white text-sm font-medium inline-flex items-center justify-center transition-colors"
            style={{ backgroundColor: COLORS.primary }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#333333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.primary; }}
          >
            预约演示
          </a>
          <a href="mailto:hello@laiwu.fitness" className="h-12 px-10 rounded-lg text-sm font-medium inline-flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${COLORS.border}`, color: "#1A1A1A" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAFAFA"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            联系徕舞
          </a>
        </div>
      </motion.div>
    </section>
  );
}
