"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

interface Story {
  id: number;
  name: string;
  stage: string;
  days: number;
  trainingCount: number;
  quote: string;
  observation: string;
  joinedAt: string;
  tags: string[];
}

const STORIES: Story[] = [
  { id: 1, name: "微微", stage: "长期主义", days: 366, trainingCount: 48, quote: "当我开始用记录追踪成长的时候，我第一次看见了自己的进步。", observation: "她的坚持不是强迫，而是一种自然而然的生活方式。", joinedAt: "2025-06-01", tags: ["坚持", "记录"] },
  { id: 2, name: "王莉", stage: "深度蜕变", days: 365, trainingCount: 52, quote: "我以为坚持很难，后来发现只是每天做一点点。", observation: "一年完成52次训练，核心力量显著提升。", joinedAt: "2025-06-01", tags: ["产后恢复", "核心"] },
  { id: 3, name: "李婷", stage: "稳定成长", days: 200, trainingCount: 30, quote: "最让我意外的是它已经变成了我自己的事。", observation: "内在动机已经建立。", joinedAt: "2025-11-01", tags: ["减脂", "习惯"] },
  { id: 4, name: "张悦", stage: "习惯建立", days: 120, trainingCount: 24, quote: "不去反而觉得少了什么。这就是习惯吧。", observation: "成功度过了习惯建立的关键期。", joinedAt: "2026-02-01", tags: ["核心重建", "自律"] },
  { id: 5, name: "赵雪", stage: "深度蜕变", days: 280, trainingCount: 40, quote: "照片记录下来的变化，每次都不一样。", observation: "体态变化非常明显。", joinedAt: "2025-08-01", tags: ["体态矫正", "照片"] },
  { id: 6, name: "刘芳", stage: "长期主义", days: 400, trainingCount: 56, quote: "你不再需要提醒自己要坚持。它就是你。", observation: "以训练为锚点来安排生活。", joinedAt: "2025-04-01", tags: ["坚持", "蜕变"] },
];

const STAGE_FILTERS = ["全部", "启程", "习惯建立", "稳定成长", "深度蜕变", "长期主义"];

export default function StoriesPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("全部");
  const [sortBy, setSortBy] = useState<"newest" | "days" | "trainings">("newest");

  let filtered = STORIES.filter((s) => {
    const matchSearch = !search || s.name.includes(search) || s.quote.includes(search) || s.tags.some((t) => t.includes(search));
    const matchStage = stageFilter === "全部" || s.stage === stageFilter;
    return matchSearch && matchStage;
  });

  if (sortBy === "days") filtered = [...filtered].sort((a, b) => b.days - a.days);
  else if (sortBy === "trainings") filtered = [...filtered].sort((a, b) => b.trainingCount - a.trainingCount);

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723]">
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-6" style={{ color: COLORS.primary }}>Growth Stories</p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#3E2723] mb-4">她们的变化值得被看见</h1>
          <p className="text-sm text-[#9E8E7E] max-w-md mx-auto">每一次坚持，都有痕迹。</p>
        </motion.div>
      </section>

      {/* Controls */}
      <div className="max-w-[1200px] mx-auto px-6 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名、关键词..."
            className="flex-1 h-10 px-4 rounded-xl bg-white text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-10 px-3 rounded-xl bg-white text-sm text-[#3E2723] outline-none"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <option value="newest">最新</option>
            <option value="days">坚持天数</option>
            <option value="trainings">训练次数</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {STAGE_FILTERS.map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: stageFilter === stage ? COLORS.primary : "#EDE8E2",
                color: stageFilter === stage ? "white" : "#3E2723",
              }}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section className="max-w-[1200px] mx-auto px-6 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-[#9E8E7E]">没有找到匹配的故事</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((story) => (
                <motion.article
                  key={story.id}
                  variants={staggerItem}
                  layout
                  className="rounded-[2rem] p-8 relative overflow-hidden transition-all"
                  style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FDF9F5 60%, #F7F1EA 100%)", boxShadow: "0 4px 20px rgba(62,39,35,0.05)" }}
                  whileHover={{ y: -6, boxShadow: "0 12px 40px rgba(62,39,35,0.1)" }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif" style={{ backgroundColor: `${COLORS.primary}12`, color: COLORS.primary }}>
                      {story.name[0]}
                    </div>
                    <div>
                      <Link href={`/stories/${story.id}`} className="font-serif text-lg font-bold text-[#3E2723] hover:underline">{story.name}</Link>
                      <p className="text-xs text-[#9E8E7E]">{story.stage}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 mb-6">
                    <div><span className="text-2xl font-bold text-[#3E2723]">{story.days}</span><span className="text-xs text-[#9E8E7E] ml-1">天</span></div>
                    <div><span className="text-2xl font-bold text-[#3E2723]">{story.trainingCount}</span><span className="text-xs text-[#9E8E7E] ml-1">次训练</span></div>
                  </div>
                  <blockquote className="text-sm text-[#3E2723] leading-relaxed mb-4 italic border-l-2 pl-4 border-[#E8E0D5]">
                    &ldquo;{story.quote}&rdquo;
                  </blockquote>
                  <div className="flex flex-wrap gap-1.5">
                    {story.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: `${COLORS.primary}10`, color: COLORS.primary }}>{tag}</span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <footer className="py-12 text-center bg-white"><p className="text-xs text-[#9E8E7E]">徕舞成长系统 · 钟祥徕舞女子塑形</p></footer>
    </main>
  );
}
