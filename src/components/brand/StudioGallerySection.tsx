"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const GALLERY = [
  {
    title: "训练空间",
    desc: "自然采光，宽敞明亮",
    gradient: "#FFFFFF",
  },
  {
    title: "私教区域",
    desc: "一对一专注指导",
    gradient: "#FFFFFF",
  },
  {
    title: "体态评估",
    desc: "专业设备，精准记录",
    gradient: "#FFFFFF",
  },
];

export default function StudioGallerySection() {
  return (
    <section id="studio" className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
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
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal mb-4">
          我们的空间
        </h2>
        <p className="text-sm text-[#4A4A4A] max-w-prose mx-auto">
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
            className="rounded-none overflow-hidden aspect-[3/4] relative group cursor-pointer transition-shadow"
            style={{
              background: item.gradient,
              boxShadow: "none",
            }}
            whileHover={{}}
          >
            {/* Placeholder visual */}
            <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full opacity-15 group-hover:opacity-25 transition-opacity">
              <rect x="60" y="80" width="180" height="240" rx="12" fill={COLORS.primary} opacity="0.3" />
              <rect x="100" y="140" width="100" height="4" rx="2" fill="#1A1A1A" opacity="0.4" />
              <rect x="100" y="160" width="60" height="3" rx="1.5" fill="#1A1A1A" opacity="0.2" />
            </svg>

            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <div className="bg-white  rounded-none p-4">
                <h3 className="text-lg font-semibold text-[#1A1A1A] tracking-normal">
                  {item.title}
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-1">{item.desc}</p>
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
        className="mt-20 text-center max-w-prose mx-auto"
      >
        <h3 className="text-2xl font-semibold text-[#1A1A1A] tracking-normal mb-3">
          小桥 · 主理人
        </h3>
        <p className="text-sm text-[#4A4A4A] leading-[1.8]">
          专注女性成长与身体管理，陪伴每一位会员走过真实的改变。
          相信成长不是结果，而是一次次坚持后被看见的过程。
        </p>
      </motion.div>
    </section>
  );
}
