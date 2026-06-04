"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Report {
  id: number;
  memberId: number;
  reportType: string;
  content: string;
  generatedAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  weekly: "周报",
  "15days": "15日",
  monthly: "月报",
  quarterly: "季度",
  semiyearly: "半年",
  yearly: "年度",
};

const REPORT_OPTIONS = [
  { value: "weekly", label: "周报" },
  { value: "15days", label: "15日" },
  { value: "monthly", label: "月报" },
  { value: "quarterly", label: "季度" },
  { value: "semiyearly", label: "半年" },
  { value: "yearly", label: "年度" },
];

export default function PeriodReportCard({ memberId }: { memberId: number }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [selectedType, setSelectedType] = useState("weekly");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadReports = () => {
    fetch(`/api/ai/period-report?memberId=${memberId}`)
      .then((r) => r.json())
      .then((data: Report[]) => {
        setReports(data.filter((r) => r.reportType && r.reportType !== "daily"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [memberId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/ai/period-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, reportType: selectedType }),
      });
      loadReports();
      setShowTypeSelect(false);
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const recent = reports.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg">周期报告</h2>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTypeSelect(!showTypeSelect)}
          >
            生成新报告
          </Button>
          {showTypeSelect && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E8E0D5] rounded shadow-lg z-10">
              {REPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#E8E0D5] ${selectedType === opt.value ? "bg-[#E8E0D5]" : ""}`}
                  onClick={() => {
                    setSelectedType(opt.value);
                    setShowTypeSelect(false);
                    handleGenerate();
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {generating && (
        <p className="text-sm text-[#9E8E7E] mb-3">正在生成报告...</p>
      )}

      {loading ? (
        <p className="text-sm text-[#9E8E7E]">加载中...</p>
      ) : recent.length === 0 ? (
        <p className="text-sm text-[#9E8E7E]">暂无周期报告</p>
      ) : (
        <div className="space-y-3">
          {recent.map((r) => (
            <div key={r.id} className="border-b border-[#E8E0D5] pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="bg-[#E8E0D5] px-1.5 py-0.5 rounded">
                  {TYPE_LABEL[r.reportType] || r.reportType}
                </span>
                <span className="text-[#9E8E7E]">{r.generatedAt?.slice(0, 10)}</span>
              </div>
              {expandedId === r.id ? (
                <div className="mt-2 p-3 bg-[#FAF7F2] border border-[#E8E0D5] rounded text-sm text-[#3E2723] whitespace-pre-wrap max-h-64 overflow-auto">
                  {r.content}
                  <button
                    onClick={() => setExpandedId(null)}
                    className="block mt-2 text-xs text-[#9E8E7E] underline"
                  >
                    收起
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#3E2723] line-clamp-2">
                  {r.content?.slice(0, 80)}...
                </p>
              )}
            </div>
          ))}

          {reports.length > 3 && (
            <button
              onClick={() => setExpandedId(reports[0].id)}
              className="text-xs text-[#9E8E7E] hover:underline"
            >
              查看全部（共 {reports.length} 份）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
