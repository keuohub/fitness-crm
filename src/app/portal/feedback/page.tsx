"use client";

import { useEffect, useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  daily: "每日关怀",
  weekly: "周报",
  monthly: "月报",
  "15days": "15日总结",
  quarterly: "季度总结",
  semiyearly: "半年总结",
  yearly: "年度总结",
  initial_assessment: "小桥的初始评估",
};

interface Report {
  id: number;
  reportType: string;
  content: string;
  generatedAt: string;
}

export default function PortalFeedbackPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let memberId = 1;
    try {
      const raw = localStorage.getItem("portal_member");
      if (raw) {
        const m = JSON.parse(raw);
        if (m.id) memberId = m.id;
      }
    } catch {}

    fetch(`/api/ai/period-report?memberId=${memberId}`)
      .then((res) => {
        if (!res.ok) throw new Error("暂时没能加载");
        return res.json();
      })
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-12 px-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-[#F5F5F5] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center px-4">
        <p className="text-sm text-[#666666] leading-relaxed">
          {error}<br />
          <span className="text-xs text-[#AAAAAA]">下拉刷新试试看</span>
        </p>
      </div>
    );
  }

  const latest = reports[0];
  const history = reports.slice(1);

  return (
    <div className="py-6 px-4 space-y-8">
      {/* 引导语 */}
      <div className="pt-2">
        <p className="text-sm text-[#AAAAAA]">小桥写给你的话</p>
        <p className="text-lg font-medium text-[#1A1A1A] mt-1">
          每一次训练后，她都在认真记录你的变化
        </p>
      </div>

      {/* 最新一封 */}
      {latest ? (
        <div>
          <h2 className="text-sm font-medium text-[#1A1A1A] mb-4">最新一封</h2>
          <div className="bg-white border border-[#EBEBEB] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#1A1A1A] bg-[#F5F5F5] rounded-full px-3 py-1">
                {TYPE_LABEL[latest.reportType] || latest.reportType}
              </span>
              <span className="text-xs text-[#AAAAAA]">{latest.generatedAt?.slice(0, 10)}</span>
            </div>
            <p className="text-sm text-[#666666] leading-[1.8] whitespace-pre-wrap">
              {latest.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-[#666666] leading-relaxed">
            小桥正在为你准备第一份成长报告
          </p>
          <p className="text-xs text-[#AAAAAA] mt-2 leading-relaxed">
            每次训练后她都会认真记录你的变化<br />
            这些文字，是属于你的成长日记
          </p>
        </div>
      )}

      {/* 过往的来信 */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#1A1A1A] mb-4">过往的来信</h2>
          <div className="space-y-3">
            {history.map((r) => (
              <div key={r.id} className="bg-white border border-[#EBEBEB] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#1A1A1A] bg-[#F5F5F5] rounded-full px-3 py-1">
                    {TYPE_LABEL[r.reportType] || r.reportType}
                  </span>
                  <span className="text-xs text-[#AAAAAA]">{r.generatedAt?.slice(0, 10)}</span>
                </div>
                <p className="text-sm text-[#666666] leading-[1.8] line-clamp-4 whitespace-pre-wrap">
                  {r.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
