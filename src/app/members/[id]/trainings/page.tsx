"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Training {
  id: number;
  trainingDate: string;
  durationMinutes: number | null;
  type: string;
  focusArea: string | null;
  notes: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; dotColor: string; badgeBg: string; badgeText: string }> = {
  private:    { label: "私教",   dotColor: "bg-[#8B5E3C]", badgeBg: "bg-[#8B5E3C]/10", badgeText: "text-[#8B5E3C]" },
  group:      { label: "团课",   dotColor: "bg-[#3E2723]", badgeBg: "bg-[#3E2723]/10", badgeText: "text-[#3E2723]" },
  assessment: { label: "评估",   dotColor: "bg-[#9E8E7E]", badgeBg: "bg-[#9E8E7E]/10", badgeText: "text-[#9E8E7E]" },
};

export default function TrainingList() {
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [records, setRecords] = useState<Training[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members`).then(r => r.json()),
      fetch(`/api/trainings?memberId=${memberId}`).then(r => r.json()),
    ]).then(([membersData, tData]) => {
      const member = (membersData as { id: number; name: string }[]).find(m => m.id === memberId);
      if (member) setMemberName(member.name);
      // 按日期倒序
      const sorted = (tData as Training[]).sort(
        (a, b) => b.trainingDate.localeCompare(a.trainingDate)
      );
      setRecords(sorted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [memberId]);

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723]">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-8">
          <Link href={`/members/${memberId}`} className="text-sm text-[#9E8E7E] hover:text-[#3E2723] hover:underline transition-colors">
            ← 返回会员详情
          </Link>
          <Button asChild size="sm" className="bg-[#8B5E3C] hover:bg-[#A86545] text-white rounded-xl">
            <Link href={`/members/${memberId}/trainings/new`}>新增训练</Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold text-[#3E2723] tracking-wide">训练记录</h1>
          {memberName && (
            <p className="text-sm text-[#9E8E7E] mt-1">{memberName}</p>
          )}
        </div>

        {/* 加载态 */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          /* 空状态 */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-[#E8E0D5] p-10 shadow-sm text-center"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#8B5E3C]/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#8B5E3C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="font-serif text-lg text-[#3E2723] mb-2">还没有训练记录</h3>
            <p className="text-sm text-[#9E8E7E] mb-6">记录每一次训练，见证她的进步</p>
            <Button asChild className="bg-[#8B5E3C] hover:bg-[#A86545] text-white rounded-xl">
              <Link href={`/members/${memberId}/trainings/new`}>添加第一条训练</Link>
            </Button>
          </motion.div>
        ) : (
          /* 时间轴 */
          <div className="relative">
            {/* 左侧渐变时间轴 */}
            <div
              className="absolute left-[15px] top-3 bottom-3 w-px"
              style={{
                background: "linear-gradient(180deg, rgba(139,94,60,0.4) 0%, #E8E0D5 50%, transparent 100%)",
              }}
            />

            <div className="space-y-4">
              {records.map((t, i) => {
                const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.private;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.07, ease: "easeOut" }}
                    className="relative pl-10"
                  >
                    {/* 时间轴节点 */}
                    <div className="absolute left-[10px] top-5">
                      <div className="relative">
                        <div className="w-[11px] h-[11px] rounded-full border-2 border-white ring-2 ring-[#8B5E3C]/10 bg-white">
                          <div className={`w-[7px] h-[7px] rounded-full ${config.dotColor} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />
                        </div>
                      </div>
                    </div>

                    {/* 训练卡片 */}
                    <div className="bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                      {/* 头部：日期 + 类型 + 时长 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-serif font-medium text-[#3E2723]">
                            {t.trainingDate}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${config.badgeBg} ${config.badgeText}`}>
                            {config.label}
                          </span>
                        </div>
                        {t.durationMinutes && (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xl font-bold text-[#3E2723]">{t.durationMinutes}</span>
                            <span className="text-xs text-[#9E8E7E]">min</span>
                          </div>
                        )}
                      </div>

                      {/* 内容 */}
                      <div className="space-y-2">
                        {t.focusArea && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-[#9E8E7E] shrink-0 mt-0.5">重点</span>
                            <span className="text-sm text-[#3E2723]">{t.focusArea}</span>
                          </div>
                        )}
                        {t.notes && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-[#9E8E7E] shrink-0 mt-0.5">备注</span>
                            <span className="text-sm text-[#9E8E7E] leading-relaxed">{t.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
