"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function DemoSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [studio, setStudio] = useState("");
  const [city, setCity] = useState("");
  const [scale, setScale] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitted(true);
  };

  return (
    <section id="demo" className="max-w-2xl mx-auto px-6 py-32 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>预约</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">预约演示</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">看看徕舞系统如何帮助你的工作室，让会员真正看见成长。</p>
      </motion.div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <p className="text-2xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-2">感谢你的关注</p>
          <p className="text-sm text-[#6E6E73]">我们会在 24 小时内与你联系。</p>
        </motion.div>
      ) : (
        <motion.form {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
          onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6E6E73] mb-2">姓名</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="你的名字" />
            </div>
            <div>
              <label className="block text-xs text-[#6E6E73] mb-2">手机号</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="你的手机号" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6E6E73] mb-2">城市</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="所在城市" />
            </div>
            <div>
              <label className="block text-xs text-[#6E6E73] mb-2">工作室名称</label>
              <input type="text" value={studio} onChange={(e) => setStudio(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="选填" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-2">会员规模</label>
            <select value={scale} onChange={(e) => setScale(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20 appearance-none"
              style={{ border: `1px solid ${COLORS.border}` }}>
              <option value="">请选择</option>
              <option value="<50">50人以下</option>
              <option value="50-200">50-200人</option>
              <option value=">200">200人以上</option>
            </select>
          </div>
          <button type="submit" className="w-full h-12 rounded-xl text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: COLORS.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A86545")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}>
            提交预约
          </button>
        </motion.form>
      )}
    </section>
  );
}
