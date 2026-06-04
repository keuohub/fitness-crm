"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function CTASection() {
  return (
    <section id="cta" className="max-w-3xl mx-auto px-6 py-32 bg-white text-center">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="space-y-8">
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">让会员真正看见成长</h2>
        <p className="text-sm text-[#6E6E73] max-w-md mx-auto">
          不是每个月的数据报表，而是一次次被看见的坚持。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a href="#" className="h-12 px-10 rounded-xl text-white text-sm font-medium inline-flex items-center justify-center transition-colors"
            style={{ backgroundColor: COLORS.primary }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#A86545"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.primary; }}
          >
            预约演示
          </a>
          <a href="mailto:hello@laiwu.fitness" className="h-12 px-10 rounded-xl text-sm font-medium inline-flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${COLORS.border}`, color: "#3E2723" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAF7F2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            联系徕舞
          </a>
        </div>
      </motion.div>
    </section>
  );
}
