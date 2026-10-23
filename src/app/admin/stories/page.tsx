"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  BookMarked,
  Quote,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";

interface StoryMemory {
  id: number;
  memberId: number;
  content: string;
  structuredData: string | null;
  memoryType: string;
  createdAt: string;
}

type StoryStatus = "draft" | "review" | "published" | "hidden";

interface StoryItem {
  id: number;
  memberId: number;
  quote: string;
  observation: string;
  status: StoryStatus;
  createdAt: string;
}

const statusBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  published: { label: "已发布", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  draft: { label: "草稿", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  review: { label: "审核中", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  hidden: { label: "已隐藏", bg: "bg-gray-100", text: "text-gray-400", border: "border-gray-200" },
};

export default function AdminStoriesPage() {
  const { showToast } = useToast();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, hidden: 0 });

  useEffect(() => {
    fetch("/api/member-memories?type=case_study")
      .then((r) => r.json())
      .then((d) => {
        const items: StoryItem[] = (d.memories || []).map((m: StoryMemory) => {
          let observation = "";
          let status: StoryStatus = "draft";
          try {
            const parsed = JSON.parse(m.structuredData || "{}");
            observation = parsed.observation || "";
            status = parsed.status || "draft";
          } catch {}
          return {
            id: m.id,
            memberId: m.memberId,
            quote: m.content,
            observation,
            status,
            createdAt: m.createdAt,
          };
        });
        setStories(items);
        setStats({
          total: items.length,
          published: items.filter((s) => s.status === "published").length,
          draft: items.filter((s) => s.status === "draft").length,
          hidden: items.filter((s) => s.status === "hidden").length,
        });
      })
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            CASE STUDIES · 学员蜕变案例库
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">真实成长故事与案例</h1>
          <p className="text-sm text-[#697180] mt-1">
            沉淀会员在训练周期内的真实心声、导师观察记录与阶段性里程碑故事。
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">全部案例</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">{stats.total}</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">已发布对外</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">{stats.published}</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">草稿待整理</div>
          <div className="text-2xl font-bold text-gray-500 mt-1.5 tabular-nums">{stats.draft}</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">内部归档</div>
          <div className="text-2xl font-bold text-gray-400 mt-1.5 tabular-nums">{stats.hidden}</div>
        </div>
      </div>

      {/* Stories List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
            正在读取案例库...
          </div>
        ) : stories.length === 0 ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
            <BookMarked className="w-10 h-10 text-gray-300 mb-2" />
            <span className="font-semibold text-[#292D35]">暂无入库案例</span>
            <span className="text-xs text-[#697180] mt-1">可在会员主档案中为学员标记成长故事与洞察。</span>
          </div>
        ) : (
          stories.map((story) => {
            const badge = statusBadge[story.status] || {
              label: story.status,
              bg: "bg-gray-100",
              text: "text-gray-500",
              border: "border-gray-200",
            };

            return (
              <div
                key={story.id}
                className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded">
                      #LW{story.memberId}
                    </span>
                    <span className="text-xs text-[#697180] tabular-nums">
                      记录于 {String(story.createdAt || "").slice(0, 10)}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] border-l-4 border-[#2563EB] rounded-r-lg space-y-1">
                  <div className="text-xs font-medium text-[#697180] flex items-center gap-1">
                    <Quote className="w-3.5 h-3.5 text-[#2563EB]" /> 学员原话心声：
                  </div>
                  <p className="text-xs text-[#292D35] leading-relaxed">
                    {story.quote}
                  </p>
                </div>

                {story.observation && (
                  <div className="text-xs text-[#697180] leading-relaxed">
                    <strong className="text-[#292D35]">导师观察：</strong>
                    {story.observation}
                  </div>
                )}

                <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-end">
                  <Link
                    href={`/admin/members?memberId=${story.memberId}`}
                    className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                  >
                    前往会员主档案 <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
