"use client";

import PortalHeader from "@/components/portal/PortalHeader";
import { usePortalMember } from "@/context/PortalMemberContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, DURATION, MICRO } from "@/lib/design/motion-presets";

interface Report {
  id: number; memberId: number; reportType: string; content: string; generatedAt: string; createdAt: string;
}

const LABELS: Record<string, { label: string; color: string }> = {
  daily: { label: "每日", color: "#8B5E3C" }, weekly: { label: "周报", color: "#3E2723" },
  monthly: { label: "月度", color: "#8B5E3C" }, "15days": { label: "15日", color: "#9E8E7E" },
  quarterly: { label: "季度", color: "#3E2723" }, semiyearly: { label: "半年", color: "#8B5E3C" }, yearly: { label: "年度", color: "#3E2723" },
};

export default function FeedbackPage() {
  const { member, loading: memberLoading } = usePortalMember();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/ai/period-report?memberId=${member.memberId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Report[]) => setReports(data.sort((a, b) => new Date(b.generatedAt || b.createdAt).getTime() - new Date(a.generatedAt || a.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [member]);

  useEffect(() => {
    if (expandedId === null) { setReadingProgress(0); return; }
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setReadingProgress(Math.min(1, (scrollTop + clientHeight) / scrollHeight));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [expandedId]);

  if (memberLoading || !member) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (loading) {
    return (
      <>
        <PortalHeader title="本月回顾" showBack />
        <div className="max-w-lg mx-auto space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="本月回顾" showBack />
      <div className="space-y-12 max-w-lg mx-auto">
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: COLORS.primary }}>阶段回顾</p>
          <p className="font-serif text-3xl font-bold text-[#3E2723]">成长记录</p>
          <p className="text-sm text-[#9E8E7E] mt-3">每一次回顾都是对坚持的尊重</p>
        </motion.div>
        {reports.length === 0 ? (
          <GlassCard padding="lg" className="text-center" hover={false}>
            <p className="text-sm text-[#9E8E7E]">等待第一次阶段回顾</p>
            <p className="text-xs text-[#9E8E7E] mt-2">完成训练和记录后教练会为你写下阶段回顾</p>
          </GlassCard>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            {reports.map((report) => {
              const meta = LABELS[report.reportType] || { label: report.reportType, color: "#9E8E7E" };
              const isExpanded = expandedId === report.id;
              return (
                <motion.div key={report.id} variants={staggerItem}>
                  <GlassCard padding="md" onClick={() => setExpandedId(isExpanded ? null : report.id)} hover>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                        <span className="text-xs text-[#9E8E7E]">{report.generatedAt?.slice(0, 10) || report.createdAt?.slice(0, 10)}</span>
                      </div>
                      {isExpanded && readingProgress > 0 && (
                        <div className="w-16 h-[2px] rounded-full bg-[#EDE8E2] overflow-hidden">
                          <div className="h-full transition-all" style={{ width: `${readingProgress * 100}%`, backgroundColor: COLORS.primary }} />
                        </div>
                      )}
                    </div>
                    {!isExpanded ? (
                      <p className="text-sm text-[#3E2723] line-clamp-2 leading-relaxed">{report.content}</p>
                    ) : (
                      <div ref={contentRef} className="max-h-[60vh] overflow-y-auto">
                        <p className="text-sm text-[#3E2723] leading-relaxed whitespace-pre-wrap">
                          <span className="float-left font-serif text-5xl font-bold mr-2 leading-none" style={{ color: COLORS.primary }}>{report.content[0]}</span>
                          {report.content.slice(1)}
                        </p>
                      </div>
                    )}
                    {!isExpanded && report.content.length > 120 && (
                      <p className="text-xs mt-2" style={{ color: COLORS.primary }}>点击展开阅读</p>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
}
