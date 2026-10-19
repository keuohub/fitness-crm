"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface FeelingItem {
  id: number;
  member_id: number;
  feeling: string;
  xiaoqiao_reply: string | null;
  created_at: string;
}

export default function MemberFeelingsCard({ memberId }: { memberId: number }) {
  const [feelings, setFeelings] = useState<FeelingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFeelings = () => {
    fetch(`/api/admin/training-feelings?memberId=${memberId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFeelings(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadFeelings();
  }, [memberId]);

  const handleSaveReply = async (feelingId: number) => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feelingId, reply: replyText.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        setReplyText("");
        loadFeelings();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm mb-6">
        <h2 className="font-serif text-lg text-[#1A1A1A] mb-2">会员课后心声 · 便签留言</h2>
        <p className="text-sm text-[#9E9E9E]">正在加载会员心声...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg text-[#1A1A1A]">会员课后心声 · 小桥来信互动</h2>
          <p className="text-xs text-[#9E9E9E] mt-0.5">
            会员在小程序「今日私享便签」发送的感受，系统与小桥后台实时同步
          </p>
        </div>
        <span className="text-xs bg-[#FAF5F0] text-[#8B5E3C] px-2.5 py-1 rounded-full border border-[#8B5E3C]/20">
          共 {feelings.length} 条心声
        </span>
      </div>

      {feelings.length === 0 ? (
        <div className="text-center py-6 text-[#9E9E9E] text-sm bg-[#FAFAFA] rounded-lg border border-dashed border-[#E5E5E5]">
          该会员尚未在小程序提交课后便签
        </div>
      ) : (
        <div className="space-y-4">
          {feelings.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm space-y-2.5 transition-all hover:border-[#8B5E3C]/40"
            >
              {/* 会员心声内容 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs text-[#9E9E9E]">会员留言 · {item.created_at?.slice(0, 16)}</span>
                  <p className="text-[#1A1A1A] font-medium mt-1 whitespace-pre-wrap">{item.feeling}</p>
                </div>
              </div>

              {/* 小桥回信区域 */}
              <div className="mt-2 pt-2.5 border-t border-[#E5E5E5]/70 bg-white p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#8B5E3C] flex items-center gap-1">
                    <span>💌</span> 小桥回音
                  </span>
                  {editingId !== item.id && (
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setReplyText(item.xiaoqiao_reply || "");
                      }}
                      className="text-xs text-[#9E9E9E] hover:text-[#8B5E3C] underline"
                    >
                      修改回音
                    </button>
                  )}
                </div>

                {editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full text-xs p-2.5 border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#8B5E3C]"
                      rows={3}
                      placeholder="输入以小桥口吻的温柔回音..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setReplyText("");
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => handleSaveReply(item.id)}
                        className="bg-[#8B5E3C] text-white hover:bg-[#724b2f]"
                      >
                        {saving ? "保存中..." : "保存回音"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#4A4A4A] leading-relaxed whitespace-pre-wrap">
                    {item.xiaoqiao_reply || "（暂无回信，点击上方修改进行撰写）"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
