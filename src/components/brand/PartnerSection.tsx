"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const PARTNERS = [
  { name: "女子塑形场馆", desc: "为会员提供专属成长档案，让训练成果可视化" },
  { name: "女性成长机构", desc: "记录每一次练习，系统生成趋势回顾" },
  { name: "健身房等", desc: "从身体到心灵，完整记录成长旅程" },
];

export default function PartnerSection() {
  return (
    <section id="partner" className="max-w-4xl mx-auto px-6 py-32 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>合作伙伴</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">谁适合使用本平台</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">帮助每一位教练更好地陪伴会员成长。</p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
        className="grid md:grid-cols-3 gap-6">
        {PARTNERS.map((p) => (
          <motion.div key={p.name} variants={staggerItem}
            className="p-8 text-center transition-shadow"
            style={{ boxShadow: "0 2px 16px rgba(62,39,35,0.04)" }}
            whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(62,39,35,0.08)" }} transition={{ duration: 0.2 }}>
            <p className="text-lg font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-2">{p.name}</p>
            <p className="text-xs text-[#6E6E73] leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
