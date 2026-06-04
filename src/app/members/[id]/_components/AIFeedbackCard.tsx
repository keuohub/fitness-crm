"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AIFeedbackCardProps {
  memberId: number;
  hasQuestionnaire: boolean;
}

interface FeedbackData {
  feedback: string;
  reportId: number;
}

export default function AIFeedbackCard({ memberId, hasQuestionnaire }: AIFeedbackCardProps) {
  const [latestFeedback, setLatestFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // 加载最近一条 daily 反馈
  useEffect(() => {
    setLoading(true);
    fetch(`/api/ai/daily-feedback?memberId=${memberId}&latest=1`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.feedback) {
            setLatestFeedback(data.feedback);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/ai/daily-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        const data: FeedbackData = await res.json();
        setLatestFeedback(data.feedback);
      } else {
        const err = await res.json();
        setError(err.error || "生成失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  // 无问卷 → 提示
  if (!hasQuestionnaire) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
        <h2 className="font-serif text-lg mb-3">洞察记录</h2>
        <p className="text-sm text-[#9E8E7E]">
          请先填写会员问卷，才能生成个性化洞察
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg">洞察记录</h2>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "小鹿正在思考..." : "生成今日关怀"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-[#D4736A] mb-3">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[#9E8E7E]">加载中...</p>
      ) : latestFeedback ? (
        <div className="text-sm text-[#3E2723] leading-relaxed whitespace-pre-wrap bg-[#FAF7F2] border border-[#E8E0D5] rounded p-4">
          {latestFeedback}
        </div>
      ) : (
        <p className="text-sm text-[#9E8E7E]">
          点击「生成今日关怀」，小鹿会为 {memberId} 号会员生成专属反馈
        </p>
      )}
    </div>
  );
}
