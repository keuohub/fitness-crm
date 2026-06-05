"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const STEPS = [
  { label: "健康评估", desc: "33题问卷 + 体态照片" },
  { label: "训练记录", desc: "每次自动记录" },
  { label: "体态照片", desc: "月度对比追踪" },
  { label: "阶段回顾", desc: "每周/月/季度报告" },
  { label: "成长档案", desc: "时间轴 + 里程碑" },
  { label: "持续训练", desc: "习惯闭环" },
];

function FlywheelRing() {
  const size = 320;
  const cx = size / 2; const cy = size / 2; const r = 125;
  const angleStep = (2 * Math.PI) / STEPS.length;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-dashed opacity-30" style={{ borderColor: COLORS.border }} />

      {/* Connecting arcs */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {STEPS.map((_, i) => {
          const startAngle = -Math.PI / 2 + i * angleStep;
          const endAngle = startAngle + angleStep * 0.7;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          return (
            <motion.path
              key={i}
              d={`M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2}`}
              fill="none" stroke={COLORS.primary} strokeWidth="2"
              strokeLinecap="round" opacity="0.25"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.2 }}
            />
          );
        })}
      </svg>

      {/* Step nodes */}
      {STEPS.map((step, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = cx + (r + 20) * Math.cos(angle) - 36;
        const y = cy + (r + 20) * Math.sin(angle) - 20;
        return (
          <motion.div key={step.label}
            initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.5 + i * 0.15 }}
            className="absolute text-center" style={{ left: x, top: y, width: 72 }}
          >
            <div className="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-semibold text-white mb-1"
              style={{ backgroundColor: COLORS.primary }}>
              {i + 1}
            </div>
            <p className="text-[10px] font-medium text-[#3E2723] leading-tight">{step.label}</p>
          </motion.div>
        );
      })}

      {/* Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">成长飞轮</p>
          <p className="text-xs text-[#6E6E73] mt-1">持续循环</p>
        </div>
      </div>
    </div>
  );
}

export default function MethodSection() {
  return (
    <section id="method" className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>成长模型</p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">持续成长的飞轮</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">每一次评估、每一次训练、每一次反馈，都在推动成长的飞轮向前转动。</p>
      </motion.div>

      <FlywheelRing />
    </section>
  );
}
