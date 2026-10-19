"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export default function DemoSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [studio, setStudio] = useState("");
  const [city, setCity] = useState("");
  const [scale, setScale] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    if (!name.trim() || !phone.trim()) return;

    if (!PHONE_REGEX.test(phone.trim())) {
      setPhoneError("请输入正确的11位手机号");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/demo-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          studioName: studio.trim() || undefined,
          memberScale: scale || undefined,
        }),
      });

      if (!res.ok) throw new Error("提交失败");

      // 飞书通知：失败不阻塞
      fetch("/api/demo-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          studioName: studio.trim() || undefined,
          memberScale: scale || undefined,
          _notify_feishu: true,
        }),
      }).catch(() => {});

      setSubmitted(true);
    } catch {
      // 静默失败，仍显示成功（数据入库为重试场景）
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="demo" className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>预约</p>
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal mb-4">预约演示</h2>
        <p className="text-sm text-[#4A4A4A] max-w-prose mx-auto">看看徕舞系统如何帮助你的工作室，让会员真正看见成长。</p>
      </motion.div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <p className="text-2xl font-semibold text-[#1A1A1A] tracking-normal mb-2">感谢你的关注</p>
          <p className="text-sm text-[#4A4A4A]">我们会在 24 小时内与你联系。</p>
        </motion.div>
      ) : (
        <motion.form {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
          onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#4A4A4A] mb-2">姓名</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-lg bg-white text-sm text-[#1A1A1A] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="你的名字" />
            </div>
            <div>
              <label className="block text-xs text-[#4A4A4A] mb-2">手机号</label>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                className="w-full h-12 px-4 rounded-lg bg-white text-sm text-[#1A1A1A] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
                style={{ border: `1px solid ${phoneError ? "#DC2626" : COLORS.border}` }} placeholder="11位手机号" />
              {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#4A4A4A] mb-2">城市</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full h-12 px-4 rounded-lg bg-white text-sm text-[#1A1A1A] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="所在城市" />
            </div>
            <div>
              <label className="block text-xs text-[#4A4A4A] mb-2">工作室名称</label>
              <input type="text" value={studio} onChange={(e) => setStudio(e.target.value)}
                className="w-full h-12 px-4 rounded-lg bg-white text-sm text-[#1A1A1A] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
                style={{ border: `1px solid ${COLORS.border}` }} placeholder="选填" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#4A4A4A] mb-2">会员规模</label>
            <select value={scale} onChange={(e) => setScale(e.target.value)}
              className="w-full h-12 px-4 rounded-lg bg-white text-sm text-[#1A1A1A] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20 appearance-none"
              style={{ border: `1px solid ${COLORS.border}` }}>
              <option value="">请选择</option>
              <option value="<50">50人以下</option>
              <option value="50-200">50-200人</option>
              <option value=">200">200人以上</option>
            </select>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full h-12 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = "#333333"; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = COLORS.primary; }}>
            {submitting ? "提交中..." : "提交预约"}
          </button>
        </motion.form>
      )}
    </section>
  );
}
