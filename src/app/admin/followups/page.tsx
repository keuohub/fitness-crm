"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Bell,
  BatteryLow,
  UserX,
  Calendar,
  Cake,
  Phone,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react";

type Row = Record<string, any>;
type Data = {
  counts: Record<string, number>;
  lowBalance: Row[];
  inactive30d: Row[];
  expiring: Row[];
  birthdays: Row[];
};

export default function AdminFollowUpsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lowBalance" | "inactive30d" | "expiring" | "birthdays">("lowBalance");

  useEffect(() => {
    fetch("/api/admin/follow-ups")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "加载失败");
        setData(d);
      })
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      key: "lowBalance" as const,
      title: "剩余课次不足",
      hint: "剩余 ≤ 3 次",
      icon: BatteryLow,
      actionAdvice: "温馨提醒续充课时",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      key: "inactive30d" as const,
      title: "30天未到课",
      hint: "超一个月无训练记录",
      icon: UserX,
      actionAdvice: "关怀问候并协助预约",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
    },
    {
      key: "expiring" as const,
      title: "30天内到期",
      hint: "期限卡即将失效",
      icon: Calendar,
      actionAdvice: "提前提醒续费或延期",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      key: "birthdays" as const,
      title: "近30天生日",
      hint: "本月生日本地会员",
      icon: Cake,
      actionAdvice: "发送生日专属礼遇问候",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  const currentSection = sections.find((s) => s.key === activeTab)!;
  const currentRows = (data ? (data[activeTab] as Row[]) : []) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MEMBER CARE · 会员跟进名单
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">跟进名单与关怀</h1>
          <p className="text-sm text-[#697180] mt-1">
            实时提取低课时、久未到课、卡项将临期与近期生日学员，为导师提供精准的学员触达依据。
          </p>
        </div>
      </div>

      {/* 4 Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          const count = data?.counts?.[s.key] ?? (data ? (data[s.key] as Row[])?.length : 0) ?? 0;
          const isSelected = activeTab === s.key;

          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`p-4 rounded-xl border text-left transition-all bg-white shadow-sm flex flex-col justify-between ${
                isSelected
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/15"
                  : "border-[#E1E5EB] hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#697180]">{s.title}</span>
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#2563EB]" : "text-gray-400"}`} />
              </div>
              <div className="text-2xl font-bold text-[#292D35] mt-2 tabular-nums">
                {loading ? "-" : count}
              </div>
              <div className="text-[11px] text-[#697180] mt-1">{s.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Current Table Panel */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#E1E5EB] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <currentSection.icon className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#292D35]">
              {currentSection.title} ({currentRows.length} 人)
            </h2>
          </div>
          <span className="text-xs text-[#697180]">
            建议跟进动作：<strong className="text-[#292D35]">{currentSection.actionAdvice}</strong>
          </span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFBFD] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
              <tr>
                <th className="px-5 py-3.5">会员档案</th>
                <th className="px-5 py-3.5">当前业务指标与状态</th>
                <th className="px-5 py-3.5">跟进建议</th>
                <th className="px-5 py-3.5 text-right">快捷通道</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EB]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-[#697180]">
                    正在提取跟进名单...
                  </td>
                </tr>
              ) : currentRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-[#697180]">
                    当前分类下暂无需要特别跟进的学员
                  </td>
                </tr>
              ) : (
                currentRows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E8EEFF] text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                          {(r.member_name || r.name || "学").slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-medium text-[#292D35] flex items-center gap-1.5 text-xs">
                            {r.member_name || r.name}
                            <span className="font-mono text-[10px] text-[#697180] bg-[#F0F2F6] px-1 py-0.2 rounded">
                              #LW{r.member_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#697180] mt-0.5 tabular-nums flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {r.member_phone || r.phone || "未录入手机号"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-[#292D35]">
                      {activeTab === "lowBalance" && (
                        <div>
                          <span className="font-medium text-[#292D35]">{r.card_name}</span>
                          <div className="text-amber-600 font-semibold tabular-nums mt-0.5">
                            剩余仅 {r.remaining_count} 次
                          </div>
                        </div>
                      )}
                      {activeTab === "inactive30d" && (
                        <div>
                          <div className="text-[#697180]">最近到课时间：</div>
                          <div className="text-[#292D35] font-medium tabular-nums mt-0.5">
                            {r.last_attended ? String(r.last_attended).slice(0, 10) : "从无到课记录"}
                          </div>
                        </div>
                      )}
                      {activeTab === "expiring" && (
                        <div>
                          <span className="font-medium text-[#292D35]">{r.card_name}</span>
                          <div className="text-blue-600 font-medium tabular-nums mt-0.5">
                            {r.valid_until} 失效
                          </div>
                        </div>
                      )}
                      {activeTab === "birthdays" && (
                        <div>
                          <span className="font-medium text-[#292D35]">
                            生日: {String(r.birthday).slice(0, 10)}
                          </span>
                          <div className="text-purple-600 font-medium tabular-nums mt-0.5">
                            距离生日仅剩 {r.days_until} 天
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentSection.badgeColor}`}
                      >
                        {currentSection.actionAdvice}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={`/admin/members?memberId=${r.member_id}`}
                        className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium"
                      >
                        会员档案 <ArrowRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
