"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import { usePortalMember } from "@/context/PortalMemberContext";
import { useGrowthEvents } from "@/hooks/useGrowthEvents";
import { getGrowthStats } from "@/lib/member-growth";
import { daysSince } from "@/lib/member-level";
import { generateBadges } from "@/lib/member-badges";
import { useMemo } from "react";
import { motion } from "framer-motion";
import BadgeCard from "@/app/members/[id]/_components/BadgeCard";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, DURATION, EASE, MICRO } from "@/lib/design/motion-presets";
import { getAnniversaryMessage } from "@/lib/growth-message-library";

const STAGES = [
  { label: "启程", maxDays: 29, color: "#8B5E3C" },
  { label: "习惯生根", maxDays: 89, color: "#8B5E3C" },
  { label: "持续成长", maxDays: 179, color: "#3E2723" },
  { label: "深度蜕变", maxDays: 364, color: "#3E2723" },
  { label: "长期主义", maxDays: Infinity, color: "#8B5E3C" },
];

function JourneyProgress({ days }: { days: number }) {
  const currentIdx = STAGES.findIndex((s) => days <= s.maxDays);
  const activeIdx = currentIdx === -1 ? STAGES.length - 1 : currentIdx;

  return (
    <div className="w-full py-4">
      <div className="flex items-center gap-0.5 relative">
        <div className="absolute inset-y-1/2 h-[2px] w-full bg-[#EDE8E2] rounded-full -translate-y-1/2" />
        <div className="absolute inset-y-1/2 h-[2px] rounded-full -translate-y-1/2 transition-all duration-700"
          style={{ width: `${((activeIdx + 1) / STAGES.length) * 100}%`, backgroundColor: COLORS.primary }} />
        {STAGES.map((stage, i) => {
          const reached = i <= activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.normal, delay: 0.3 + i * 0.1, ease: EASE.out }}
              className="flex-1 flex flex-col items-center gap-1.5 relative z-10"
            >
              <div
                className={`w-3 h-3 rounded-full transition-all ${isCurrent ? "scale-150" : ""}`}
                style={{ backgroundColor: reached ? stage.color : "#EDE8E2", boxShadow: reached ? `0 0 10px ${stage.color}30` : "none" }}
              />
              <span className={`text-[10px] font-medium transition-colors ${reached ? "text-[#3E2723]" : "text-[#9E8E7E]"}`}>
                {stage.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// 人生时间轴里程碑（以训练次数为经纬）
interface LifeMilestone { id: string; title: string; subtitle: string; achieved: boolean; color: string; emoji: string; }

function computeLifeMilestones(trainingCount: number): LifeMilestone[] {
  const tiers = [
    { count: 1, title: "初次相遇", subtitle: "第一次走进徕舞，一切从这里开始", emoji: "" },
    { count: 10, title: "开始信任身体", subtitle: "十次训练后，你开始感受到身体的回应", emoji: "" },
    { count: 30, title: "习惯成为自然", subtitle: "训练不再是任务，而是你生活的一部分", emoji: "" },
    { count: 50, title: "身体的蜕变", subtitle: "五十次之后，镜子里的自己已经不同", emoji: "" },
    { count: 100, title: "坚持的勋章", subtitle: "百次训练，这是一件值得骄傲的事", emoji: "" },
  ];
  return tiers.map((t, i) => ({
    id: `m-${t.count}`, title: t.title, subtitle: t.subtitle,
    achieved: trainingCount >= t.count,
    color: i % 2 === 0 ? COLORS.primary : "#3E2723",
    emoji: t.emoji,
  }));
}

export default function GrowthPage() {
  const { member, loading: memberLoading } = usePortalMember();
  if (memberLoading || !member) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" /></div>;

  const { memberId, memberName, joinedAt } = member;
  const { events, loading } = useGrowthEvents(memberId, joinedAt, memberName);
  const stats = getGrowthStats(events);
  const days = daysSince(joinedAt);
  const badges = generateBadges({ joinedAt, trainingCount: stats.trainingCount, questionnaireCount: stats.questionnaireCount, photoCount: stats.photoCount, consecutiveTrainingDays: stats.consecutiveTrainingDays });
  const milestones = useMemo(() => computeLifeMilestones(stats.trainingCount), [stats.trainingCount]);

  // 纪念日
  const ANNIVERSARIES = [30, 90, 180, 365, 1095, 1825];
  const isAnniversary = ANNIVERSARIES.includes(days);
  const anniversary = isAnniversary ? getAnniversaryMessage(days) : null;

  return (
    <>
      <PortalHeader title="我的旅程" showBack />
      <div className="space-y-24 max-w-lg mx-auto">
        {/* Hero */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" animate="visible">
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: COLORS.primary }}>成长旅程</p>
          <div className="text-center py-4">
            <p className="font-serif text-6xl font-bold text-[#3E2723]">{days}</p>
            <p className="text-sm text-[#9E8E7E] mt-2">天 · 陪伴徕舞</p>
            <div className="mt-6 inline-flex items-center gap-2">
              <span className="text-3xl font-bold" style={{ color: COLORS.primary }}>{days} 天</span>
              
            </div>
            {anniversary && (
              <div className="mt-5 p-4 rounded-2xl mx-auto max-w-xs" style={{ background: "linear-gradient(135deg, rgba(139,94,60,0.05), rgba(62,39,35,0.03))" }}>
                <p className="text-xs tracking-widest uppercase font-medium mb-1" style={{ color: COLORS.primary }}>{anniversary.title}</p>
                <p className="text-xs text-[#3E2723] leading-relaxed">{anniversary.subtitle}</p>
              </div>
            )}
          </div>
          <JourneyProgress days={days} />
        </motion.section>

        {/* 人生时间轴 */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="font-serif text-lg font-bold text-[#3E2723] mb-2">走过的路</p>
          <p className="text-xs text-[#9E8E7E] mb-8">每一次训练，都是一次对自己的承诺</p>
          {loading ? (
            <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
          ) : (
            <div className="relative">
              <div className="absolute left-[18px] top-3 bottom-3 w-[1px]" style={{ background: `linear-gradient(180deg, ${COLORS.primary}40 0%, ${COLORS.border} 60%, transparent 100%)` }} />
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} className="space-y-5">
                {milestones.map((m) => (
                  <motion.div key={m.id} variants={staggerItem} className="relative pl-12">
                    <div className="absolute left-[12px] top-1 w-[14px] h-[14px] rounded-full border-[3px] transition-colors"
                      style={{ backgroundColor: m.achieved ? m.color : "#EDE8E2", borderColor: m.achieved ? m.color : COLORS.border, boxShadow: m.achieved ? `0 0 12px ${m.color}20` : "none" }} />
                    <motion.div whileHover={MICRO.hoverCard}>
                      <GlassCard padding="sm" hover={false} className={m.achieved ? "" : "opacity-40"}>
                        <p className="text-sm font-bold text-[#3E2723]">{m.title}</p>
                        <p className="text-xs text-[#9E8E7E] mt-1">{m.subtitle}</p>
                        {!m.achieved && <p className="text-[10px] text-[#9E8E7E]/50 mt-1">尚未到达</p>}
                      </GlassCard>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </motion.section>

        {/* 成长勋章 */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="font-serif text-lg font-bold text-[#3E2723] mb-2">成长印记</p>
          <p className="text-xs text-[#9E8E7E] mb-6">你做到的每一件事，都值得被看见</p>
          <BadgeCard badges={badges} />
        </motion.section>

        {/* 全部记录 */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="font-serif text-lg font-bold text-[#3E2723] mb-8">时间轴</p>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
          ) : events.length === 0 ? (
            <GlassCard padding="lg" className="text-center" hover={false}><p className="text-sm text-[#9E8E7E]">旅程刚刚开始，每一次出现都会留下痕迹</p></GlassCard>
          ) : (
            <div className="relative">
              <div className="absolute left-2 top-2 bottom-2 w-[1px]" style={{ background: `linear-gradient(180deg, rgba(139,94,60,0.2) 0%, ${COLORS.border} 50%, transparent 100%)` }} />
              <div className="space-y-4">
                {events.slice(0, 30).map((event, i) => {
                    const isMilestone = event.type === "milestone";
                    return (
                  <motion.div key={event.id} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} transition={{ duration: DURATION.fast, delay: i * 0.02 }} className="relative pl-8 group">
                    <div className="absolute left-[2px] top-2 rounded-full group-hover:scale-125 transition-transform"
                      style={{
                        width: isMilestone ? "9px" : "6px",
                        height: isMilestone ? "9px" : "6px",
                        backgroundColor: isMilestone ? COLORS.primary : "#D1C8C0",
                        boxShadow: isMilestone ? `0 0 0 2px ${COLORS.primary}16` : "none",
                      }} />
                    <span className={`text-sm transition-colors ${isMilestone ? "font-bold text-[#3E2723]" : "font-normal text-[#9E8E7E]"} group-hover:text-[#8B5E3C]`}>{event.title}</span>
                    <span className="text-xs text-[#9E8E7E] ml-3">{event.date}</span>
                  </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </>
  );
}
