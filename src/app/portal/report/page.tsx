"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import { usePortalMember } from "@/context/PortalMemberContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, DURATION, MICRO } from "@/lib/design/motion-presets";

interface ScoreBreakdown { frequency: number; streak: number; completeness: number; photos: number; feedback: number; }
interface ScoreHistoryPoint { daysAgo: number; label: string; score: { score: number; label: string }; }
interface TrendResult { trend: string; changePercent: number; label: string; }
interface MomentumResult { score: number; label: string; recentTrainingDays: number; recentEvents: number; }
interface ConsistencyResult { score: number; label: string; trainingStreak: number; recordStreak: number; feedbackStreak: number; }

interface GrowthReportData {
  memberName: string; generatedAt: string; daysSinceJoin: number;
  stage: { id: string; title: string; description: string };
  nextStage: { title: string; daysToReach: number } | null;
  score: { value: number; label: string; breakdown: ScoreBreakdown };
  summary: string; strengths: string[]; risks: string[]; recommendations: string[];
  scoreHistory: ScoreHistoryPoint[]; trend: TrendResult;
  momentum: MomentumResult; consistency: ConsistencyResult;
}

const BREAKDOWN_ITEMS = [
  { key: "frequency", label: "训练频率", max: 30 },
  { key: "streak", label: "连续天数", max: 20 },
  { key: "completeness", label: "档案完整", max: 20 },
  { key: "photos", label: "照片记录", max: 15 },
  { key: "feedback", label: "阶段记录", max: 15 },
] as const;

export default function ReportPage() {
  const { member, loading: memberLoading } = usePortalMember();
  const [report, setReport] = useState<GrowthReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/ai/growth-report?memberId=${member.memberId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !d.error) setReport(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [member]);

  if (memberLoading || !member) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <PortalHeader title="本月回顾" showBack />
      <div className="space-y-14 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
        ) : !report ? (
          <GlassCard padding="lg" className="text-center" hover={false}>
            <p className="text-sm text-[#9E8E7E]">暂无本月回顾</p>
            <p className="text-xs text-[#9E8E7E] mt-2">记录训练和问卷后可查看回顾</p>
          </GlassCard>
        ) : (
          <>
            {/* ── Score Ring ── */}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" animate="visible" className="text-center">
              <div className="relative w-40 h-40 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#EDE8E2" strokeWidth="10" />
                  <motion.circle cx="80" cy="80" r="70" fill="none" stroke={COLORS.primary}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 70}
                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - report.score.value / 100) }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1.0] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-serif text-4xl font-bold text-[#3E2723]">{report.score.value}</span>
                  <span className="text-xs text-[#9E8E7E] mt-1">坚持指数</span>
                </div>
              </div>
              <p className="text-sm mt-4" style={{ color: COLORS.primary }}>{report.score.label}</p>
            </motion.section>

            {/* ── Trend + Momentum + Consistency ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "趋势", value: report.trend.label, color: report.trend.trend === "rising" ? "#16a34a" : report.trend.trend === "falling" ? "#D4736A" : "#9E8E7E", sub: (report.trend.changePercent > 0 ? "+" : "") + report.trend.changePercent + "%" },
                { label: "势能", value: report.momentum.label, color: COLORS.primary, sub: report.momentum.score + "分" },
                { label: "坚持", value: report.consistency.label, color: "#3E2723", sub: report.consistency.score + "分" },
              ].map((item) => (
                <motion.div key={item.label} {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible"
                  className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
                  <p className="text-[10px] text-[#9E8E7E] mb-1">{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-[#9E8E7E] mt-0.5">{item.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Score History ── */}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
              <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">坚持指数变化</p>
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
                <div className="flex items-end justify-between gap-2 h-24">
                  {[...report.scoreHistory].reverse().map((p, i) => {
                    const height = Math.max(8, (p.score.score / 100) * 100);
                    return (
                      <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-[#3E2723]">{p.score.score}</span>
                        <motion.div
                          className="w-full rounded-t-lg"
                          style={{ backgroundColor: i === report.scoreHistory.length - 1 ? COLORS.primary : "#EDE8E2", height: "4px" }}
                          initial={{ height: "4px" }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                        <span className="text-[9px] text-[#9E8E7E]">{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* ── Stage ── */}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
              <GlassCard padding="lg" hover={false}>
                <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: COLORS.primary }}>成长阶段</p>
                <p className="font-serif text-2xl font-bold text-[#3E2723] mb-2">{report.stage.title}</p>
                <p className="text-sm text-[#9E8E7E] leading-relaxed">{report.stage.description}</p>
                {report.nextStage && (
                  <div className="mt-4 pt-4 border-t border-[#EDE8E2] flex items-center justify-between">
                    <span className="text-xs text-[#9E8E7E]">下一阶段：{report.nextStage.title}</span>
                    <span className="text-xs font-medium" style={{ color: COLORS.primary }}>还需 {report.nextStage.daysToReach} 天</span>
                  </div>
                )}
              </GlassCard>
            </motion.section>

            {/* ── Summary ── */}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
              <GlassCard padding="md" hover={false}>
                <p className="font-serif text-sm font-bold text-[#3E2723] mb-3">成长摘要</p>
                <p className="text-sm text-[#3E2723] leading-relaxed">{report.summary}</p>
              </GlassCard>
            </motion.section>

            {/* ── Score Breakdown ── */}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
              <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">成长详情</p>
              <div className="space-y-3">
                {BREAKDOWN_ITEMS.map((item) => {
                  const val = report.score.breakdown[item.key];
                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <span className="text-xs text-[#9E8E7E] w-16 flex-shrink-0">{item.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#EDE8E2] overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: COLORS.primary }}
                          initial={{ width: 0 }} animate={{ width: `${(val / item.max) * 100}%` }} transition={{ duration: 0.5, delay: 0.15 }} />
                      </div>
                      <span className="text-xs font-medium text-[#3E2723] w-8 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            {/* ── Strengths + Risks + Recommendations ── */}
            {report.strengths.length > 0 && (
              <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
                <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">你已经做到的事</p>
                <div className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#3E2723]"><span className="text-[#16a34a] mt-0.5">+</span><span>{s}</span></div>
                  ))}
                </div>
              </motion.section>
            )}
            {report.risks.length > 0 && (
              <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
                <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">值得关注的地方</p>
                <div className="space-y-2">
                  {report.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#3E2723]"><span className="text-[#D4736A] mt-0.5">!</span><span>{r}</span></div>
                  ))}
                </div>
              </motion.section>
            )}
            <motion.section {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
              <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">下一步</p>
              <div className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm"><span className="text-[#8B5E3C] mt-0.5 font-bold">{i + 1}.</span><span className="text-[#3E2723]">{r}</span></div>
                ))}
              </div>
            </motion.section>
          </>
        )}
      </div>
    </>
  );
}
