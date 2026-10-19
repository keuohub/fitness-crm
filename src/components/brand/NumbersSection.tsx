"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const NUMBERS = [
  { value: 1000, suffix: "+", label: "训练记录", color: COLORS.primary },
  { value: 100, suffix: "+", label: "成长报告", color: "#1A1A1A" },
  { value: 95, suffix: "%", label: "会员留存", color: COLORS.primary },
  { value: 365, suffix: "", label: "成长周期", color: "#1A1A1A" },
];

function AnimatedNumber({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  return <span>{inView ? <CountUp end={value} duration={1.5} separator="" /> : 0}{suffix}</span>;
}

export default function NumbersSection() {
  const [inView, setInView] = useState(false);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>Numbers</p>
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal mb-4">数字见证成长</h2>
      </motion.div>

      <motion.div
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
        onViewportEnter={() => setInView(true)}
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {NUMBERS.map((n) => (
          <motion.div key={n.label} variants={staggerItem}
            className="rounded-none p-8 text-center"
            style={{ background: "linear-gradient(160deg, #FAFAFA 0%, #FFF 100%)", boxShadow: "0 2px 16px rgba(62,39,35,0.05)" }}
            whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.15 }}
          >
            <p className="text-2xl sm:text-3xl font-normal" style={{ color: n.color }}>
              <AnimatedNumber value={n.value} suffix={n.suffix} inView={inView} />
            </p>
            <p className="text-xs text-[#4A4A4A] mt-3">{n.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
