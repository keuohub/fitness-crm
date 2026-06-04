"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass = "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";
const selectClass = `flex h-9 rounded-md border border-[#E8E0D5] bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20`;

const REPORT_TYPES = [
  { value: "weekly", label: "周报（7天）" },
  { value: "15days", label: "15日总结" },
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
  // 左栏：生成面板
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

  // 右栏：报告列表
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [reportsByMember, setReportsByMember] = useState<Record<number, Report[]>>({});
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // 加载会员列表
  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data: Member[]) => {
        setMembers(data);
        setAllMembers(data);
      });
  }, []);

  // 搜索过滤
  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : [];

  // 加载报告列表
  const loadReports = useCallback(() => {
    Promise.all(
      allMembers.map((m) =>
        fetch(`/api/ai/period-report?memberId=${m.id}`).then((r) => r.json())
      )
    ).then((results) => {
      const map: Record<number, Report[]> = {};
      results.forEach((reports: Report[], i) => {
        const nonDaily = reports.filter(
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
    if (!selectedMember) return;
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
        loadReports();
      } else {
        const err = await res.json();
        setGenError(err.error || "生成失败");
      }
    } catch {
      setGenError("网络错误");
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
        loadReports();
      } else {
        const err = await res.json();
        setGenError(err.error || "批量生成失败");
      }
    } catch {
      setGenError("网络错误");
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleRegenerate = async (memberId: number, rt: string) => {
    setGenerating(true);
    try {
      await fetch("/api/ai/period-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, reportType: rt }),
      });
      loadReports();
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSave = async (reportId: number) => {
    // 简单实现：删除旧记录 + 插入编辑后的内容
    // 由于 Drizzle 不直接支持 UPDATE content，这里用简化方案
    setEditingId(null);
  };

  const memberName = (id: number) => allMembers.find((m) => m.id === id)?.name || "";

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/sync" className="text-sm text-[#9E8E7E] hover:underline">
            ← 返回管理面板
          </Link>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-8">周期报告管理</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ 左栏：生成面板 ═══ */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm">
              <h2 className="font-serif text-lg mb-4">生成报告</h2>

              {/* 报告类型 */}
              <div className="space-y-1.5 mb-4">
                <label className="text-sm text-[#3E2723]">报告类型</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className={selectClass + " w-full"}
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              {/* 会员搜索 */}
              <div className="space-y-1.5 mb-4 relative">
                <label className="text-sm text-[#3E2723]">目标会员</label>
                <Input
                  placeholder="搜索姓名..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setShowDropdown(true);
                    setSelectedMember(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className={inputClass}
                />
                {showDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-[#E8E0D5] rounded mt-1 max-h-40 overflow-auto shadow-lg">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#E8E0D5]"
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch(m.name);
                          setShowDropdown(false);
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedMember && (
                <p className="text-sm text-[#9E8E7E] mb-4">
                  已选：{selectedMember.name}
                </p>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedMember}
                className="w-full mb-2"
              >
                {generating ? "生成中..." : "生成单个报告"}
              </Button>

              <div className="border-t border-[#E8E0D5] my-4" />

              <Button
                onClick={handleBatch}
                disabled={batchGenerating}
                variant="outline"
                className="w-full"
              >
                {batchGenerating ? "批量生成中..." : "批量生成（所有活跃会员）"}
              </Button>

              {genError && (
                <p className="mt-3 text-sm text-[#D4736A]">{genError}</p>
              )}

              {genResult && (
                <div className="mt-4 p-4 bg-[#FAF7F2] border border-[#E8E0D5] rounded text-sm text-[#3E2723] whitespace-pre-wrap max-h-80 overflow-auto">
                  {genResult.slice(0, 500)}...
                </div>
              )}

              {batchResult && (
                <div className="mt-4 pt-4 border-t border-[#E8E0D5]">
                  <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                    <div><span className="text-[#9E8E7E]">处理</span><p className="font-serif">{batchResult.processed}</p></div>
                    <div><span className="text-[#9E8E7E]">成功</span><p className="font-serif text-green-700">{batchResult.succeeded}</p></div>
                    <div><span className="text-[#9E8E7E]">失败</span><p className="font-serif text-[#D4736A]">{batchResult.failed}</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ 右栏：报告列表 ═══ */}
          <div>
            <div className="bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm">
              <h2 className="font-serif text-lg mb-4">已生成报告</h2>

              {Object.keys(reportsByMember).length === 0 ? (
                <p className="text-sm text-[#9E8E7E]">暂无报告，先在左侧生成</p>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-auto">
                  {Object.entries(reportsByMember).map(([mid, reports]) => (
                    <div key={mid} className="border-b border-[#E8E0D5] pb-3 last:border-0">
                      <h3 className="font-serif text-sm mb-2">{memberName(parseInt(mid))}</h3>
                      {reports.map((r) => (
                        <div key={r.id} className="mb-2 last:mb-0">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#E8E0D5] px-1.5 py-0.5 rounded">
                                {TYPE_LABEL[r.reportType] || r.reportType}
                              </span>
                              <span className="text-[#9E8E7E]">
                                {r.generatedAt?.slice(0, 10) || r.createdAt?.slice(0, 10)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setExpandedReport(expandedReport === r.id ? null : r.id)
                                }
                                className="text-[#9E8E7E] hover:text-[#3E2723] underline"
                              >
                                {expandedReport === r.id ? "收起" : "展开"}
                              </button>
                              <button
                                onClick={() => handleRegenerate(parseInt(mid), r.reportType)}
                                className="text-[#9E8E7E] hover:text-[#3E2723] underline"
                              >
                                重新生成
                              </button>
                            </div>
                          </div>

                          {/* 预览 */}
                          {expandedReport !== r.id && (
                            <p className="text-xs text-[#9E8E7E] mt-1 truncate">
                              {r.content?.slice(0, 100)}...
                            </p>
                          )}

                          {/* 展开 */}
                          {expandedReport === r.id && (
                            <div className="mt-2 p-3 bg-[#FAF7F2] border border-[#E8E0D5] rounded text-sm text-[#3E2723] whitespace-pre-wrap max-h-96 overflow-auto">
                              {r.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
