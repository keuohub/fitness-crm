"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Users,
  Eye,
  LogIn,
  Share2,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/track?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("统计数据读取失败");
        return r.json();
      })
      .then((d) => {
        if (!d || typeof d !== "object" || d.error) throw new Error("统计数据格式异常");
        setSummary({
          ...d,
          topPages: Array.isArray(d.topPages) ? d.topPages : [],
        });
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            PORTAL ANALYTICS · 移动端访问数据
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">学员端活跃用量统计</h1>
          <p className="text-sm text-[#697180] mt-1">
            监控学员在微信小程序及专属 Portal 端的页面浏览、登录与成长打卡分享频次。
          </p>
        </div>

        <Link
          href="/admin/sync"
          className="px-3.5 py-1.5 text-xs text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg transition-colors flex items-center gap-1 shadow-sm self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 返回同步面板
        </Link>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E5EB] shadow-xs w-fit">
        {[
          { label: "近 7 天", value: 7 },
          { label: "近 14 天", value: 14 },
          { label: "近 30 天", value: 30 },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setDays(item.value)}
            className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              days === item.value
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !summary ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-xs text-[#697180] shadow-sm">
          正在统计访问数据...
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#697180]">
                <span>登录次数</span>
                <LogIn className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">
                {summary.totalLogins}
              </div>
            </div>

            <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#697180]">
                <span>页面浏览</span>
                <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">
                {summary.totalPageViews}
              </div>
            </div>

            <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#697180]">
                <span>分享次数</span>
                <Share2 className="w-3.5 h-3.5 text-[#8B83D7]" />
              </div>
              <div className="text-2xl font-bold text-[#8B83D7] mt-1.5 tabular-nums">
                {summary.totalShares}
              </div>
            </div>

            <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#697180]">
                <span>活跃会员</span>
                <Users className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
                {summary.uniqueMembers}
              </div>
            </div>
          </div>

          {/* Top Pages Card */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E1E5EB] bg-[#F8FAFC]">
              <span className="text-xs font-semibold text-[#292D35]">学员高频访问页面榜单</span>
            </div>

            <div className="divide-y divide-[#E1E5EB]">
              {summary.topPages.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#697180]">
                  该时间范围内暂无页面访问数据
                </div>
              ) : (
                summary.topPages.map((p, idx) => (
                  <div
                    key={p.page}
                    className="p-3.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F0F2F6] text-[#697180] font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-[#292D35] font-medium">{p.page}</span>
                    </div>
                    <span className="font-semibold text-[#2563EB] tabular-nums">
                      {p.count} 次访问
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
