"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const STEPS = [
  { num: "01", title: "创建会员", desc: "录入基本信息，生成专属成长档案", color: "#3E2723" },
  { num: "02", title: "记录训练", desc: "每次训练自动记录，类型、时长、重点", color: COLORS.primary },
  { num: "03", title: "上传照片", desc: "体态照片定期记录，月度对比变化", color: "#3E2723" },
  { num: "04", title: "洞察记录", desc: "基于数据分析自动生成个性化报告", color: COLORS.primary },
  { num: "05", title: "会员成长", desc: "时间轴记录、勋章系统、成长分享", color: "#3E2723" },
];

function ScreenshotLightbox() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-3xl overflow-hidden relative max-w-3xl mx-auto"
        style={{ background: "linear-gradient(160deg, #F7F1EA 0%, #EDE0D4 100%)", boxShadow: "0 4px 20px rgba(62,39,35,0.06)", minHeight: 240 }}>
        <div className="h-8 flex items-center gap-1.5 px-4 bg-white/30">
          <div className="w-2 h-2 rounded-full bg-white/50" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/15" />
        </div>
        <div className="p-6 space-y-3">
          <div className="h-3 rounded-full w-2/3 bg-white/30" />
          <div className="h-3 rounded-full w-1/2 bg-white/20" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="h-16 rounded-xl bg-white/20" />
            <div className="h-16 rounded-xl bg-white/20" />
            <div className="h-16 rounded-xl bg-white/20" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-[#3E2723]/10">
          <span className="text-sm font-medium text-[#3E2723] bg-white/90 rounded-full px-4 py-2">点击放大</span>
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#3E2723]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl overflow-hidden max-w-2xl w-full"
              style={{ background: "linear-gradient(160deg, #F7F1EA 0%, #EDE0D4 100%)", boxShadow: "0 8px 40px rgba(62,39,35,0.2)" }}>
              <div className="h-8 flex items-center justify-between px-4 bg-white/30">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/50" />
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <div className="w-2 h-2 rounded-full bg-white/15" />
                </div>
                <button onClick={() => setOpen(false)} className="text-xs text-[#6E6E73] hover:text-[#3E2723]">关闭</button>
              </div>
              <div className="p-8 space-y-4 min-h-[300px]">
                <div className="h-4 rounded-full w-2/3 bg-white/30" />
                <div className="h-4 rounded-full w-1/2 bg-white/20" />
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="h-20 rounded-xl bg-white/25" />
                  <div className="h-20 rounded-xl bg-white/25" />
                  <div className="h-20 rounded-xl bg-white/25" />
                </div>
                <div className="h-32 rounded-xl bg-white/20 mt-2" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-32 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>使用流程</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">使用流程</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">从创建会员到成长反馈，一个完整的闭环。</p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
        {STEPS.map((s) => (
          <motion.div key={s.num} variants={staggerItem}
            className="p-6 text-center transition-shadow rounded-3xl"
            style={{ boxShadow: "0 2px 16px rgba(62,39,35,0.04)" }}
            whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(62,39,35,0.08)" }} transition={{ duration: 0.2 }}>
            <p className="text-3xl font-semibold mb-2" style={{ color: s.color }}>{s.num}</p>
            <p className="text-sm font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-1">{s.title}</p>
            <p className="text-xs text-[#6E6E73]">{s.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <ScreenshotLightbox />
    </section>
  );
}
