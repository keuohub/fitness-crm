"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const PILLARS = [
  { title: "评估", desc: "33题健康问卷 + 体态照片 + 初始分析，建立个人成长基线" },
  { title: "训练", desc: "每次训练自动记录，时长、类型、重点区域，无需手动整理" },
  { title: "成长", desc: "系统生成回顾记录、里程碑、成长勋章，让进步可视化" },
];

export default function MissionSection() {
  return (
    <section id="mission" className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>我们的信念</p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">不只是管理会员</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">传统健身房关注续费。徕舞关注成长。我们相信每一位女性都值得被看见、被陪伴。</p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
        className="grid md:grid-cols-3 gap-6">
        {PILLARS.map((p, i) => (
          <motion.div key={p.title} variants={staggerItem}
            className="rounded-3xl p-8 text-center"
            style={{ background: "linear-gradient(135deg, #FDF9F5 0%, rgba(255,255,255,0.95) 100%)", boxShadow: "0 2px 16px rgba(62,39,35,0.05)" }}
            whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.15 }}
          >
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-semibold mb-4"
              style={{ backgroundColor: `${COLORS.primary}14`, color: COLORS.primary }}>
              {i + 1}
            </div>
            <h3 className="text-lg font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-2">{p.title}</h3>
            <p className="text-sm text-[#6E6E73] leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
