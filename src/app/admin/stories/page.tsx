"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

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

export default function AdminStoriesPage() {
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/sync" className="text-sm text-[#9E8E7E] hover:underline">-- 返回管理面板</Link>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-2">案例库</h1>
        <p className="text-sm text-[#9E8E7E] mb-8">管理成长故事 · 审核 · 发布</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "全部", value: stats.total, color: "#3E2723" },
            { label: "已发布", value: stats.published, color: "#16a34a" },
            { label: "草稿", value: stats.draft, color: "#9E8E7E" },
            { label: "隐藏", value: stats.hidden, color: "#D4736A" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#9E8E7E] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-white" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }} />)}</div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
            <p className="text-sm text-[#9E8E7E]">暂无案例</p>
            <p className="text-xs text-[#9E8E7E] mt-2">在会员详情页可保存成长故事</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-2xl p-5"
                style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: story.status === "published" ? "#16a34a" : story.status === "hidden" ? "#D4736A" : "#9E8E7E" }}>
                      {story.status === "published" ? "已发布" : story.status === "hidden" ? "已隐藏" : "草稿"}
                    </span>
                    <span className="text-xs text-[#9E8E7E]">会员 #{story.memberId}</span>
                  </div>
                  <span className="text-[10px] text-[#9E8E7E]">{story.createdAt?.slice(0, 10)}</span>
                </div>
                <p className="text-sm text-[#3E2723] leading-relaxed line-clamp-2">&ldquo;{story.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
