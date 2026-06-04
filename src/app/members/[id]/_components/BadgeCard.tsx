"use client";

import { motion } from "framer-motion";
import type { Badge } from "@/lib/member-badges";

const BADGE_INITIALS: Record<string, string> = {
  "first-questionnaire": "启",
  "first-photo":         "记",
  "training-10":         "星",
  "training-50":         "恒",
  "joined-30":           "习",
  "joined-180":          "蜕",
  "streak-7":            "坚",
};

export default function BadgeCard({ badges }: { badges: Badge[] }) {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      className="rounded-3xl p-6 bg-white"
      style={{ border: "1px solid #E8E0D5" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-base text-[#3E2723]">成长勋章</h3>
        <span className="text-xs text-[#9E8E7E]">
          {unlocked.length}/{badges.length} 已解锁
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {[...unlocked, ...locked].map((badge, i) => {
          const initial = BADGE_INITIALS[badge.id] || badge.name[0];
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05 * i }}
              className={`flex flex-col items-center text-center gap-1 p-2 rounded-xl transition-all ${
                badge.unlocked
                  ? "bg-[#8B5E3C]/5"
                  : "opacity-40 grayscale bg-[#FAF7F2]"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-bold ${
                  badge.unlocked
                    ? "bg-[#8B5E3C] text-white"
                    : "bg-[#E8E0D5] text-[#9E8E7E]"
                }`}
              >
                {initial}
              </div>
              <span className={`text-[10px] font-medium leading-tight ${badge.unlocked ? "text-[#3E2723]" : "text-[#9E8E7E]"}`}>
                {badge.name}
              </span>
              <span className="text-[9px] text-[#9E8E7E] leading-tight hidden sm:block">
                {badge.description}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
