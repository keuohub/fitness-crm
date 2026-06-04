"use client";

import { motion } from "framer-motion";
import { useGrowthEvents } from "@/hooks/useGrowthEvents";
import type { GrowthEventType, GrowthEvent } from "@/types/growth";
import GrowthSummaryCard from "./GrowthSummaryCard";

// ─── Props ───

interface Props {
  memberId: number;
  memberName?: string;
  joinedAt?: string;
}

// ─── 事件类型 → 视觉配置 ───

const TYPE_CONFIG: Record<
  GrowthEventType,
  { icon: string; label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  join:          { icon: "📌", label: "加入",     dotColor: "bg-[#8B5E3C]",  bgColor: "bg-[#8B5E3C]/10", textColor: "text-[#8B5E3C]" },
  training:      { icon: "🏋️", label: "训练",     dotColor: "bg-[#3E2723]",  bgColor: "bg-[#3E2723]/10",  textColor: "text-[#3E2723]" },
  photo:         { icon: "📸", label: "照片",     dotColor: "bg-[#9E8E7E]", bgColor: "bg-[#FAF7F2]",    textColor: "text-[#9E8E7E]" },
  questionnaire: { icon: "📋", label: "问卷",     dotColor: "bg-[#8B5E3C]",  bgColor: "bg-[#8B5E3C]/10", textColor: "text-[#8B5E3C]" },
  ai_report:     { icon: "🤖", label: "阶段回顾",  dotColor: "bg-emerald-400",bgColor: "bg-emerald-50",  textColor: "text-emerald-700" },
  milestone:     { icon: "⭐", label: "里程碑",   dotColor: "bg-[#8B5E3C]",  bgColor: "bg-[#8B5E3C]/10", textColor: "text-[#8B5E3C]" },
};

// ─── 从 events 中提取统计 ───
function computeStats(events: GrowthEvent[]) {
  return {
    trainingCount: events.filter((e) => e.type === "training").length,
    questionnaireCount: events.filter((e) => e.type === "questionnaire").length,
    photoCount: events.filter((e) => e.type === "photo").length,
    feedbackCount: events.filter((e) => e.type === "ai_report").length,
  };
}

/** 从 events 中计算最长连续训练天数 */
function computeStreak(events: GrowthEvent[]): number {
  const dates = events
    .filter((e) => e.type === "training")
    .map((e) => e.date)
    .filter(Boolean);
  const uniqueDates = [...new Set(dates)].sort();

  let maxStreak = 0;
  let current = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > maxStreak) maxStreak = current;
  }
  return maxStreak;
}

// ─── 组件 ───

export default function GrowthTimeline({ memberId, memberName, joinedAt }: Props) {
  const { events, loading, error } = useGrowthEvents(memberId, joinedAt, memberName);

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-[#FAF7F2] rounded-3xl animate-pulse" />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6">
          <h2 className="font-serif text-lg text-[#3E2723] mb-4">成长记录</h2>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#FAF7F2] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 错误态 ──
  if (error) {
    return (
      <div className="space-y-6">
        <GrowthSummaryCard
          joinedAt={joinedAt}
          trainingCount={0}
          questionnaireCount={0}
          photoCount={0}
          feedbackCount={0}
          consecutiveTrainingDays={0}
        />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6">
          <h2 className="font-serif text-lg text-[#3E2723] mb-4">成长记录</h2>
          <p className="text-sm text-[#D4736A] mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#8B5E3C]/10 text-[#8B5E3C] hover:bg-[#8B5E3C]/20 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const stats = computeStats(events);
  const streak = computeStreak(events);

  // ── 空态 ──
  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <GrowthSummaryCard
          joinedAt={joinedAt}
          trainingCount={0}
          questionnaireCount={0}
          photoCount={0}
          feedbackCount={0}
          consecutiveTrainingDays={0}
        />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6">
          <h2 className="font-serif text-lg text-[#3E2723] mb-4">成长记录</h2>
          <div className="text-center py-8">
            <p className="text-sm text-[#9E8E7E]">暂无成长记录</p>
            <p className="text-xs text-[#9E8E7E] mt-1">
              添加训练、上传照片或填写问卷后，成长轨迹将在此展示
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 正常态：摘要卡 + 时间轴 ──
  return (
    <div>
      {/* 成长摘要卡 */}
      <GrowthSummaryCard
        joinedAt={joinedAt}
        trainingCount={stats.trainingCount}
        questionnaireCount={stats.questionnaireCount}
        photoCount={stats.photoCount}
        feedbackCount={stats.feedbackCount}
        consecutiveTrainingDays={streak}
      />

      {/* 时间轴 */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6">
        <h2 className="font-serif text-lg text-[#3E2723] mb-4">成长记录</h2>

        <div className="relative">
          <div
            className="absolute left-[11px] top-2 bottom-2 w-px"
            style={{
              background:
                "linear-gradient(180deg, rgba(139,94,60,0.4) 0%, #E8E0D5 50%, transparent 100%)",
            }}
          />

          <div className="space-y-5">
            {events.map((event, i) => {
              const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.milestone;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                  className="relative pl-8"
                >
                  <div className="absolute left-1 top-1.5">
                    <div className="w-[10px] h-[10px] rounded-full border-2 border-white ring-2 ring-[#8B5E3C]/10">
                      <div className={`w-full h-full rounded-full ${config.dotColor}`} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bgColor} ${config.textColor}`}
                      >
                        {config.icon} {config.label}
                      </span>
                      <span className="text-xs text-[#9E8E7E]">{event.date}</span>
                    </div>

                    <p className="text-sm text-[#3E2723] font-medium">{event.title}</p>

                    {event.description && (
                      <p className="text-xs text-[#9E8E7E] leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
