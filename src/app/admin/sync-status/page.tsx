"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

interface SyncLog {
  timestamp: string;
  source: string;
  status: string;
  memberCode?: string;
  memberName?: string;
  message: string;
}

export default function SyncStatusPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetch("/api/sync/feishu")
      .then((r) => r.json())
      .then((data) => {
        setLastSync(data.lastSyncAt);
        setLogs(data.recentLogs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            INTEGRATION LOGS · 飞书同步历史
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">同步运行日志</h1>
          <p className="text-sm text-[#697180] mt-1">
            记录管理后台与飞书多维表格双向数据交换流水与异常排查记录。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/sync"
            className="px-3.5 py-1.5 text-xs text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 返回同步面板
          </Link>
          <button
            onClick={loadData}
            className="p-1.5 text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg transition-colors shadow-sm"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs text-[#697180]">最后同步时刻</div>
          <div className="text-xl font-bold text-[#292D35] mt-1 tabular-nums">
            {lastSync ? new Date(lastSync).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs text-[#697180]">成功批次</div>
          <div className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">{successCount}</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs text-[#697180]">异常报错</div>
          <div className="text-xl font-bold text-red-600 mt-1 tabular-nums">{errorCount}</div>
        </div>
      </div>

      {/* Logs Card */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E1E5EB] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#292D35]">最近流水记录 ({logs.length})</span>
          <span className="text-xs text-[#697180]">按时间倒序</span>
        </div>

        <div className="divide-y divide-[#E1E5EB] max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#697180]">
              暂无同步记录
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {log.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="truncate text-[#292D35] font-medium">
                    {log.memberName ? `${log.memberName} · ` : ""}{log.message}
                  </span>
                </div>
                <span className="text-[11px] text-[#697180] shrink-0 ml-3 tabular-nums">
                  {log.timestamp?.slice(11, 19) || ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
