"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const SPOKES = ["训练", "记录", "反馈", "坚持"];

function GrowthWheel() {
  const size = 280;
  const cx = size / 2; const cy = size / 2; const r = 100;
  const step = (2 * Math.PI) / SPOKES.length;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Ring */}
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.border} strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }} />

        {/* Arrows between spokes */}
        {SPOKES.map((_, i) => {
          const a1 = -Math.PI / 2 + i * step + 0.4;
          const a2 = a1 + step - 0.8;
          const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
          return (
            <motion.path key={i}
              d={`M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2}`} fill="none" stroke={COLORS.primary}
              strokeWidth="1.5" strokeLinecap="round" opacity="0.4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }} />
          );
        })}
      </svg>

      {/* Spoke labels */}
      {SPOKES.map((s, i) => {
        const angle = -Math.PI / 2 + i * step;
        const x = cx + (r + 30) * Math.cos(angle) - 24;
        const y = cy + (r + 30) * Math.sin(angle) - 12;
        return (
          <motion.div key={s}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.15 }}
            className="absolute text-sm font-medium text-[#3E2723]" style={{ left: x, top: y, width: 48, textAlign: "center" }}>
            {s}
          </motion.div>
        );
      })}

      {/* Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-base font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">持续<br />成长</p>
      </div>
    </div>
  );
}

export default function WheelSection() {
  return (
    <section id="wheel" className="max-w-3xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>成长路径</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">成长飞轮</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">训练、记录、反馈、坚持 —— 每一次循环都推动成长向前。</p>
      </motion.div>
      <GrowthWheel />
    </section>
  );
}
