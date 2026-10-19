"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";
import { displayName } from "@/lib/display-name";

const RAW_STORIES = [
  {
    name: "李女士",
    role: "儿科医生",
    stage: "长期成长",
    days: 420,
    trainingCount: 87,
    quote: "最大的变化不是体重，而是每天早上照镜子时对自己的认可。",
    joinedAt: "2025-04-01",
  },
  {
    name: "张女士",
    role: "中学教师",
    stage: "稳定成长",
    days: 330,
    trainingCount: 63,
    quote: "十一年伏案工作留下的肩颈问题，终于在这里找到了答案。",
    joinedAt: "2025-07-01",
  },
  {
    name: "陈女士",
    role: "设计师",
    stage: "长期成长",
    days: 280,
    trainingCount: 54,
    quote: "训练不是惩罚自己的身体，而是学会与它相处。这个认知改变了一切。",
    joinedAt: "2025-09-01",
  },
];

const TEASER_STORIES = RAW_STORIES.map((s) => ({
  ...s,
  displayName: s.name,
}));

export default function StoriesTeaserSection() {
  return (
    <section id="stories" className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-16"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8"
          style={{ color: COLORS.primary }}
        >
          成长故事
        </p>
        <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] tracking-normal mb-4">
          每一次坚持
        </h2>
        <p className="text-sm text-[#4A4A4A] max-w-prose mx-auto">
          这些记录，来自真实训练与长期坚持。
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid md:grid-cols-3 gap-6 mb-12"
      >
        {TEASER_STORIES.map((story) => (
          <motion.article
            key={story.name}
            variants={staggerItem}
            className="rounded-[2rem] p-7 relative overflow-hidden transition-all"
            style={{
              background:
                "linear-gradient(160deg, #FFFFFF 0%, #FAFAFA 60%, #F7F1EA 100%)",
              boxShadow: "0 4px 20px rgba(62,39,35,0.05)",
            }}
            whileHover={{ y: -6, boxShadow: "0 12px 40px rgba(62,39,35,0.1)" }}
          >
            <div className="mb-4">
              <p className="text-[10px] tracking-widest uppercase font-medium mb-1" style={{ color: COLORS.primary }}>
                {story.role}
              </p>
              <h3 className="font-semibold text-[#1A1A1A] tracking-normal">
                {story.displayName}
              </h3>
              <p className="text-[10px] text-[#4A4A4A]">{story.stage}</p>
            </div>

            <div className="flex gap-4 mb-4">
              <div>
                <span className="text-lg font-semibold text-[#1A1A1A] tracking-[-0.02em]">
                  {Math.round(story.days / 30)}
                </span>
                <span className="text-xs text-[#4A4A4A] ml-1">个月</span>
              </div>
              <div>
                <span className="text-lg font-semibold text-[#1A1A1A] tracking-[-0.02em]">
                  {story.trainingCount}
                </span>
                <span className="text-xs text-[#4A4A4A] ml-1">次</span>
              </div>
            </div>

            <blockquote className="text-sm text-[#1A1A1A] leading-[1.8] italic border-l-2 pl-3 border-0">
              &ldquo;{story.quote}&rdquo;
            </blockquote>
          </motion.article>
        ))}
      </motion.div>

      <div className="text-center">
        <Link
          href="/stories"
          className="inline-block px-6 py-3 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: COLORS.primary,
            color: "white",
            boxShadow: `0 4px 20px ${COLORS.primary}30`,
          }}
        >
          查看全部故事
        </Link>
      </div>
    </section>
  );
}
