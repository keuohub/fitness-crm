"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, slideFromRight, MICRO } from "@/lib/design/motion-presets";

const SHOWCASE = [
  {
    title: "Growth CRM",
    subtitle: "会员管理中心",
    desc: "从会员档案到训练记录，从飞书同步到周期报告。教练可以随时随地查看每一位会员的成长状态。",
    features: ["会员档案管理", "训练记录追踪", "飞书数据同步", "周期报告生成"],
    color: "#3E2723",
    imageLeft: false,
    placeholder: "CRM Dashboard Preview",
  },
  {
    title: "分析引擎",
    subtitle: "会员洞察系统",
    desc: "基于训练数据、体态照片和健康问卷，系统自动生成个性化回顾报告、成长趋势和里程碑提醒。",
    features: ["阶段回顾生成", "成长趋势分析", "里程碑自动识别", "周期总结"],
    color: COLORS.primary,
    imageLeft: true,
    placeholder: "分析引擎预览",
  },
  {
    title: "Member Portal",
    subtitle: "会员成长空间",
    desc: "每一位会员都拥有自己的成长空间：时间轴记录、成长勋章、阶段回顾、成长分享。",
    features: ["成长时间轴", "成长勋章", "阶段回顾", "成长分享"],
    color: "#6E6E73",
    imageLeft: false,
    placeholder: "Member Portal Preview",
  },
];

function PreviewCard({ title, color }: { title: string; color: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(160deg, #FDF9F5 0%, #FFF 100%)", boxShadow: "0 2px 20px rgba(62,39,35,0.06)", minHeight: 280 }}>
      {/* Mock header bar */}
      <div className="h-10 flex items-center gap-2 px-4" style={{ backgroundColor: `${color}10` }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full opacity-40" style={{ backgroundColor: color }} />
          <div className="w-2.5 h-2.5 rounded-full opacity-25" style={{ backgroundColor: color }} />
          <div className="w-2.5 h-2.5 rounded-full opacity-15" style={{ backgroundColor: color }} />
        </div>
        <span className="text-[10px] font-medium ml-2 opacity-50" style={{ color }}>{title}</span>
      </div>
      {/* Mock content */}
      <div className="p-5 space-y-3">
        <div className="h-2.5 rounded-full w-3/4 opacity-15" style={{ backgroundColor: color }} />
        <div className="h-2.5 rounded-full w-1/2 opacity-10" style={{ backgroundColor: color }} />
        <div className="h-16 rounded-xl mt-4 opacity-8" style={{ backgroundColor: `${color}10` }} />
        <div className="h-10 rounded-lg opacity-6" style={{ backgroundColor: `${color}08` }} />
      </div>
    </div>
  );
}

export default function ProductSection() {
  return (
    <section id="product" className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-20">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>产品</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">完整的成长生态</h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">三套系统协同工作，从教练到会员，从记录到反馈。</p>
      </motion.div>

      <div className="space-y-24 sm:space-y-32">
        {SHOWCASE.map((item, i) => {
          const ImageCol = (
            <motion.div
              key={`img-${i}`}
              {...MICRO.scrollReveal}
              variants={item.imageLeft ? slideFromRight : fadeUp}
              initial="hidden" whileInView="visible"
            >
              <PreviewCard title={item.placeholder} color={item.color} />
            </motion.div>
          );

          const TextCol = (
            <motion.div
              key={`txt-${i}`}
              {...MICRO.scrollReveal}
              variants={fadeUp} initial="hidden" whileInView="visible"
              className="flex flex-col justify-center"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2" style={{ color: item.color }}>{item.subtitle}</p>
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">{item.title}</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed mb-6">{item.desc}</p>
              <ul className="space-y-2">
                {item.features.map((f) => (
                  <li key={f} className="text-sm text-[#6E6E73] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          );

          return (
            <div key={item.title} className="grid md:grid-cols-2 gap-10 items-center">
              {item.imageLeft ? [ImageCol, TextCol] : [TextCol, ImageCol]}
            </div>
          );
        })}
      </div>
    </section>
  );
}
