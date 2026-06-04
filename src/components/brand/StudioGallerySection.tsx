"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const GALLERY = [
  {
    title: "训练空间",
    desc: "自然采光，宽敞明亮",
    gradient: "linear-gradient(160deg, #F7F1EA 0%, #EDE0D4 100%)",
  },
  {
    title: "私教区域",
    desc: "一对一专注指导",
    gradient: "linear-gradient(160deg, #EDE4D8 0%, #E0D3C5 100%)",
  },
  {
    title: "体态评估",
    desc: "专业设备，精准记录",
    gradient: "linear-gradient(160deg, #F0E8DE 0%, #E5D8C8 100%)",
  },
];

export default function StudioGallerySection() {
  return (
    <section id="studio" className="max-w-5xl mx-auto px-6 py-32 bg-white">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-16"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-6"
          style={{ color: COLORS.primary }}
        >
          Studio
        </p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">
          我们的空间
        </h2>
        <p className="text-sm text-[#6E6E73] max-w-md mx-auto">
          钟祥徕舞 — 女性成长与身体管理平台
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GALLERY.map((item, i) => (
          <motion.div
            key={item.title}
            {...MICRO.scrollReveal}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            className="rounded-3xl overflow-hidden aspect-[3/4] relative group cursor-pointer transition-shadow"
            style={{
              background: item.gradient,
              boxShadow: "0 2px 20px rgba(62,39,35,0.05)",
            }}
            whileHover={{ y: -6, boxShadow: "0 12px 40px rgba(62,39,35,0.1)" }}
          >
            {/* Placeholder visual */}
            <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full opacity-15 group-hover:opacity-25 transition-opacity">
              <rect x="60" y="80" width="180" height="240" rx="12" fill={COLORS.primary} opacity="0.3" />
              <rect x="100" y="140" width="100" height="4" rx="2" fill="#3E2723" opacity="0.4" />
              <rect x="100" y="160" width="60" height="3" rx="1.5" fill="#3E2723" opacity="0.2" />
            </svg>

            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">
                  {item.title}
                </h3>
                <p className="text-xs text-[#6E6E73] mt-1">{item.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coach intro */}
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="mt-20 text-center max-w-lg mx-auto"
      >
        <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-3">
          小桥 · 主理人
        </h3>
        <p className="text-sm text-[#6E6E73] leading-relaxed">
          专注女性成长与身体管理，陪伴每一位会员走过真实的改变。
          相信成长不是结果，而是一次次坚持后被看见的过程。
        </p>
      </motion.div>
    </section>
  );
}
