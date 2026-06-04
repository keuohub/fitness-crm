"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function BrandFilmSection() {
  return (
    <section id="film" className="py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">
            成长不是奇迹
            <br />
            是一次次坚持
          </h2>
        </motion.div>

        {/* 16:9 video placeholder */}
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
          className="aspect-video rounded-3xl overflow-hidden relative max-w-4xl mx-auto"
          style={{ background: "linear-gradient(160deg, #F7F1EA 0%, #E8D5C3 100%)", boxShadow: "0 4px 30px rgba(62,39,35,0.08)" }}>
          {/* Abstract composition */}
          <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="xMidYMid slice">
            <ellipse cx="400" cy="200" rx="250" ry="140" fill={COLORS.primary} />
            <ellipse cx="300" cy="350" rx="180" ry="80" fill="#3E2723" opacity="0.5" />
          </svg>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.06 }}
              className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: `${COLORS.primary}e0`, boxShadow: `0 8px 40px ${COLORS.primary}40` }}>
              <svg width="32" height="38" viewBox="0 0 28 32" fill="white">
                <path d="M0 0L28 16L0 32V0Z" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
