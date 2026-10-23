"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  FileText,
  Sparkles,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";

const REPORT_TYPES = [
  { value: "weekly", label: "周报（7天）" },
  { value: "15days", label: "15日阶段总结" },
  { value: "monthly", label: "月报（30天）" },
  { value: "quarterly", label: "季度总结（90天）" },
  { value: "semiyearly", label: "半年总结（180天）" },
  { value: "yearly", label: "年度总结（365天）" },
];

const TYPE_LABEL: Record<string, string> = {
  weekly: "周报",
  "15days": "15日",
  monthly: "月报",
  quarterly: "季度",
  semiyearly: "半年",
  yearly: "年度",
};

interface Member {
  id: number;
  name: string;
}

interface Report {
  id: number;
  memberId: number;
  reportType: string;
  content: string;
  generatedAt: string;
  createdAt: string;
}

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: { memberId: number; name: string; status: string; message: string }[];
}

export default function AdminReports() {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState("weekly");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [genError, setGenError] = useState("");

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [reportsByMember, setReportsByMember] = useState<Record<number, Report[]>>({});
  const [expandedReport, setExpandedReport] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => {
        if (!r.ok) throw new Error("会员列表读取失败");
        return r.json();
      })
      .then((data: Member[]) => {
        const list = Array.isArray(data) ? data : [];
        setMembers(list);
        setAllMembers(list);
      })
      .catch(() => {
        setMembers([]);
        setAllMembers([]);
      });
  }, []);

  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : [];

  const loadReports = useCallback(() => {
    // 限流：原来对全体会员一次性并发（线上 280 人 = 280 个并发请求），
    // 这里改成 6 个一批，避免把服务打满。失败只影响该会员，不再整页报错。
    const ids = allMembers.map((m) => m.id);
    const results: any[] = new Array(ids.length);
    const CONCURRENCY = 6;
    const worker = async (startIndex: number) => {
      for (let i = startIndex; i < ids.length; i += CONCURRENCY) {
        try {
          const r = await fetch(`/api/ai/period-report?memberId=${ids[i]}`);
          results[i] = r.ok ? await r.json() : [];
        } catch {
          results[i] = [];
        }
      }
    };
    Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, (_, k) => worker(k))
    ).then(() => {
      const map: Record<number, Report[]> = {};
      results.forEach((reports: Report[], i) => {
        const nonDaily = (Array.isArray(reports) ? reports : []).filter(
          (r) => r.reportType && r.reportType !== "daily"
        );
        if (nonDaily.length > 0) {
          map[allMembers[i].id] = nonDaily;
        }
      });
      setReportsByMember(map);
    });
  }, [allMembers]);

  useEffect(() => {
    if (allMembers.length > 0) loadReports();
  }, [allMembers, loadReports]);

  const handleGenerate = async () => {
    if (!selectedMember) {
      showToast("请先选择生成报告的会员", "error");
      return;
    }
    setGenerating(true);
    setGenError("");
    setGenResult(null);
    try {
      const res = await fetch("/api/ai/period-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember.id, reportType }),
      });
      if (res.ok) {
        const data = await res.json();
        setGenResult(data.content);
        showToast(`已成功为 ${selectedMember.name} 生成${TYPE_LABEL[reportType] || "周期报告"}`, "success");
        loadReports();
      } else {
        const err = await res.json();
        setGenError(err.error || "生成失败");
        showToast(err.error || "生成失败", "error");
      }
    } catch {
      showToast("网络连接异常", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleBatch = async () => {
    setBatchGenerating(true);
    setBatchResult(null);
    setGenError("");
    try {
      const res = await fetch("/api/ai/batch-period-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      if (res.ok) {
        const data: BatchResult = await res.json();
        setBatchResult(data);
        showToast(`批量生成完毕：成功 ${data.succeeded} 份，跳过/失败 ${data.failed} 份`, "success");
        loadReports();
      } else {
        const err = await res.json();
        showToast(err.error || "批量生成失败", "error");
      }
    } catch {
      showToast("批量生成网络异常", "error");
    } finally {
      setBatchGenerating(false);
    }
  };

  const memberName = (id: number) => allMembers.find((m) => m.id === id)?.name || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            AI INTELLIGENCE · 周期蜕变报告
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">学员周期报告管理</h1>
          <p className="text-sm text-[#697180] mt-1">
            基于真实消课、训练体感与教练手札，AI 智能提炼学员周报、月报与阶段总结。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E1E5EB]">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-semibold text-[#292D35]">单人生成报告</h2>
            </div>

            {/* Member Selector */}
            <div>
              <label className="block text-xs font-medium text-[#292D35] mb-1.5">目标学员</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索学员姓名..."
                  value={selectedMember ? selectedMember.name : memberSearch}
                  onChange={(e) => {
                    setSelectedMember(null);
                    setMemberSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35]"
                />
                {showDropdown && filteredMembers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white border border-[#E1E5EB] rounded-lg shadow-lg">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch("");
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#F5F7FA] text-[#292D35] flex items-center justify-between"
                      >
                        <span>{m.name}</span>
                        <span className="font-mono text-[#697180]">#LW{m.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Report Type Selector */}
            <div>
              <label className="block text-xs font-medium text-[#292D35] mb-1.5">报告周期类型</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#292D35]"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedMember}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? "正在深度演算提炼..." : "生成单人报告"}
            </button>
          </div>

          {/* Batch Generator */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E1E5EB]">
              <Users className="w-4 h-4 text-[#8B83D7]" />
              <h2 className="text-sm font-semibold text-[#292D35]">全员批量生成</h2>
            </div>
            <p className="text-xs text-[#697180] leading-relaxed">
              一键为全部活跃学员批量生成对应周期的总结报告。
            </p>
            <button
              onClick={handleBatch}
              disabled={batchGenerating}
              className="w-full py-2 text-xs font-medium text-[#2563EB] bg-[#E8EEFF] hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${batchGenerating ? "animate-spin" : ""}`} />
              {batchGenerating ? "批量生成中..." : `批量生成全部学员【${TYPE_LABEL[reportType] || ""}】`}
            </button>
          </div>

          {/* Real-time generated content card */}
          {genResult && (
            <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2563EB]">刚刚生成的报告预览</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(genResult);
                    showToast("报告内容已复制到剪贴板", "success");
                  }}
                  className="text-xs text-[#697180] hover:text-[#2563EB] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> 复制正文
                </button>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] text-xs text-[#292D35] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {genResult}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Historical Reports List (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E1E5EB] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-semibold text-[#292D35]">已存档周期报告库</h2>
            </div>
            <span className="text-xs text-[#697180]">
              覆盖 {Object.keys(reportsByMember).length} 位学员
            </span>
          </div>

          <div className="divide-y divide-[#E1E5EB] flex-1 overflow-y-auto max-h-[750px]">
            {Object.keys(reportsByMember).length === 0 ? (
              <div className="py-16 text-center text-xs text-[#697180]">
                暂无已保存的历史周期报告
              </div>
            ) : (
              Object.entries(reportsByMember).map(([midStr, rList]) => {
                const mid = Number(midStr);
                const name = memberName(mid);
                return (
                  <div key={mid} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#292D35]">{name}</span>
                        <span className="font-mono text-[10px] text-[#697180] bg-[#F0F2F6] px-1 py-0.2 rounded">
                          #LW{mid}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#697180]">{rList.length} 份报告</span>
                    </div>

                    <div className="space-y-1.5">
                      {rList.map((r) => {
                        const isExpanded = expandedReport === r.id;
                        return (
                          <div
                            key={r.id}
                            className="bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg p-2.5 text-xs transition-colors"
                          >
                            <div
                              onClick={() => setExpandedReport(isExpanded ? null : r.id)}
                              className="flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#2563EB]">
                                  {TYPE_LABEL[r.reportType] || r.reportType}
                                </span>
                                <span className="text-[11px] text-[#697180] tabular-nums">
                                  {String(r.generatedAt || r.createdAt || "").slice(0, 16)}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-[#E1E5EB] text-[#292D35] leading-relaxed whitespace-pre-wrap">
                                {r.content}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
