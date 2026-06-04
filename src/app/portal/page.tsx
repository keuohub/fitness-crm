"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import Link from "next/link";
import InstallPrompt from "@/components/portal/InstallPrompt";
import { usePortalMember } from "@/context/PortalMemberContext";
import { useGrowthEvents } from "@/hooks/useGrowthEvents";
import { getRecentEvents } from "@/lib/member-growth";
import { daysSince } from "@/lib/member-level";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import DailyMotivation from "@/components/portal/DailyMotivation";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { heroReveal, fadeUp, DURATION, MICRO } from "@/lib/design/motion-presets";
import { matchGrowthMessages, getAnniversaryMessage } from "@/lib/growth-message-library";
import { computeNextMilestone } from "@/lib/next-milestone";
import { useState, useEffect } from "react";

function HeroGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[40rem] h-[80vw] max-h-[40rem] rounded-full opacity-30"
        style={{ background: "radial-gradient(ellipse, rgba(139,94,60,0.06) 0%, transparent 65%)", animation: "pulse 6s ease-in-out infinite" }} />
    </div>
  );
}

function getStageTitle(days: number): string {
  if (days >= 365) return "长期主义者";
  if (days >= 180) return "深度蜕变";
  if (days >= 90) return "稳定成长";
  if (days >= 30) return "习惯建立";
  return "启程";
}

interface GrowthStoryData { selfReports: { content: string; date: string }[]; milestones: { content: string; date: string }[]; }

interface SelfReport { id: number; typeLabel: string; excerpt: string; content: string; date: string; lines: string[]; }

