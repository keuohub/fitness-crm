"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: { memberId: number; name: string; status: string; message: string }[];
}

export default function AdminSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");

  // 批量洞察记录
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<BatchResult | null>(null);
  const [aiError, setAiError] = useState("");

  // 加载上次同步时间
  useEffect(() => {
    fetch("/api/sync/feishu")
      .then((r) => r.json())
      .then((data) => {
        if (data.lastSyncAt) setLastSyncAt(data.lastSyncAt);
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sync/feishu", { method: "POST" });
      if (res.ok) {
        const data: SyncResult = await res.json();
        setResult(data);
        setLastSyncAt(new Date().toLocaleString("zh-CN"));
      } else {
        const err = await res.json();
        setError(err.error || "同步失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchAI = async () => {
    setAiRunning(true);
    setAiError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/ai/batch-daily-feedback", { method: "POST" });
      if (res.ok) {
        const data: BatchResult = await res.json();
        setAiResult(data);
      } else {
        const err = await res.json();
        setAiError(err.error || "执行失败");
      }
    } catch {
      setAiError("网络错误，请重试");
    } finally {
      setAiRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-[#9E8E7E] hover:underline">
            ← 返回首页
          </Link>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-2">管理面板</h1>

        {/* 导航标签 */}
        <div className="flex gap-1 mb-6">
          <Link
            href="/admin/sync"
            className="px-4 py-1.5 text-sm rounded border bg-[#8B5E3C] text-white border-[#8B5E3C]"
          >
            飞书同步
          </Link>
          <Link
            href="/admin/reports"
            className="px-4 py-1.5 text-sm rounded border border-[#E8E0D5] hover:bg-[#E8E0D5] text-[#3E2723]"
          >
            周期报告
          </Link>
        </div>

        <p className="text-sm text-[#9E8E7E] mb-8">飞书数据同步与 洞察记录生成</p>

        {/* ── 飞书同步 ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
          <h2 className="font-serif text-lg mb-4">飞书数据同步</h2>
          <div className="text-sm space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-[#9E8E7E]">上次同步</span>
              <span>{lastSyncAt || "从未同步"}</span>
            </div>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="w-full">
            {syncing ? "同步中..." : "开始同步"}
          </Button>

          {result && (
            <div className="mt-4 pt-4 border-t border-[#E8E0D5]">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#9E8E7E]">新增同步</span>
                  <p className="text-lg font-serif text-green-700">{result.synced}</p>
                </div>
                <div>
                  <span className="text-[#9E8E7E]">跳过</span>
                  <p className="text-lg font-serif text-[#9E8E7E]">{result.skipped}</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-xs text-[#D4736A] space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-[#D4736A]/10 border border-[#D4736A]/20 rounded-2xl p-4 mb-6">
            <p className="text-sm text-[#D4736A]">{error}</p>
          </div>
        )}

        {/* ── 洞察记录批量生成 ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
          <h2 className="font-serif text-lg mb-4">每日反馈自动生成</h2>
          <p className="text-sm text-[#9E8E7E] mb-4">
            遍历所有 active 会员，调用 DeepSeek 生成今日关怀反馈。已有反馈的自动跳过。
          </p>
          <Button onClick={handleBatchAI} disabled={aiRunning} className="w-full">
            {aiRunning ? "生成中..." : "立即执行一次"}
          </Button>

          {aiError && (
            <p className="mt-3 text-sm text-[#D4736A]">{aiError}</p>
          )}

          {aiResult && (
            <div className="mt-4 pt-4 border-t border-[#E8E0D5]">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-[#9E8E7E]">处理</span>
                  <p className="text-lg font-serif">{aiResult.processed}</p>
                </div>
                <div>
                  <span className="text-[#9E8E7E]">成功</span>
                  <p className="text-lg font-serif text-green-700">{aiResult.succeeded}</p>
                </div>
                <div>
                  <span className="text-[#9E8E7E]">失败</span>
                  <p className="text-lg font-serif text-[#D4736A]">{aiResult.failed}</p>
                </div>
              </div>
              {aiResult.results.length > 0 && (
                <ul className="mt-2 text-xs space-y-0.5 max-h-40 overflow-auto">
                  {aiResult.results.map((r, i) => (
                    <li key={i} className={r.status === "error" ? "text-[#D4736A]" : r.status === "skipped" ? "text-[#9E8E7E]" : "text-green-700"}>
                      [{r.name}] {r.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
