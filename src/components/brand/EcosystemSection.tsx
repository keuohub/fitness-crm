"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const SECTIONS = [
  {
    id: "crm",
    title: "会员管理中心",
    desc: "从会员档案到训练记录，从飞书同步到周期报告。教练可以随时随地查看每一位会员的成长状态。",
    features: ["会员档案管理", "训练记录追踪", "飞书数据同步", "周期报告自动生成"],
  },
  {
    id: "ai",
    title: "成长记录",
    desc: "基于训练数据、体态照片和健康问卷，系统自动生成个性化回顾报告、成长趋势和里程碑提醒。",
    features: ["洞察记录自动生成", "成长趋势分析", "里程碑自动识别", "多周期总结报告"],
  },
  {
    id: "portal",
    title: "会员成长空间",
    desc: "每一位会员都拥有自己的成长空间：时间轴记录、成长勋章、阶段回顾、成长分享。",
    features: ["成长时间轴", "成长勋章系统", "阶段回顾", "成长分享页"],
  },
];

export default function EcosystemSection() {
  return (
    <section id="ecosystem" className="max-w-5xl mx-auto px-6 py-32 md:py-40 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-24">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>产品</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">一个完整的成长生态</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">三套系统协同工作，从教练到会员，从记录到反馈。</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-12 md:gap-16">
        {SECTIONS.map((s) => (
          <motion.div
            key={s.id}
            {...MICRO.scrollReveal}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            className="flex flex-col"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium mb-4" style={{ color: COLORS.primary }}>{s.title}</p>
            <p className="text-sm text-[#3E2723] leading-[1.9] mb-6 max-w-[34em]">{s.desc}</p>
            <div className="space-y-2">
              {s.features.map((f) => (
                <div key={f} className="text-xs text-[#6E6E73] flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.primary }} />
                  {f}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
