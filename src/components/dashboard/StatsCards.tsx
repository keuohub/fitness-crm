"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

interface StatsData {
  totalMembers: number;
  activeCount: number;
  todayFeedbackCount: number;
  monthlyTrainingCount: number;
  pendingFeedbackCount: number;
}

const ALL_CARDS = [
  {
    key: "totalMembers",
    label: "总会员",
    color: "bg-[#8B5E3C]",
    textColor: "text-[#8B5E3C]",
    iconBg: "bg-[#8B5E3C]/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75-3v3m0 0v-3m0 3h-3.75m3.75 0H21" />
      </svg>
    ),
  },
  {
    key: "activeCount",
    label: "在籍会员",
    color: "bg-[#3E2723]",
    textColor: "text-[#3E2723]",
    iconBg: "bg-[#3E2723]/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    key: "todayFeedbackCount",
    label: "今日已关怀",
    color: "bg-[#8B5E3C]",
    textColor: "text-[#8B5E3C]",
    iconBg: "bg-[#8B5E3C]/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    key: "monthlyTrainingCount",
    label: "本月训练",
    color: "bg-[#9E8E7E]",
    textColor: "text-[#9E8E7E]",
    iconBg: "bg-[#9E8E7E]/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    key: "pendingFeedbackCount",
    label: "待发送关怀",
    color: "bg-[#D4736A]",
    textColor: "text-[#D4736A]",
    iconBg: "bg-[#D4736A]/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function StatsCards({ data }: { data: StatsData | null }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
      {ALL_CARDS.map((card, i) => {
        const value = (data as any)?.[card.key] as number | undefined;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{
              y: -2,
              boxShadow: "0 12px 28px rgba(62,39,35,0.10)",
            }}
            className="relative bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E8E0D5] p-5 transition-shadow duration-200 group cursor-default"
            style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}
          >
            {/* 顶部图标 */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg} mb-3 group-hover:scale-110 transition-transform duration-300`}>
              <span className={card.textColor}>{card.icon}</span>
            </div>

            {/* 中间大数字 */}
            {value !== undefined ? (
              <CountUp
                end={value}
                duration={1.2}
                separator=","
                className="text-3xl font-bold text-[#3E2723] block"
              />
            ) : (
              <p className="text-3xl font-bold text-[#3E2723]">—</p>
            )}

            {/* 底部标题 */}
            <p className="text-xs text-[#9E8E7E] mt-1.5">{card.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
