"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import { usePortalMember } from "@/context/PortalMemberContext";
import { useGrowthEvents } from "@/hooks/useGrowthEvents";
import { getGrowthStats } from "@/lib/member-growth";
import { generateBadges } from "@/lib/member-badges";
import { daysSince } from "@/lib/member-level";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MOTION_DURATIONS } from "@/lib/design/motion";

const DECLARATIONS: Record<string, string> = {
  "启程": "改变不需要等到明天。今天，就在这里，我已经开始了。",
  "习惯建立": "30天的坚持，不是目的地的到达，而是旅程的真正开始。",
  "稳定成长": "训练不再是任务，而是对自己的承诺。每一次出现都在雕刻新的轮廓。",
  "深度蜕变": "身体从不欺骗。半年的汗水，已经在每一寸肌肤上写下了答案。",
  "长期主义者": "一年，是一段足够长的时间让改变从外到内发生。我不是坚持了365天，我是活出了新的365天。",
};

export default function SharePage() {
  const { member, loading: memberLoading } = usePortalMember();

  if (memberLoading || !member) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { memberId, memberName, joinedAt } = member;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { events, loading } = useGrowthEvents(memberId, joinedAt, memberName);
  const stats = getGrowthStats(events);
  const days = daysSince(joinedAt);
  const badges = generateBadges({
    joinedAt,
    trainingCount: stats.trainingCount,
    questionnaireCount: stats.questionnaireCount,
    photoCount: stats.photoCount,
    consecutiveTrainingDays: stats.consecutiveTrainingDays,
  });
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const declaration = DECLARATIONS["启程"];

  return (
    <div className="space-y-16 max-w-lg mx-auto">
      <PortalHeader title="成长分享" showBack />

      {/* ── Hero Card ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: MOTION_DURATIONS.normal }}>
        <div
          className="rounded-[2rem] p-8 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #FFFFFF 0%, #FDF9F5 60%, #F7F1EA 100%)",
            boxShadow: "0 8px 40px rgba(62,39,35,0.08)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-6" style={{ color: COLORS.primary }}>
            Laiwu Journey
          </p>
          <p className="font-serif text-2xl font-bold text-[#3E2723] mb-3">{memberName}</p>
          <p className="text-5xl font-serif font-bold mb-2" style={{ color: COLORS.primary }}>
            {days}<span className="text-lg font-sans font-normal text-[#9E8E7E]"> 天</span>
          </p>
          <p className="text-sm text-[#9E8E7E]">陪伴 {days} 天</p>

          <div className="mt-8 pt-6 border-t border-[#EDE8E2]">
            <p className="text-sm text-[#3E2723] leading-relaxed italic max-w-xs mx-auto">
              &ldquo;{declaration}&rdquo;
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />
          ))}
        </div>
      ) : (
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: MOTION_DURATIONS.normal, delay: 0.1 }}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "训练次数", value: stats.trainingCount },
              { label: "问卷记录", value: stats.questionnaireCount },
              { label: "成长照片", value: stats.photoCount },
              { label: "阶段记录", value: stats.feedbackCount },
            ].map((item) => (
              <GlassCard key={item.label} padding="md" className="text-center" hover={false}>
                <p className="text-2xl font-bold text-[#3E2723]">{item.value}</p>
                <p className="text-[10px] text-[#9E8E7E] mt-1 tracking-wide">{item.label}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Badges ── */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: MOTION_DURATIONS.normal, delay: 0.15 }}>
        <GlassCard padding="md" hover={false}>
          <p className="text-xs font-bold text-[#3E2723] mb-3">
            成长勋章 {unlockedBadges.length}/{badges.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const initials: Record<string, string> = {
                "first-questionnaire": "启", "first-photo": "记", "training-10": "星",
                "training-50": "恒", "joined-30": "习", "joined-180": "蜕", "streak-7": "坚",
              };
              const initial = initials[badge.id] || badge.name[0];
              return (
                <div
                  key={badge.id}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${badge.unlocked ? "bg-[#8B5E3C] text-white" : "bg-[#EDE8E2] text-[#9E8E7E] opacity-40"}`}
                  title={badge.name}
                >
                  {initial}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
