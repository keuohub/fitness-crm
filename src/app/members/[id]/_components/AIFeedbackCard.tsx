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
  const [initialAssessment, setInitialAssessment] = useState<string | null>(null);
  const [iaLoading, setIaLoading] = useState(false);
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

  // 加载 initial_assessment 报告
  useEffect(() => {
    setIaLoading(true);
    fetch(`/api/ai/initial-assessment?memberId=${memberId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.assessment) {
            setInitialAssessment(data.assessment);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIaLoading(false));
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
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm mb-6">
        <h2 className="font-serif text-lg mb-3">洞察记录</h2>
        <p className="text-sm text-[#9E9E9E]">
          请先填写会员问卷，才能生成个性化洞察
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm mb-6">
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
        <p className="text-sm text-[#666666] mb-3">{error}</p>
      )}

      {/* 初始评估报告 */}
      {initialAssessment && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-[#1A1A1A] bg-[#F5F5F5] rounded-full px-3 py-1">
              初始评估
            </span>
          </div>
          <div className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap bg-[#FAFAFA] border border-[#E5E5E5] rounded p-4 max-h-80 overflow-y-auto">
            {initialAssessment}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#9E9E9E]">加载中...</p>
      ) : latestFeedback ? (
        <div className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap bg-[#FAFAFA] border border-[#E5E5E5] rounded p-4">
          {latestFeedback}
        </div>
      ) : (
        <p className="text-sm text-[#9E9E9E]">
          点击「生成今日关怀」，小鹿会为 {memberId} 号会员生成专属反馈
        </p>
      )}
    </div>
  );
}
