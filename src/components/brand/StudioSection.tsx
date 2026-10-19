"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

const PILLARS = [
  {
    title: "训练环境",
    desc: "自然光与安静氛围。一个专注女性身体成长的空间，不嘈杂、不拥挤，每一次训练都是与自己的对话。",
  },
  {
    title: "器械系统",
    desc: "Reformer 核心床等普拉提器械。精准的训练工具，帮助身体在正确的轨道上建立力量与柔韧。",
  },
  {
    title: "长期陪伴",
    desc: "记录成长而非售卖课程。从第一次训练到每一次积累，我们关注的是时间的积累，不是单次的效果。",
  },
];

export default function StudioSection() {
  return (
    <section id="studio" className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-24"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8"
          style={{ color: COLORS.primary }}
        >
          普拉提 · 瑜伽 · 减脂管理 · 女性力量训练
        </p>
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal mb-4">
          在安静中专注
        </h2>
        <p className="text-sm text-[#4A4A4A] max-w-prose mx-auto leading-[1.7]">
          不追求热闹，只追求专注。这里是训练的空间，也是与自己相处的空间。
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-12 md:gap-16">
        {PILLARS.map((p) => (
          <motion.div
            key={p.title}
            {...MICRO.scrollReveal}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
          >
            <h3 className="text-lg font-semibold text-[#1A1A1A] tracking-normal mb-4">
              {p.title}
            </h3>
            <p className="text-sm text-[#1A1A1A] leading-[1.7] max-w-prose">
              {p.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.p
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center text-sm text-[#4A4A4A] max-w-prose mx-auto mt-20 leading-[1.7]"
      >
        服务女性会员、教练与工作室经营者。
        同时为女性运动工作室提供课程体系、教练培训、门店运营与知识服务支持。
      </motion.p>
    </section>
  );
}
