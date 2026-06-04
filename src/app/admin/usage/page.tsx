"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface UsageSummary {
  totalLogins: number;
  totalPageViews: number;
  totalShares: number;
  uniqueMembers: number;
  topPages: { page: string; count: number }[];
}

export default function UsageDashboard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetch(`/api/portal/track?days=${days}`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {});
  }, [days]);

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/admin/sync" className="text-sm text-[#9E8E7E] hover:underline">
            -- 返回管理面板
          </Link>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-2">Portal 使用数据</h1>
        <div className="flex gap-2 mb-8">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3 py-1 text-xs rounded-full transition-colors"
              style={{
                backgroundColor: days === d ? COLORS.primary : "#EDE8E2",
                color: days === d ? "#fff" : "#3E2723",
              }}
            >
              近{d}天
            </button>
          ))}
        </div>

        {!summary ? (
          <div className="text-center py-12 text-sm text-[#9E8E7E]">加载中...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "登录次数", value: summary.totalLogins },
                { label: "页面浏览", value: summary.totalPageViews },
                { label: "分享次数", value: summary.totalShares },
                { label: "活跃会员", value: summary.uniqueMembers },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white rounded-2xl p-5 text-center"
                  style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}
                >
                  <p className="text-2xl font-serif font-bold" style={{ color: COLORS.primary }}>
                    {item.value}
                  </p>
                  <p className="text-xs text-[#9E8E7E] mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
              <p className="text-sm font-bold text-[#3E2723] mb-4">热门页面</p>
              {summary.topPages.length === 0 ? (
                <p className="text-sm text-[#9E8E7E]">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {summary.topPages.map((p) => (
                    <div key={p.page} className="flex items-center justify-between text-sm">
                      <span className="text-[#3E2723]">{p.page}</span>
                      <span className="text-xs text-[#9E8E7E]">{p.count} 次</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
