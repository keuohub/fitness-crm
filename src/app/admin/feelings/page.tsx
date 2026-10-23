"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  MessageSquare,
  Sparkles,
  Send,
  CheckCheck,
  RotateCcw,
  Eraser,
  Clock,
  User,
  HeartHandshake,
  Tag,
  Check,
  RefreshCw,
  Quote,
} from "lucide-react";

type FeelingItem = {
  id: number;
  member_id: number;
  member_name: string | null;
  member_code: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  mentor_name: string | null;
  training_count: number | string | null;
  last_training_date: string | null;
  feeling: string;
  xiaoqiao_reply: string | null;
  ai_draft: string | null;
  reply_status: string;
  created_at: string;
};

function splitFeeling(raw: string) {
  const text = String(raw || "").trim();
  const tags: string[] = [];
  let rest = text;
  const tagRe = /^#(\S+?)(?=\s|$)/;
  while (tagRe.test(rest)) {
    const m = rest.match(tagRe)!;
    tags.push(m[1]);
    rest = rest.slice(m[0].length).trim();
  }
  const inlineTags = rest.match(/#\S+/g) || [];
  inlineTags.forEach((t) => tags.push(t.replace(/^#/, "")));
  rest = rest.replace(/#\S+/g, "").replace(/\s{2,}/g, " ").trim();
  return { tags: Array.from(new Set(tags)), body: rest };
}

function waitedText(createdAt: string) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return "";
  const d = Math.floor((Date.now() - t) / 86400000);
  if (d <= 0) {
    const h = Math.max(1, Math.floor((Date.now() - t) / 3600000));
    return `今日 · 等候 ${h} 小时`;
  }
  if (d === 1) return "昨日 · 等候 1 天";
  return `已等候 ${d} 天`;
}

function fmtDate(v: string | null) {
  if (!v) return "待录入";
  const s = String(v).slice(0, 10).replace(/[-/.]/g, ".");
  return s || "待录入";
}

const statusBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "待回复", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  replied: { label: "已回复", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  dismissed: { label: "已面聊划掉", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  auto_legacy: { label: "系统旧回复", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

export default function AdminFeelingsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<FeelingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "replied" | "all">("pending");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/training-feelings?status=${filter}`);
      if (res.status === 401) {
        showToast("登录已失效，请重新登录管理后台", "error");
        setItems([]);
        return;
      }
      const data = await res.json();
      const list: FeelingItem[] = Array.isArray(data) ? data : data?.items ?? [];
      setItems(list);
      setDrafts((prev) => {
        const next = { ...prev };
        list.forEach((it) => {
          if (next[it.id] === undefined) {
            next[it.id] = it.reply_status === "pending" ? it.ai_draft || "" : it.xiaoqiao_reply || "";
          }
        });
        return next;
      });
    } catch (e: any) {
      showToast(e?.message || "读取便签列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.reply_status === "pending").length,
    [items]
  );

  const send = async (item: FeelingItem) => {
    const text = (drafts[item.id] || "").trim();
    if (!text) {
      showToast("回复内容不能为空，请输入手札便签", "error");
      return;
    }
    setSaving(item.id);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, reply: text, action: "reply" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "发送失败");
      showToast(`已成功向 ${item.member_name || "学员"} 推送手札回复`, "success");
      await load();
    } catch (e: any) {
      showToast(e?.message || "发送失败", "error");
    } finally {
      setSaving(null);
    }
  };

  const dismiss = async (item: FeelingItem) => {
    setSaving(item.id);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "dismiss" }),
      });
      if (!res.ok) throw new Error("操作失败");
      showToast("已标记为当面沟通完结", "success");
      await load();
    } catch (e: any) {
      showToast(e?.message || "操作失败", "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MEMBER NOTES · 课后手札与便签
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-semibold text-[#292D35] tracking-tight">课后体感便签</h1>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {pendingCount} 条待小桥亲回
              </span>
            )}
          </div>
          <p className="text-sm text-[#697180] mt-1">
            学员在小程序端记录的课后身心体感。AI 提供专业参考起草，导师亲自审阅并用心回复。
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 text-sm text-[#697180] bg-white border border-[#E1E5EB] rounded-lg hover:text-[#292D35] hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 self-start shadow-sm"
          title="刷新便签"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-medium">刷新</span>
        </button>
      </div>

      {/* Segmented Filter */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E5EB] shadow-xs w-fit">
        {[
          { id: "pending", label: "待回复" },
          { id: "replied", label: "已回复" },
          { id: "all", label: "全部手札" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === tab.id
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-[#697180] text-sm shadow-sm">
            正在翻阅手札便签...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
            <span className="font-semibold text-[#292D35]">
              {filter === "pending" ? "便签已全部回复完毕，没有学员在等待" : "暂无相关便签记录"}
            </span>
            <span className="text-xs text-[#697180] mt-1">
              学员在课后打卡提交体感后，便签会自动流转至此处。
            </span>
          </div>
        ) : (
          items.map((item) => {
            const { tags, body } = splitFeeling(item.feeling);
            const isPending = item.reply_status === "pending";
            const val = drafts[item.id] ?? "";
            const untouched = isPending && item.ai_draft && val === item.ai_draft;
            const count = Number(item.training_count || 0);
            const badge = statusBadge[item.reply_status] || {
              label: item.reply_status,
              bg: "bg-gray-100",
              text: "text-gray-600",
              border: "border-gray-200",
            };

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
                  isPending ? "border-[#2563EB]/40 ring-1 ring-[#2563EB]/10" : "border-[#E1E5EB]"
                }`}
              >
                {/* Note Card Header */}
                <div className="p-4 bg-[#F8FAFC] border-b border-[#E1E5EB] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8EEFF] text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden border border-[#2563EB]/20">
                      {item.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        item.member_name ? item.member_name.slice(0, 1) : "学"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#292D35]">
                          {item.member_name || `学员 #${item.member_id}`}
                        </span>
                        <span className="font-mono text-[10px] text-[#697180] bg-[#F0F2F6] px-1.5 py-0.5 rounded">
                          {item.member_code || `#LW${item.member_id}`}
                        </span>
                      </div>
                      <div className="text-xs text-[#697180] mt-0.5 flex items-center gap-1.5">
                        <span>入会 {fmtDate(item.joined_at)}</span>
                        <span>•</span>
                        <span>累计训练 <strong className="text-[#292D35]">{count}</strong> 节</span>
                        {item.last_training_date && (
                          <>
                            <span>•</span>
                            <span>最近 {fmtDate(item.last_training_date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                    <div className="text-[11px] text-[#697180] mt-1 tabular-nums">
                      {isPending ? waitedText(item.created_at) : String(item.created_at).slice(0, 10)}
                    </div>
                  </div>
                </div>

                {/* Member's Feeling Content */}
                <div className="p-5 space-y-3">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F0F2F6] text-[#292D35] border border-[#E1E5EB]"
                        >
                          <Tag className="w-3 h-3 text-[#2563EB]" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="p-4 bg-[#F8FAFC] border-l-4 border-[#2563EB] rounded-r-lg">
                    <div className="text-xs font-medium text-[#697180] mb-1 flex items-center gap-1">
                      <Quote className="w-3.5 h-3.5 text-[#2563EB]" />
                      学员课后随记：
                    </div>
                    {body ? (
                      <p className="text-sm text-[#292D35] leading-relaxed whitespace-pre-wrap">
                        {body}
                      </p>
                    ) : (
                      <p className="text-xs text-[#697180] italic">
                        学员仅勾选了体感标签，未填写补充文字。
                      </p>
                    )}
                  </div>

                  {/* Mentor's Reply Section */}
                  <div className="pt-2">
                    {item.reply_status === "replied" ? (
                      <div className="p-4 bg-[#E8EEFF]/40 border border-[#2563EB]/20 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#2563EB] flex items-center gap-1">
                            <HeartHandshake className="w-3.5 h-3.5" />
                            小桥导师已寄语：
                          </span>
                          <span className="text-[#697180]">已同步学员微信小程序</span>
                        </div>
                        <p className="text-sm text-[#292D35] leading-relaxed whitespace-pre-wrap">
                          {item.xiaoqiao_reply}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Draft bar */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#292D35] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#8B83D7]" />
                            {untouched ? "AI 起草建议（直接修改或重写）：" : "导师回复草稿："}
                          </span>

                          {item.ai_draft && (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setDrafts((p) => ({ ...p, [item.id]: item.ai_draft || "" }))
                                }
                                className="text-[#2563EB] hover:underline flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> 恢复 AI 建议
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrafts((p) => ({ ...p, [item.id]: "" }))}
                                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                              >
                                <Eraser className="w-3 h-3" /> 清空手写
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Input Textarea */}
                        <textarea
                          value={val}
                          onChange={(e) => setDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                          rows={3}
                          placeholder="写下温暖、专业的一两句鼓励与身心关怀..."
                          className={`w-full p-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-colors leading-relaxed ${
                            untouched
                              ? "bg-[#FAFBFD] border-[#E1E5EB] text-[#292D35]"
                              : "bg-white border-[#2563EB]/40 text-[#292D35]"
                          }`}
                        />

                        {/* Reply Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px] text-[#697180]">
                            {val.trim().length} 字
                            {val.trim().length > 100 && (
                              <span className="text-amber-600 ml-1">（建议精简至80字内，手机端更易阅读）</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => dismiss(item)}
                              disabled={saving === item.id}
                              className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] hover:bg-[#F5F7FA] rounded-lg transition-colors"
                            >
                              当面聊过，标记划掉
                            </button>
                            <button
                              type="button"
                              onClick={() => send(item)}
                              disabled={saving === item.id}
                              className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              {saving === item.id ? "正在发送..." : "签名并发送手札"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
