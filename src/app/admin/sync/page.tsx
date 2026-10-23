"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  RefreshCw,
  Database,
  Sparkles,
  FileSpreadsheet,
  Activity,
  History,
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  Tag,
} from "lucide-react";

interface Member {
  id: number;
  name: string;
}

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
  const { showToast } = useToast();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  // 批量洞察记录
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<BatchResult | null>(null);

  // 初始评估报告批量生成
  const [iaRunning, setIaRunning] = useState(false);
  const [iaResult, setIaResult] = useState<BatchResult | null>(null);

  // 教练课后笔记
  const [coachMemberId, setCoachMemberId] = useState("");
  const [coachTags, setCoachTags] = useState<string[]>([]);
  const [coachNoteText, setCoachNoteText] = useState("");
  const [coachNoteSubmitting, setCoachNoteSubmitting] = useState(false);
  // 周报/月报生成（Gemini 重构时整块被删，这里补回）
  const [wrRunning, setWrRunning] = useState(false);
  const [wrResult, setWrResult] = useState<string | null>(null);
  const [wrError, setWrError] = useState("");
  const [memberList, setMemberList] = useState<Member[]>([]);

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

  const memberTags = [
    "动作进步",
    "状态很好",
    "核心稳了",
    "肩颈放松",
    "骨盆改善",
    "体力充沛",
    "略显疲劳",
    "需要调整",
    "突破瓶颈",
  ];

  const toggleTag = (tag: string) => {
    setCoachTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync/feishu", { method: "POST" });
      if (res.ok) {
        const data: SyncResult = await res.json();
        setResult(data);
        setLastSyncAt(new Date().toLocaleString("zh-CN"));
        showToast(`飞书多维表格同步完成：成功同步 ${data.synced} 条记录`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "同步失败", "error");
      }
    } catch {
      showToast("同步网络异常", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchAI = async () => {
    setAiRunning(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai/batch-daily-feedback", { method: "POST" });
      if (res.ok) {
        const data: BatchResult = await res.json();
        setAiResult(data);
        showToast(`批量生成日常反馈完成：成功 ${data.succeeded} 条`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "执行失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setAiRunning(false);
    }
  };

  const handleInitialAssessment = async () => {
    setIaRunning(true);
    setIaResult(null);
    try {
      const res = await fetch("/api/ai/batch-initial-assessment", { method: "POST" });
      if (res.ok) {
        const data: BatchResult = await res.json();
        setIaResult(data);
        showToast(`初始体态评估批量完成：成功 ${data.succeeded} 份`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "执行失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setIaRunning(false);
    }
  };

  const handleWeeklyReport = async (rtype: "weekly" | "monthly") => {
    if (!coachMemberId) {
      setWrError("请先在上方选择会员");
      return;
    }
    setWrRunning(true);
    setWrError("");
    setWrResult(null);
    try {
      const res = await fetch("/api/admin/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: parseInt(coachMemberId, 10), reportType: rtype }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWrResult(data.content || "报告已生成");
      } else {
        setWrError(data.error || "生成失败");
      }
    } catch {
      setWrError("网络错误，请重试");
    } finally {
      setWrRunning(false);
    }
  };

  const handleCoachNoteSubmit = async () => {
    if (!coachMemberId) {
      showToast("请先选择记录学员", "error");
      return;
    }
    setCoachNoteSubmitting(true);
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
        showToast("课后手札已成功保存", "success");
        setCoachNoteText("");
        setCoachTags([]);
      } else {
        showToast(data.error || "保存失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setCoachNoteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            INTEGRATIONS · 数据同步与引擎
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">飞书同步与 AI 批量引擎</h1>
          <p className="text-sm text-[#697180] mt-1">
            连接外部飞书多维表格业务底表，驱动学员档案、训练日志双向同步及 AI 批量洞察生成。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/sync-status"
            className="px-3.5 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-[#697180]" /> 同步日志
          </Link>
          <Link
            href="/admin/usage"
            className="px-3.5 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-[#697180]" /> API 用量
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Feishu Sync + AI Batching */}
        <div className="lg:col-span-7 space-y-6">
          {/* Feishu Sync Card */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5EB]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-semibold text-[#292D35]">飞书多维表格同步</h2>
              </div>
              <span className="text-xs text-[#697180] tabular-nums">
                上次同步: {lastSyncAt ? String(lastSyncAt).slice(0, 16) : "尚未执行"}
              </span>
            </div>

            <p className="text-xs text-[#697180] leading-relaxed">
              从飞书 Base 导入最新签约学员档案、排课排班与课时消耗记录。系统执行幂等防重匹配。
            </p>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "正在拉取飞书数据..." : "立即同步飞书数据"}
            </button>

            {result && (
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] text-xs text-[#292D35] flex items-center gap-4 tabular-nums">
                <span className="text-emerald-600 font-medium">✓ 已同步: {result.synced} 条</span>
                <span className="text-[#697180]">跳过未变更: {result.skipped} 条</span>
                {result.errors.length > 0 && (
                  <span className="text-red-600">异常: {result.errors.length}</span>
                )}
              </div>
            )}
          </div>

          {/* AI Batch Engines */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E1E5EB]">
              <Sparkles className="w-4 h-4 text-[#8B83D7]" />
              <h2 className="text-sm font-semibold text-[#292D35]">AI 批量演算任务</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg space-y-3">
                <div className="text-xs font-semibold text-[#292D35]">课后训练日常反馈生成</div>
                <p className="text-[11px] text-[#697180] leading-relaxed">
                  基于当日消课明细与教练勾选标签，批量提炼课后反馈。
                </p>
                <button
                  onClick={handleBatchAI}
                  disabled={aiRunning}
                  className="w-full py-2 text-xs font-medium text-[#2563EB] bg-white border border-[#E1E5EB] hover:bg-[#F5F7FA] rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${aiRunning ? "animate-spin" : ""}`} />
                  {aiRunning ? "正在演算..." : "执行批量日常反馈"}
                </button>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg space-y-3">
                <div className="text-xs font-semibold text-[#292D35]">初测体态报告批量生成</div>
                <p className="text-[11px] text-[#697180] leading-relaxed">
                  为尚未生成初测力学档案的新学员，批量提炼入学评测。
                </p>
                <button
                  onClick={handleInitialAssessment}
                  disabled={iaRunning}
                  className="w-full py-2 text-xs font-medium text-[#2563EB] bg-white border border-[#E1E5EB] hover:bg-[#F5F7FA] rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${iaRunning ? "animate-spin" : ""}`} />
                  {iaRunning ? "正在演算..." : "执行初始体态报告"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Coach Note Fast Entry */}
        <div className="lg:col-span-5 bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E1E5EB]">
            <Tag className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#292D35]">教练课后随记速录</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1.5">选择学员</label>
            <select
              value={coachMemberId}
              onChange={(e) => setCoachMemberId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#292D35]"
            >
              <option value="">-- 选择学员 --</option>
              {memberList.map((m) => (
                <option key={m.id} value={m.id}>
                  #LW{m.id} {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1.5">快捷体态标签</label>
            <div className="flex flex-wrap gap-1.5">
              {memberTags.map((tag) => {
                const selected = coachTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      selected
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F5F7FA] text-[#697180] border border-[#E1E5EB] hover:text-[#292D35]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1.5">导师观察随笔</label>
            <textarea
              rows={4}
              value={coachNoteText}
              onChange={(e) => setCoachNoteText(e.target.value)}
              placeholder="记录发力感觉、骨盆位置或代偿纠正要点..."
              className="w-full p-3 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35] leading-relaxed"
            />
          </div>

          <button
            onClick={handleCoachNoteSubmit}
            disabled={coachNoteSubmitting || !coachMemberId}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {coachNoteSubmitting ? "正在保存..." : "提交课后手札笔记"}
          </button>
        </div>
      </div>

      {/* 生成训练周报 / 月报 */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#292D35]">生成训练周报 / 月报</h2>
        </div>
        <p className="text-xs text-[#697180] mb-4 leading-relaxed">
          按上方选中的会员，自动拉取本周/本月训练记录与教练笔记，生成一份可发给学员的成长报告。
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleWeeklyReport("weekly")}
            disabled={wrRunning}
            className="flex-1 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {wrRunning ? "生成中..." : "生成周报"}
          </button>
          <button
            onClick={() => handleWeeklyReport("monthly")}
            disabled={wrRunning}
            className="flex-1 py-2 text-xs font-semibold text-[#2563EB] bg-[#E8EEFF] hover:bg-[#D7E2FF] rounded-lg transition-colors disabled:opacity-50"
          >
            {wrRunning ? "生成中..." : "生成月报"}
          </button>
        </div>
        {wrError && <p className="text-xs text-red-600 mt-3">{wrError}</p>}
        {wrResult && (
          <div className="mt-3 p-4 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg text-xs text-[#292D35] leading-relaxed whitespace-pre-wrap max-h-80 overflow-auto">
            {wrResult}
          </div>
        )}
      </div>
    </div>
  );
}
