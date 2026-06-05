"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const LINKS = [
  { label: "查看成长档案样例", href: "/portal/growth", desc: "体验会员成长时间轴" },
  { label: "查看 阶段回顾样例", href: "/portal/feedback", desc: "阅读真实的阶段回顾" },
  { label: "查看 Portal 样例", href: "/portal", desc: "打开会员成长空间" },
];

export default function TrySection() {
  return (
    <section id="try" className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>体验</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">亲自体验</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">打开样例系统，感受为会员带来的成长体验。</p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
        className="grid md:grid-cols-3 gap-6">
        {LINKS.map((l) => (
          <motion.div key={l.label} variants={staggerItem}>
            <Link href={l.href}
              className="block p-8 text-center rounded-3xl transition-all"
              style={{ boxShadow: "0 2px 16px rgba(62,39,35,0.04)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(62,39,35,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(62,39,35,0.04)"; }}>
              <p className="text-lg font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-2">{l.label}</p>
              <p className="text-xs text-[#6E6E73]">{l.desc}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
