"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface ScoreBreakdown { frequency: number; streak: number; completeness: number; photos: number; feedback: number; }
interface ScoreHistoryPoint { daysAgo: number; label: string; score: { score: number; label: string }; }
interface TrendResult { trend: string; changePercent: number; label: string; }
interface MomentumResult { score: number; label: string; recentTrainingDays: number; }
interface ConsistencyResult { score: number; label: string; trainingStreak: number; }

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

export default function MemberReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<GrowthReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ai/growth-report?memberId=${id}`)
      .then((r) => { if (!r.ok) throw new Error("加载失败"); return r.json(); })
      .then((d) => { if (d.error) throw new Error(d.error); setReport(d); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6"><Link href={`/members/${id}`} className="text-sm text-[#9E8E7E] hover:underline">-- 返回会员详情</Link></div>
        <h1 className="text-2xl font-serif tracking-wide mb-8">会员洞察</h1>

        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
        ) : error ? (
          <div className="bg-[#D4736A]/10 border border-[#D4736A]/20 rounded-2xl p-6 text-center"><p className="text-sm text-[#D4736A]">{error}</p></div>
        ) : report ? (
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center bg-white rounded-2xl p-8" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#EDE8E2" strokeWidth="8" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke={COLORS.primary} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - report.score.value / 100)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-serif text-3xl font-bold text-[#3E2723]">{report.score.value}</span>
                  <span className="text-xs text-[#9E8E7E]">分</span>
                </div>
              </div>
              <p className="text-sm" style={{ color: COLORS.primary }}>{report.score.label}</p>
            </div>

            {/* Trend / Momentum / Consistency */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "趋势", value: report.trend.label, color: report.trend.trend === "rising" ? "#16a34a" : report.trend.trend === "falling" ? "#D4736A" : "#9E8E7E", sub: (report.trend.changePercent > 0 ? "+" : "") + report.trend.changePercent + "%" },
                { label: "势能", value: report.momentum.label, color: COLORS.primary, sub: report.momentum.score + "分" },
                { label: "坚持", value: report.consistency.label, color: "#3E2723", sub: report.consistency.score + "分" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
                  <p className="text-[10px] text-[#9E8E7E] mb-1">{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-[#9E8E7E] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Score History */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <p className="text-xs font-bold text-[#3E2723] mb-3">坚持指数变化</p>
              <div className="flex items-end justify-between gap-2 h-20">
                {[...report.scoreHistory].reverse().map((p, i) => {
                  const h = Math.max(8, (p.score.score / 100) * 100);
                  return (
                    <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-[#3E2723]">{p.score.score}</span>
                      <div className="w-full rounded-t-lg" style={{ backgroundColor: i === report.scoreHistory.length - 1 ? COLORS.primary : "#EDE8E2", height: `${h}%` }} />
                      <span className="text-[9px] text-[#9E8E7E]">{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage + Summary */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-serif text-lg font-bold text-[#3E2723]">{report.stage.title}</p>
                {report.nextStage && <span className="text-xs" style={{ color: COLORS.primary }}>-- {report.nextStage.title} · {report.nextStage.daysToReach}天</span>}
              </div>
              <p className="text-sm text-[#3E2723] leading-relaxed">{report.summary}</p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <p className="text-xs font-bold text-[#3E2723] mb-4">评分详情</p>
              <div className="space-y-2">
                {BREAKDOWN_ITEMS.map((item) => {
                  const val = report.score.breakdown[item.key];
                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <span className="text-xs text-[#9E8E7E] w-16">{item.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#EDE8E2] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(val / item.max) * 100}%`, backgroundColor: COLORS.primary }} />
                      </div>
                      <span className="text-xs font-medium text-[#3E2723] w-6 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {report.strengths.length > 0 && (
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
                <p className="text-xs font-bold text-green-700 mb-3">你已经做到的事</p>
                <ul className="space-y-1 text-sm text-[#3E2723]">{report.strengths.map((s, i) => <li key={i}>+ {s}</li>)}</ul>
              </div>
            )}
            {report.risks.length > 0 && (
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
                <p className="text-xs font-bold text-[#D4736A] mb-3">值得关注的地方</p>
                <ul className="space-y-1 text-sm text-[#3E2723]">{report.risks.map((r, i) => <li key={i}>! {r}</li>)}</ul>
              </div>
            )}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <p className="text-xs font-bold text-[#3E2723] mb-3">下一步</p>
              <ol className="space-y-1 text-sm text-[#3E2723] list-decimal list-inside">{report.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