export default function PortalHome() {
  console.log("[PortalPage] render start");
  const { member, loading: memberLoading } = usePortalMember();
  const [selfReport, setSelfReport] = useState<SelfReport | null>(null);
  const [storyData, setStoryData] = useState<GrowthStoryData | null>(null);

  useEffect(() => {
    fetch("/api/portal/latest-self-report").then((r) => r.ok ? r.json() : null).then((d) => { console.log("[PortalHome] latest-self-report:", d ? `id=${d.id}, type=${d.typeLabel}` : null); if (d) setSelfReport(d); }).catch((e) => { console.error("[PortalHome] latest-self-report fetch 失败:", e); });
  }, []);

  useEffect(() => {
    fetch("/api/portal/growth-story").then((r) => r.ok ? r.json() : null).then((d) => { console.log("[PortalHome] growth-story data:", d ? `${d.selfReports?.length||0} selfReports, ${d.milestones?.length||0} milestones` : null); if (d) setStoryData(d); }).catch((e) => { console.error("[PortalHome] growth-story fetch 失败:", e); });
  }, []);

  if (memberLoading || !member) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" /></div>;

  const { memberId, memberName, joinedAt } = member;
  console.log("[PortalHome] member:", { memberId, memberName, joinedAt });
  console.log("[PortalPage] member", member);
  const { events, loading } = useGrowthEvents(memberId, joinedAt, memberName);
  console.log("[PortalPage] loading", loading);
  const days = daysSince(joinedAt);
  const stageTitle = getStageTitle(days);
  const latestEvent = getRecentEvents(events, 1)[0];
  const previewEvents = getRecentEvents(events, 3);

  // 下一步成长目标
  const trainingCount = events.filter(e => e.type === "training").length;
  const photoEvents = events.filter(e => e.type === "photo");
  const lastPhotoDate = photoEvents.length > 0
    ? [...photoEvents].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : null;
  const daysSinceLastPhoto = lastPhotoDate
    ? Math.floor((Date.now() - new Date(lastPhotoDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const nextMilestone = computeNextMilestone({ trainingCount, daysSinceJoin: days, daysSinceLastPhoto });

  const ANNIVERSARIES = [30, 90, 180, 365, 1095, 1825];
  const isAnniversary = ANNIVERSARIES.includes(days);
  const anniversary = isAnniversary ? getAnniversaryMessage(days) : null;

  // 「这一刻的你」
  const memberWords = selfReport?.content
    ? selfReport.content.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(" ").filter(w => w.length >= 2)
    : [];
  const matched = matchGrowthMessages(memberWords);

  // ── 三段式成长叙事：earliest / 90d / latest ──
  function buildThreeStageNarrative(): { earliest: string; middle: string; latest: string } | null {
    if (!storyData) return null;
    const all = [...storyData.selfReports, ...storyData.milestones];
    if (all.length < 2) return null;
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));

    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    // 找最接近90天的那条
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const baseDate = earliest.date ? new Date(earliest.date).getTime() : Date.now();
    const targetMs = baseDate + ninetyDaysMs;
    let middle = sorted[Math.floor(sorted.length / 2)];
    let bestDist = Infinity;
    for (const r of sorted) {
      const d = r.date ? Math.abs(new Date(r.date).getTime() - targetMs) : Infinity;
      if (d < bestDist) { bestDist = d; middle = r; }
    }

    const pickLine = (r: typeof earliest) => {
      const lines = (r.content || "").split("\n").filter(Boolean);
      return lines[0] || r.content?.slice(0, 40) || "";
    };

    return { earliest: pickLine(earliest), middle: pickLine(middle), latest: pickLine(latest) };
  }

  const threeStage = buildThreeStageNarrative();
  const hasLargeData = storyData && (storyData.selfReports.length + storyData.milestones.length) >= 2;

  // ── 最骄傲的事 ──
  const proudLine = storyData?.milestones.find(m => m.content.includes("第一次") || m.content.includes("突破") || m.content.includes("周年") || m.content.includes("坚持"))?.content?.split("\n")[0]?.slice(0, 60)
    || storyData?.milestones[0]?.content?.split("\n")[0]?.slice(0, 60)
    || null;

  // ── 未来目标 ──
  const futureGoal = selfReport?.lines?.find(l => l.includes("尝试") || l.includes("希望") || l.includes("目标") || l.includes("下一次"))?.slice(0, 60)
    || selfReport?.lines?.[selfReport.lines.length - 1]?.slice(0, 60)
    || null;

  return (
    <>
      <PortalHeader />
      <div className="space-y-12 max-w-lg mx-auto">

        {/* ═════ Hero · 长期陪伴 ═════ */}
        <motion.section variants={heroReveal} initial="hidden" animate="visible" className="relative pt-6 pb-2">
          <HeroGlow />
          <div className="relative z-10">
            <motion.p variants={heroReveal} className="text-[11px] uppercase tracking-[0.3em] font-medium mb-6" style={{ color: COLORS.primary }}>我的旅程</motion.p>
            <motion.h1 variants={heroReveal} className="font-serif text-4xl font-bold text-[#3E2723] leading-tight">
              {memberName}
            </motion.h1>
            <motion.p variants={heroReveal} className="text-lg text-[#9E8E7E] mt-3 font-serif">
              一起走过了 {days} 天
            </motion.p>
            <motion.p variants={heroReveal} className="text-sm text-[#9E8E7E] mt-1">
              {stageTitle === "启程" ? "故事刚开始，每一页都值得期待。" :
               stageTitle === "习惯建立" ? "最难的一个月已经过去了。" :
               stageTitle === "稳定成长" ? "训练不再是被提醒的事，是你主动想来。" :
               stageTitle === "深度蜕变" ? "当朋友说'你好像不一样了'，你淡淡一笑。" :
               "坚持已经变成你是谁的一部分。"}
            </motion.p>
            {anniversary && (
              <motion.div variants={heroReveal} className="mt-6 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(139,94,60,0.06), rgba(62,39,35,0.04))" }}>
                <p className="text-xs tracking-widest uppercase font-medium mb-2" style={{ color: COLORS.primary }}>{anniversary.title}</p>
                <p className="text-sm text-[#3E2723] leading-relaxed">{anniversary.subtitle}</p>
                <p className="text-xs italic text-[#9E8E7E] mt-3">&ldquo;{anniversary.coachWord}&rdquo; ——小桥</p>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* ═════ 每日一语 ═════ */}
        <DailyMotivation stageTitle={stageTitle} />

        {/* ═════ 下一步 ═════ */}
        {nextMilestone && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>下一步</p>
            <GlassCard padding="md" hover={false} className="relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-[0.08]" style={{ backgroundColor: COLORS.primary }} />
              <div className="relative z-10">
                <p className="font-serif text-lg font-bold text-[#3E2723] mb-1">{nextMilestone.title}</p>
                <p className="text-sm text-[#9E8E7E] leading-relaxed">{nextMilestone.subtitle}</p>
                <div className="mt-4 w-full h-[3px] rounded-full bg-[#EDE8E2] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(nextMilestone.progress * 100)}%`, backgroundColor: COLORS.primary }} />
                </div>
              </div>
            </GlassCard>
          </motion.section>
        )}

        {/* ═════ 三段式成长叙事 ═════ */}
        {hasLargeData && threeStage && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-8" style={{ color: COLORS.primary }}>这一路</p>
            <div className="space-y-6 font-serif text-[#3E2723] leading-loose">
              <div>
                <p className="text-xs text-[#9E8E7E] mb-1">最初</p>
                <p className="text-lg italic">&ldquo;{threeStage.earliest}&rdquo;</p>
              </div>
              <div className="pt-4">
                <p className="text-xs text-[#9E8E7E] mb-1">90天时</p>
                <p className="text-lg italic">&ldquo;{threeStage.middle}&rdquo;</p>
              </div>
              <div className="pt-4">
                <p className="text-xs text-[#9E8E7E] mb-1">现在</p>
                <p className="text-xl italic" style={{ color: COLORS.primary }}>&ldquo;{threeStage.latest}&rdquo;</p>
              </div>
              <p className="text-sm text-[#9E8E7E] pt-6">
                时间不说话，但都留下了痕迹。
              </p>
            </div>
          </motion.section>
        )}

        {/* ═════ 最值得骄傲的事 ═════ */}
        {proudLine && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>最值得骄傲的事</p>
            <GlassCard padding="lg" hover={false} className="text-center relative overflow-hidden">
              <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.08]" style={{ backgroundColor: COLORS.primary }} />
              <p className="font-serif text-lg text-[#3E2723] leading-relaxed relative z-10">&ldquo;{proudLine}&rdquo;</p>
            </GlassCard>
          </motion.section>
        )}

        {/* ═════ 这一刻的你 ═════ */}
        {matched && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>这一刻的你</p>
            <GlassCard padding="lg" hover={false} className="text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-[0.07]" style={{ backgroundColor: COLORS.primary }} />
              <p className="font-serif text-xl text-[#3E2723] leading-relaxed relative z-10">&ldquo;{matched.reflection}&rdquo;</p>
              <p className="text-xs text-[#9E8E7E] mt-4 relative z-10">—— {matched.category}的痕迹</p>
            </GlassCard>
          </motion.section>
        )}

        {/* ═════ 最近一次记录 ═════ */}
        {selfReport && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>最近一次记录</p>
            <Link href="/portal/growth">
              <GlassCard padding="lg" className="relative overflow-hidden" hover={true}>
                <div className="absolute -top-8 -left-8 w-20 h-20 rounded-full blur-2xl opacity-15" style={{ backgroundColor: COLORS.primary }} />
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-widest font-medium mb-3" style={{ color: COLORS.primary }}>{selfReport.typeLabel}</p>
                  <p className="text-sm text-[#3E2723] leading-relaxed mb-3">&ldquo;{selfReport.excerpt}&rdquo;</p>
                  <p className="text-[10px] text-[#9E8E7E]">{selfReport.date} 记录</p>
                </div>
              </GlassCard>
            </Link>
          </motion.section>
        )}

        {/* ═════ 未来的一封信 ═════ */}
        {futureGoal && (
          <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>未来的一封信</p>
            <GlassCard padding="lg" hover={false} className="text-center relative overflow-hidden">
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-[0.06]" style={{ backgroundColor: "#3E2723" }} />
              <p className="font-serif text-sm text-[#9E8E7E] leading-relaxed mb-3 relative z-10">你曾希望在接下来的日子里——</p>
              <p className="font-serif text-lg italic text-[#3E2723] leading-relaxed relative z-10">&ldquo;{futureGoal}&rdquo;</p>
              <p className="text-xs text-[#9E8E7E] mt-4 relative z-10">我们会陪你一起实现。</p>
            </GlassCard>
          </motion.section>
        )}

        {/* ═════ 最近时刻 ═════ */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>最近时刻</p>
          {loading ? (
            <div className="h-28 rounded-3xl animate-pulse bg-white" style={{ boxShadow: "0 4px 20px rgba(62,39,35,0.04)" }} />
          ) : latestEvent ? (
            <GlassCard padding="lg" className="flex flex-col items-center text-center relative overflow-hidden" hover={false}>
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-25" style={{ backgroundColor: COLORS.primary }} />
              <p className="font-serif text-xl font-bold text-[#3E2723] mb-2 relative z-10">{latestEvent.title}</p>
              <p className="text-sm text-[#9E8E7E] relative z-10">{latestEvent.date}</p>
            </GlassCard>
          ) : (
            <GlassCard padding="lg" className="text-center" hover={false}><p className="text-sm text-[#9E8E7E]">等待第一次成长记录</p></GlassCard>
          )}
        </motion.section>

        {/* ═════ 成长旅程 ═════ */}
        <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <div className="flex items-center justify-between mb-8">
            <p className="font-serif text-lg font-bold text-[#3E2723]">成长旅程</p>
            <Link href="/portal/growth" className="text-sm hover:underline" style={{ color: COLORS.primary }}>查看全部</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
          ) : previewEvents.length === 0 ? (
            <GlassCard padding="lg" className="text-center" hover={false}><p className="text-sm text-[#9E8E7E]">暂无记录</p></GlassCard>
          ) : (
            <div className="relative">
              <div className="absolute left-2 top-2 bottom-2 w-[1px]" style={{ background: `linear-gradient(180deg, rgba(139,94,60,0.25) 0%, ${COLORS.border} 70%, transparent 100%)` }} />
              <div className="space-y-5">
                {previewEvents.map((event, i) => {
                    const isMilestone = event.type === "milestone";
                    return (
                  <motion.div key={event.id} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: DURATION.fast, delay: i * 0.08 }} className="relative pl-8 group">
                    <div className="absolute left-[2px] top-2 rounded-full group-hover:scale-125 transition-transform"
                      style={{
                        width: isMilestone ? "9px" : "6px",
                        height: isMilestone ? "9px" : "6px",
                        backgroundColor: isMilestone ? COLORS.primary : "#D1C8C0",
                        boxShadow: isMilestone ? `0 0 0 3px ${COLORS.primary}20` : "none",
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
      <InstallPrompt />
    </>
  );
}
