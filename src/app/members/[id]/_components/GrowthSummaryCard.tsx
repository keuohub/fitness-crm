"use client";

import { motion } from "framer-motion";
import { generateBadges, type Badge } from "@/lib/member-badges";
import BadgeCard from "./BadgeCard";

interface Props {
  joinedAt?: string;
  trainingCount: number;
  questionnaireCount: number;
  photoCount: number;
  feedbackCount: number;
  consecutiveTrainingDays: number;
}

/** 计算加入天数 */
function daysSince(joinedAt: string | undefined): number | null {
  if (!joinedAt) return null;
  const d = new Date(joinedAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** 成长阶段 */
function getStage(days: number): { label: string; color: string; progress: number } {
  if (days <= 30)
    return { label: "启程阶段", color: "bg-[#8B5E3C]", progress: 0.15 };
  if (days <= 90)
    return { label: "习惯建立", color: "bg-[#8B5E3C]", progress: 0.35 };
  if (days <= 180)
    return { label: "稳定成长", color: "bg-[#3E2723]", progress: 0.65 };
  return { label: "长期蜕变", color: "bg-[#3E2723]", progress: 0.9 };
}

const statConfig = [
  { key: "trainingCount", label: "训练次数", icon: "🏋️" },
  { key: "questionnaireCount", label: "问卷次数", icon: "📋" },
  { key: "photoCount", label: "照片次数", icon: "📸" },
  { key: "feedbackCount", label: "阶段记录", icon: "🤖" },
] as const;

export default function GrowthSummaryCard({
  joinedAt,
  trainingCount,
  questionnaireCount,
  photoCount,
  feedbackCount,
  consecutiveTrainingDays,
}: Props) {
  const days = daysSince(joinedAt);
  const stage = days ? getStage(days) : null;
  const badges: Badge[] = generateBadges({
    joinedAt,
    trainingCount,
    questionnaireCount,
    photoCount,
    consecutiveTrainingDays,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-3xl border border-[#E8E0D5] p-6 mb-6 overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FDF9F5 40%, #FAF7F2 100%)",
      }}
    >
      {/* 装饰光晕 */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#8B5E3C]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* 头部：天数 + 阶段 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-[#9E8E7E] uppercase tracking-wider">成长档案</p>
            {days !== null ? (
              <p className="text-3xl font-bold text-[#3E2723] mt-1">
                加入徕舞 <span className="text-[#8B5E3C]">{days}</span> 天
              </p>
            ) : (
              <p className="text-2xl font-bold text-[#3E2723] mt-1">徕舞会员</p>
            )}
          </div>
          {stage && (
            <div className="shrink-0">
              <p className="text-xs text-[#9E8E7E] mb-1">成长阶段</p>
              <span className={`text-sm font-medium px-3 py-1 rounded-full text-white ${stage.color}`}>
                {stage.label}
              </span>
            </div>
          )}
        </div>

        {/* 进度条 */}
        {stage && (
          <div className="mb-5">
            <div className="w-full h-1.5 bg-[#E8E0D5] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${stage.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${stage.progress * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* 四列数据 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {statConfig.map(({ key, label, icon }, i) => {
            const counts: Record<string, number> = {
              trainingCount,
              questionnaireCount,
              photoCount,
              feedbackCount,
            };
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                className="text-center"
              >
                <p className="text-lg mb-0.5">{icon}</p>
                <p className="text-2xl font-bold text-[#3E2723]">{counts[key]}</p>
                <p className="text-[10px] text-[#9E8E7E] mt-0.5">{label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* 成长勋章 */}
        <BadgeCard badges={badges} />
      </div>
    </motion.div>
  );
}
