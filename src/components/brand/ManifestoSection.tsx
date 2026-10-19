"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function ManifestoSection() {
  return (
    <section id="about" className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24">
        {/* Left: big title */}
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-10" style={{ color: COLORS.primary }}>
            关于小桥
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-[#1A1A1A] tracking-[-0.04em] leading-[1.08]">
            关于
            <br />
            小桥
          </h2>
        </motion.div>

        {/* Right: founder story */}
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="space-y-8">
          <p className="text-base sm:text-lg text-[#1A1A1A] leading-[1.8] font-medium">
            从业16年，开馆14年。
          </p>
          <p className="text-base text-[#4A4A4A] leading-[1.8]">
            累计陪伴超过20,000名女性改善体态、建立运动习惯。
          </p>
          <div className="w-12 h-[1px] opacity-20" style={{ backgroundColor: COLORS.primary }} />
          <p className="text-base text-[#1A1A1A] leading-[1.8] font-medium">
            她始终相信，身体的变化从来不是一场短跑。
          </p>
          <p className="text-sm text-[#4A4A4A] leading-[1.8]">
            真正的成长，来自每一次训练后的坚持，每一次想放弃时的继续，以及日复一日的积累。
          </p>
          <p className="text-sm text-[#4A4A4A] leading-[1.8]">
            徕舞希望记录这些过程，让成长被记录，让坚持被看见。
          </p>
        </motion.div>
      </div>
    </section>
  );
}
