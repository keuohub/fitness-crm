"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

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
  coachName?: string;
  milestones: { date: string; title: string }[];
}

const STORIES: Record<number, Story> = {
  1: { id: 1, name: "微微", stage: "长期主义", days: 366, trainingCount: 48, quote: "当我开始用记录追踪成长的时候，我第一次看见了自己的进步。不是体重秤上的数字，而是每一次坚持都被记下来的感觉。", observation: "持续训练366天，完成了从习惯建立到长期主义的完整旅程。她的坚持不是强迫，而是一种自然而然的生活方式。她现在已经以训练为锚点来安排生活，而不是以生活为借口推掉训练。", joinedAt: "2025-06-01", tags: ["坚持", "记录"], coachName: "小桥", milestones: [{ date: "2025-06-01", title: "加入徕舞" }, { date: "2025-09-01", title: "习惯建立" }, { date: "2025-12-01", title: "稳定成长" }, { date: "2026-06-01", title: "长期主义" }] },
  2: { id: 2, name: "王莉", stage: "深度蜕变", days: 365, trainingCount: 52, quote: "我以为坚持很难，后来发现只是每天做一点点。不知不觉一年过去了，身体的变化比我想象的更明显。", observation: "一年完成52次训练，核心力量显著提升。从产后恢复到稳定训练，她的成长是逐步但确定的。第30次训练是一个关键节点，之后她的自信心明显增强了。", joinedAt: "2025-06-01", tags: ["产后恢复", "核心"], coachName: "小桥", milestones: [{ date: "2025-06-01", title: "加入徕舞" }, { date: "2025-08-01", title: "第一个月坚持" }, { date: "2025-12-01", title: "第30次训练" }, { date: "2026-06-01", title: "第52次训练" }] },
  3: { id: 3, name: "李婷", stage: "稳定成长", days: 200, trainingCount: 30, quote: "最让我意外的不是身体的变化，而是我发现自己不再需要被催着去做这件事。它已经变成了我自己的事。", observation: "从需要提醒训练到主动安排时间，从短暂的尝试到稳定的节奏。她的内在动机已经建立。", joinedAt: "2025-11-01", tags: ["减脂", "习惯"], milestones: [{ date: "2025-11-01", title: "加入徕舞" }, { date: "2026-01-01", title: "习惯建立" }, { date: "2026-05-01", title: "稳定成长" }] },
  4: { id: 4, name: "张悦", stage: "习惯建立", days: 120, trainingCount: 24, quote: "第一个月的时候我觉得好难，但第三个月开始，不去反而觉得少了什么。这就是习惯吧。", observation: "前三个月是习惯建立的关键期，她成功度过了。现在每周训练已经成为她生活的一部分。", joinedAt: "2026-02-01", tags: ["核心重建", "自律"], milestones: [{ date: "2026-02-01", title: "加入徕舞" }, { date: "2026-04-01", title: "习惯建立" }] },
  5: { id: 5, name: "赵雪", stage: "深度蜕变", days: 280, trainingCount: 40, quote: "照片拍出来的时候我才意识到变化有多大。如果只看镜子，每天看都一样。但三个月一张照片，每次都不一样。", observation: "她的成长是最适合用照片来讲述的。体态变化非常明显，从含胸驼背到挺拔舒展。照片记录是她坚持的重要动力来源。", joinedAt: "2025-08-01", tags: ["体态矫正", "照片"], milestones: [{ date: "2025-08-01", title: "加入徕舞" }, { date: "2025-11-01", title: "习惯建立" }, { date: "2026-02-01", title: "稳定成长" }, { date: "2026-05-01", title: "深度蜕变" }] },
  6: { id: 6, name: "刘芳", stage: "长期主义", days: 400, trainingCount: 56, quote: "有人说坚持一年就是长期主义。我觉得长期主义不是数字，是你不再需要提醒自己要坚持。它就是你。", observation: "超过400天的坚持，已经超越了习惯的范畴。她现在是以训练为锚点来安排生活的。教练形容她的状态是'身体和心都准备好了'。", joinedAt: "2025-04-01", tags: ["坚持", "蜕变"], milestones: [{ date: "2025-04-01", title: "加入徕舞" }, { date: "2025-07-01", title: "习惯建立" }, { date: "2025-10-01", title: "稳定成长" }, { date: "2026-01-01", title: "深度蜕变" }, { date: "2026-04-01", title: "长期主义" }] },
};

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const story = STORIES[Number(id)];

  if (!story) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <p className="text-sm text-[#9E8E7E] mb-4">故事不存在</p>
          <Link href="/stories" className="text-sm" style={{ color: COLORS.primary }}>返回故事库</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723]">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/stories" className="text-xs text-[#9E8E7E] hover:underline mb-6 inline-block">-- 故事库</Link>
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-6" style={{ color: COLORS.primary }}>{story.stage}</p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#3E2723] mb-4">{story.name}的成长故事</h1>
        </motion.div>
      </section>

      {/* Cover area */}
      <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
        className="max-w-2xl mx-auto px-6 mb-12">
        <div className="rounded-[2rem] p-10 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FDF9F5 60%, #F7F1EA 100%)", boxShadow: "0 4px 30px rgba(62,39,35,0.06)" }}>
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-serif mb-5"
            style={{ backgroundColor: `${COLORS.primary}14`, color: COLORS.primary }}>{story.name[0]}</div>
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center"><p className="text-3xl font-bold text-[#3E2723]">{story.days}</p><p className="text-xs text-[#9E8E7E]">坚持天数</p></div>
            <div className="w-px h-10 bg-[#EDE8E2]" />
            <div className="text-center"><p className="text-3xl font-bold text-[#3E2723]">{story.trainingCount}</p><p className="text-xs text-[#9E8E7E]">训练次数</p></div>
          </div>
          <p className="text-sm text-[#9E8E7E]">加入于 {story.joinedAt}</p>
        </div>
      </motion.section>

      {/* Quote */}
      <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="max-w-2xl mx-auto px-6 mb-12">
        <div className="text-center relative py-8">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-6xl font-serif text-[#EDE8E2] leading-none">&ldquo;</span>
          <p className="font-serif text-xl sm:text-2xl text-[#3E2723] leading-relaxed italic max-w-lg mx-auto relative z-10">{story.quote}</p>
        </div>
      </motion.section>

      {/* Journey Timeline */}
      <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="max-w-lg mx-auto px-6 mb-12">
        <p className="font-serif text-lg font-bold text-[#3E2723] mb-6">成长旅程</p>
        <div className="relative">
          <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: `linear-gradient(180deg, ${COLORS.primary}30, #EDE8E2 50%, transparent)` }} />
          <div className="space-y-5">
            {story.milestones.map((m, i) => (
              <div key={m.date} className="relative pl-8">
                <div className="absolute left-[2px] top-1.5 w-[7px] h-[7px] rounded-full" style={{ backgroundColor: COLORS.primary }} />
                <p className="text-sm font-medium text-[#3E2723]">{m.title}</p>
                <p className="text-xs text-[#9E8E7E]">{m.date}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Coach observation */}
      <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="max-w-lg mx-auto px-6 mb-12">
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAF7F2" }}>
          <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: COLORS.primary }}>教练观察</p>
          <p className="text-sm text-[#3E2723] leading-relaxed">{story.observation}</p>
          <p className="text-xs text-[#9E8E7E] mt-4">-- {story.coachName || "教练"}</p>
        </div>
      </motion.section>

      {/* Tags */}
      <section className="max-w-lg mx-auto px-6 pb-16">
        <div className="flex flex-wrap gap-2">
          {story.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${COLORS.primary}10`, color: COLORS.primary }}>{tag}</span>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center bg-white"><p className="text-xs text-[#9E8E7E]">徕舞成长系统 · 钟祥徕舞女子塑形</p></footer>
    </main>
  );
}
