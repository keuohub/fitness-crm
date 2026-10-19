"use client";

interface Member { id: number; name: string; }

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

  // 初始评估报告批量生成
  const [iaRunning, setIaRunning] = useState(false);
  const [iaResult, setIaResult] = useState<BatchResult | null>(null);
  const [iaError, setIaError] = useState("");

  // 教练课后笔记
  const [coachMemberId, setCoachMemberId] = useState("");
  const [coachTags, setCoachTags] = useState<string[]>([]);
  const [coachNoteText, setCoachNoteText] = useState("");
  const [coachNoteSubmitting, setCoachNoteSubmitting] = useState(false);
  const [coachNoteResult, setCoachNoteResult] = useState<string | null>(null);
  const [wrRunning, setWrRunning] = useState(false);
  const [wrResult, setWrResult] = useState<string | null>(null);
  const [wrError, setWrError] = useState("");
  const [memberList, setMemberList] = useState<Member[]>([]);

  const handleInitialAssessment = async () => {
    setIaRunning(true);
    setIaError("");
    setIaResult(null);
    try {
      const res = await fetch("/api/ai/batch-initial-assessment", { method: "POST" });
      if (res.ok) {
        const data: BatchResult = await res.json();
        setIaResult(data);
      } else {
        const err = await res.json();
        setIaError(err.error || "执行失败");
      }
    } catch {
      setIaError("网络错误，请重试");
    } finally {
      setIaRunning(false);
    }
  };

  // 加载上次同步时间
  useEffect(() => {
    fetch("/api/sync/feishu")
      .then((r) => r.json())
      .then((data) => {
        if (data.lastSyncAt) setLastSyncAt(data.lastSyncAt);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/members", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMemberList(data.map((m: any) => ({ id: m.id, name: m.name })));
      })
      .catch(() => {});
  }, []);

  const memberTags = ["动作进步", "状态很好", "核心稳了", "肩颈放松", "骨盆改善", "体力充沛", "略显疲劳", "需要调整", "情绪低落", "突破瓶颈"];
  const toggleTag = (tag: string) => {
    setCoachTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleWeeklyReport = async (rtype: string) => {
    if (!coachMemberId) { setWrError("请先选择会员"); return; }
    setWrRunning(true); setWrError(""); setWrResult(null);
    try {
      const res = await fetch("/api/admin/weekly-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: parseInt(coachMemberId, 10), reportType: rtype }),
      });
      const data = await res.json();
      if (res.ok) { setWrResult(data.content || "报告已生成"); }
      else { setWrError(data.error || "生成失败"); }
    } catch { setWrError("网络错误"); }
    finally { setWrRunning(false); }
  };

  const handleCoachNoteSubmit = async () => {
    if (!coachMemberId) return;
    setCoachNoteSubmitting(true);
    setCoachNoteResult(null);
    try {
      const res = await fetch("/api/admin/coach-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: parseInt(coachMemberId, 10),
          tags: coachTags,
          coachNote: coachNoteText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoachNoteResult(data.aiMessage || "已保存");
        setCoachNoteText("");
        setCoachTags([]);
      } else {
        setCoachNoteResult("出错了: " + (data.error || "unknown"));
      }
    } catch {
      setCoachNoteResult("网络错误");
    } finally {
      setCoachNoteSubmitting(false);
    }
  };

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
              {(result.errors && result.errors.length > 0) && (
                <ul className="mt-2 text-xs text-[#D4736A] space-y-0.5">
                  {(result.errors || []).map((e, i) => (
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

        {/* ── 生成周报/月报 ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
          <h2 className="font-serif text-lg mb-4">生成训练周报 / 月报</h2>
          <p className="text-sm text-[#9E8E7E] mb-4">
            选择会员后自动拉取本周/本月训练记录和教练笔记，AI生成人文关怀报告。
          </p>
          <div className="flex gap-3 mb-3">
            <button onClick={() => handleWeeklyReport("weekly")} disabled={wrRunning} className="flex-1 py-2 rounded-lg bg-[#4A3228] text-white text-sm hover:bg-[#3A2820] disabled:opacity-50">生成周报</button>
            <button onClick={() => handleWeeklyReport("monthly")} disabled={wrRunning} className="flex-1 py-2 rounded-lg border border-[#4A3228] text-[#4A3228] text-sm hover:bg-[#FDF8F5] disabled:opacity-50">生成月报</button>
          </div>
          {wrError && <p className="text-sm text-[#D4736A] mt-2">{wrError}</p>}
          {wrResult && <div className="mt-4 p-4 bg-[#FDF8F5] border border-[#E8E0D5] rounded-lg text-sm text-[#2C2A28] leading-relaxed whitespace-pre-wrap max-h-80 overflow-auto">{wrResult}</div>}
        </div>

        {/* ── 初始评估报告批量生成 ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
          <h2 className="font-serif text-lg mb-4">生成初始评估报告</h2>
          <p className="text-sm text-[#9E8E7E] mb-4">
            为有问卷但还没有初始评估的会员生成报告。已有报告的自动跳过。
          </p>
          <Button onClick={handleInitialAssessment} disabled={iaRunning} className="w-full">
            {iaRunning ? "生成中..." : "生成初始评估报告"}
          </Button>

          {iaError && (
            <p className="mt-3 text-sm text-[#D4736A]">{iaError}</p>
          )}

          {iaResult && (
            <div className="mt-4 pt-4 border-t border-[#E8E0D5]">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-[#9E8E7E]">处理</span>
                  <p className="text-lg font-serif">{iaResult.processed}</p>
                </div>
                <div>
                  <span className="text-[#9E8E7E]">成功</span>
                  <p className="text-lg font-serif text-green-700">{iaResult.succeeded}</p>
                </div>
                <div>
                  <span className="text-[#9E8E7E]">失败</span>
                  <p className="text-lg font-serif text-[#D4736A]">{iaResult.failed}</p>
                </div>
              </div>
              {iaResult.results.length > 0 && (
                <ul className="mt-2 text-xs space-y-0.5 max-h-40 overflow-auto">
                  {iaResult.results.map((r, i) => (
                    <li key={i} className={r.status === "error" ? "text-[#D4736A]" : r.status === "skipped" ? "text-[#9E8E7E]" : "text-green-700"}>
                      [{r.name}] {r.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── 教练课后笔记 ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
          <h2 className="font-serif text-lg mb-4">教练课后笔记</h2>
          <p className="text-sm text-[#9E8E7E] mb-4">
            选择会员，勾选本次训练的标签，写下观察备注。AI 会生成一条温暖的课后鼓励。
          </p>

          <select
            value={coachMemberId}
            onChange={(e) => setCoachMemberId(e.target.value)}
            className="w-full border border-[#E0D5C9] rounded-lg px-4 py-2 mb-4 text-[#2C2A28] bg-white"
          >
            <option value="">-- 选择会员 --</option>
            {memberList.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="mb-4">
            <p className="text-xs text-[#9E8E7E] mb-2">训练标签（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {memberTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    coachTags.includes(tag)
                      ? "bg-[#4A3228] text-white border-[#4A3228]"
                      : "bg-white text-[#9E8E7E] border-[#E0D5C9] hover:border-[#4A3228]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={coachNoteText}
            onChange={(e) => setCoachNoteText(e.target.value)}
            placeholder="教练备注（可选）：记录会员本次训练的表现、调整状态等..."
            className="w-full border border-[#E0D5C9] rounded-lg px-4 py-3 text-sm text-[#2C2A28] bg-white resize-none h-24"
          />

          <button
            onClick={handleCoachNoteSubmit}
            disabled={coachNoteSubmitting}
            className="mt-4 w-full py-2.5 rounded-lg bg-[#4A3228] text-white text-sm font-medium hover:bg-[#3A2820] disabled:opacity-50 transition-colors"
          >
            {coachNoteSubmitting ? "AI 正在生成鼓励语..." : "保存并生成鼓励语"}
          </button>

          {coachNoteResult && (
            <div className="mt-4 p-4 bg-[#FDF8F5] border border-[#E8E0D5] rounded-lg">
              <p className="text-xs text-[#9E8E7E] mb-2">AI 生成的课后鼓励</p>
              <p className="text-sm text-[#2C2A28] leading-relaxed whitespace-pre-wrap">{coachNoteResult}</p>
            </div>
          )}
        </div>

    </main>
  );
}
