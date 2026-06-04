"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Report {
  id: number;
  memberId: number;
  reportType: string;
  content: string;
  generatedAt: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  daily:    { label: "每日关怀", dotColor: "bg-[#9E8E7E]",   bgColor: "bg-[#FAF7F2]",   textColor: "text-[#9E8E7E]" },
  weekly:   { label: "周报",     dotColor: "bg-emerald-400",  bgColor: "bg-emerald-50",  textColor: "text-emerald-700" },
  "15days": { label: "15日总结", dotColor: "bg-[#9E8E7E]",     bgColor: "bg-[#FAF7F2]",     textColor: "text-[#9E8E7E]" },
  monthly:  { label: "月报",     dotColor: "bg-[#3E2723]",     bgColor: "bg-[#FAF7F2]",     textColor: "text-[#3E2723]" },
  quarterly:{ label: "季度总结", dotColor: "bg-amber-400",    bgColor: "bg-amber-50",    textColor: "text-amber-700" },
  semiyearly:{ label: "半年总结",dotColor: "bg-orange-400",   bgColor: "bg-orange-50",   textColor: "text-orange-700" },
  yearly:   { label: "年度总结", dotColor: "bg-rose-400",     bgColor: "bg-rose-50",     textColor: "text-rose-700" },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || { label: type, dotColor: "bg-[#9E8E7E]", bgColor: "bg-[#FAF7F2]", textColor: "text-[#9E8E7E]" };
}

export default function FeedbackTimeline({ memberId }: { memberId: number }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/ai/period-report?memberId=${memberId}`)
      .then((r) => r.json())
      .then((data: Report[]) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.generatedAt || b.createdAt).getTime() - new Date(a.generatedAt || a.createdAt).getTime()
        );
        setReports(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6 mb-6">
        <h2 className="font-serif text-lg text-[#3E2723] mb-4">反馈记录</h2>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-[#FAF7F2] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6 mb-6">
        <h2 className="font-serif text-lg text-[#3E2723] mb-4">反馈记录</h2>
        <p className="text-sm text-[#9E8E7E]">暂无反馈记录</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6 mb-6">
      <h2 className="font-serif text-lg text-[#3E2723] mb-4">反馈记录</h2>

      <div className="relative">
        {/* 左侧渐变时间轴 */}
        <div
          className="absolute left-[11px] top-2 bottom-2 w-px"
          style={{
            background: "linear-gradient(180deg, rgba(139,94,60,0.4) 0%, #E8E0D5 50%, transparent 100%)",
          }}
        />

        <div className="space-y-5">
          {reports.map((report, i) => {
            const config = getConfig(report.reportType);
            const isExpanded = expandedId === report.id;
            const dateStr = (report.generatedAt || report.createdAt || "").slice(0, 16).replace("T", " ");

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                className="relative pl-8"
              >
                {/* 升级节点：外圈 + 内点 */}
                <div className="absolute left-1 top-1.5">
                  <div className="w-[10px] h-[10px] rounded-full border-2 border-white ring-2 ring-[#8B5E3C]/10">
                    <div className={`w-full h-full rounded-full ${config.dotColor}`} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* 类型 + 日期 */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${config.bgColor} ${config.textColor}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-[#9E8E7E]">{dateStr}</span>
                  </div>

                  {/* 展开动画 */}
                  <AnimatePresence mode="wait">
                    {isExpanded ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 bg-[#FAF7F2] border border-[#E8E0D5] rounded-lg text-sm text-[#3E2723] whitespace-pre-wrap leading-relaxed">
                          {report.content}
                        </div>
                        <button
                          onClick={() => setExpandedId(null)}
                          className="mt-1 text-xs text-[#9E8E7E] hover:text-[#3E2723] underline"
                        >
                          收起
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setExpandedId(report.id)}
                        className="text-sm text-[#9E8E7E] text-left hover:text-[#3E2723] transition-colors"
                      >
                        {report.content?.slice(0, 80)}
                        {(report.content?.length ?? 0) > 80 ? "..." : ""}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
