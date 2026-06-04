"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import { usePortalMember } from "@/context/PortalMemberContext";
import { daysSince } from "@/lib/member-level";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, scaleIn, DURATION, MICRO } from "@/lib/design/motion-presets";
import { getFutureSelfMessage } from "@/lib/growth-message-library";
import { useState, useEffect } from "react";

function getStageTitle(days: number): string {
  if (days >= 365) return "长期主义者";
  if (days >= 180) return "深度蜕变";
  if (days >= 90) return "稳定成长";
  if (days >= 30) return "习惯建立";
  return "启程";
}

function getStageProgress(days: number): number {
  if (days >= 365) return 1;
  if (days >= 180) return Math.min(1, (days - 180) / 185);
  if (days >= 90) return Math.min(1, (days - 90) / 90);
  if (days >= 30) return Math.min(1, (days - 30) / 60);
  return Math.min(1, days / 30);
}

interface ArchiveData {
  totalTrainings: number;
  totalTrainingDays: number;
  totalPhotos: number;
  totalQuestionnaires: number;
  totalRecords: number;
  consecutiveMonths: number;
}

export default function MePage() {
  const { member, loading } = usePortalMember();
  const [archive, setArchive] = useState<ArchiveData | null>(null);

  useEffect(() => {
    fetch("/api/portal/archive")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setArchive)
      .catch(() => setArchive(null));
  }, []);

  if (loading || !member) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" /></div>;

  const days = daysSince(member.joinedAt);
  const stageTitle = getStageTitle(days);
  const stageProgress = getStageProgress(days);
  const initial = (member.memberName || "徕")[0];
  const joinedDate = member.joinedAt || "";

  const archiveItems = archive ? [
    { label: "累计训练", value: `${archive.totalTrainings} 次` },
    { label: "训练天数", value: `${archive.totalTrainingDays} 天` },
    { label: "连续月份", value: `${archive.consecutiveMonths} 个月` },
    { label: "成长记录", value: `${archive.totalRecords} 条` },
    { label: "陪伴天数", value: `${days} 天` },
  ] : null;

  const futureSelf = getFutureSelfMessage(stageTitle);

  return (
    <>
      <PortalHeader title="我的" showBack />
      <div className="space-y-12 max-w-lg mx-auto px-5 pb-20">
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ duration: DURATION.slow, ease: [0.25, 0.1, 0.25, 1.0] }}>
          <div className="rounded-[2rem] p-8 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FDF9F5 60%, #F7F1EA 100%)", boxShadow: "0 8px 40px rgba(62,39,35,0.08), 0 2px 8px rgba(62,39,35,0.04)" }}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-serif mb-5" style={{ backgroundColor: `${COLORS.primary}14`, color: COLORS.primary }}>{initial}</div>
              <h2 className="font-serif text-2xl font-bold text-[#3E2723]">{member.memberName}</h2>
              <p className="text-sm text-[#9E8E7E] mt-1">{joinedDate ? `加入于 ${joinedDate}` : ""}</p>
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-[#EDE8E2]">
                <div className="text-center"><p className="text-2xl font-bold text-[#3E2723]">{days}</p><p className="text-[10px] text-[#9E8E7E] mt-1">天</p></div>
              </div>
              <div className="mt-5 w-full h-2 rounded-full bg-[#EDE8E2] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stageProgress * 100}%`, backgroundColor: COLORS.primary }} />
              </div>
            </div>
          </div>
        </motion.div>

        {archiveItems && (
          <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
            <GlassCard padding="md" hover={false}>
              <p className="text-xs font-bold text-[#3E2723] mb-5 tracking-widest uppercase">坚持档案</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {archiveItems.map((item) => (
                  <div key={item.label}>
                    <span className="text-2xl font-bold text-[#3E2723]">{item.value.split(" ")[0]}</span>
                    <span className="text-[11px] text-[#9E8E7E] leading-none ml-0.5">{item.value.split(" ")[1] || ""}</span>
                    <div className="text-[10px] text-[#8B5E3C]/60 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
          <p className="text-[11px] uppercase tracking-[0.25em] font-medium mb-6" style={{ color: COLORS.primary }}>写给未来的自己</p>
          <GlassCard padding="lg" hover={false} className="text-center relative overflow-hidden">
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-[0.06]" style={{ backgroundColor: "#3E2723" }} />
            <p className="font-serif text-sm text-[#9E8E7E] leading-relaxed relative z-10">{futureSelf}</p>
          </GlassCard>
        </motion.div>
      </div>
    </>
  );
}
