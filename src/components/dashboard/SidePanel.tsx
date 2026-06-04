"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Training {
  id: number;
  memberId: number;
  memberName: string;
  trainingDate: string;
  type: string;
  durationMinutes: number | null;
  focusArea: string | null;
}

interface ExpiringMember {
  id: number;
  name: string;
  freezeEnd: string;
}

interface SidePanelData {
  pendingFeedbackCount: number;
  recentTrainings: Training[];
  expiringMembers: ExpiringMember[];
}

interface BirthdayMember {
  id: number;
  name: string;
  birthday: string;
}

const typeLabel: Record<string, string> = {
  private: "私教",
  group: "团课",
  assessment: "评估",
};

export default function SidePanel({ data }: { data: SidePanelData | null }) {
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [blessingGenerating, setBlessingGenerating] = useState(false);
  const [blessingResult, setBlessingResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/birthday-blessing")
      .then((r) => r.json())
      .then((d) => setBirthdays(d.birthdays || []))
      .catch(() => {});
  }, []);

  const handleGenerateBlessing = async () => {
    setBlessingGenerating(true);
    try {
      const res = await fetch("/api/ai/birthday-blessing", { method: "POST" });
      const d = await res.json();
      if (d.todayBirthdays?.length > 0) {
        setBlessingResult(`已为 ${d.todayBirthdays.length} 位寿星生成祝福`);
      }
    } catch {
      // silent
    } finally {
      setBlessingGenerating(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[#FAF7F2] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 今日待办（主卡，数字突出）── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-sm text-[#3E2723]">今日待办</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${data.pendingFeedbackCount > 0 ? "bg-[#D4736A]/10 text-[#D4736A]" : "bg-[#8B5E3C]/10 text-[#8B5E3C]"}`}>
            {data.pendingFeedbackCount > 0 ? `${data.pendingFeedbackCount} 位待生成` : "全部完成"}
          </span>
        </div>
        <p className="text-5xl font-bold text-[#3E2723]">{data.pendingFeedbackCount}</p>
        <p className="text-xs text-[#9E8E7E] mt-1">位会员尚未生成今日反馈</p>
        {data.pendingFeedbackCount > 0 && (
          <Link
            href="/admin/sync"
            className="mt-3 inline-block text-xs text-[#8B5E3C] hover:underline"
          >
            前往生成 →
          </Link>
        )}
      </div>

      {/* ── 今日生日（暖色渐变底 + 图标）── */}
      <div
        className="rounded-2xl shadow-sm border border-[#E8E0D5] p-5"
        style={{
          background: "linear-gradient(135deg, rgba(139,94,60,0.06) 0%, #FFFFFF 60%)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-sm text-[#3E2723]">今日生日</h3>
          {birthdays.length > 0 && (
            <div className="w-8 h-8 rounded-full bg-[#8B5E3C]/10 flex items-center justify-center text-sm">
              🎂
            </div>
          )}
        </div>
        {birthdays.length === 0 ? (
          <p className="text-xs text-[#9E8E7E]">今日无生日会员</p>
        ) : (
          <>
            <div className="space-y-1.5 mb-3">
              {birthdays.map((m) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-2 text-sm hover:bg-[#8B5E3C]/10 -mx-1 px-1 py-0.5 rounded"
                >
                  <span className="text-base">🎂</span>
                  <span className="text-[#3E2723]">{m.name}</span>
                </Link>
              ))}
            </div>
            <button
              onClick={handleGenerateBlessing}
              disabled={blessingGenerating}
              className="w-full text-xs py-1.5 rounded-lg bg-[#8B5E3C]/10 text-[#8B5E3C] hover:bg-[#8B5E3C]/20 transition-colors disabled:opacity-50"
            >
              {blessingGenerating ? "生成中..." : "生成生日祝福"}
            </button>
            {blessingResult && (
              <p className="text-xs text-[#8B5E3C] mt-2">{blessingResult}</p>
            )}
          </>
        )}
      </div>

      {/* ── 最近训练（左侧时间标识）── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-5">
        <h3 className="font-serif text-sm text-[#3E2723] mb-3">最近训练</h3>
        {data.recentTrainings.length === 0 ? (
          <p className="text-xs text-[#9E8E7E]">暂无训练记录</p>
        ) : (
          <div className="space-y-2">
            {data.recentTrainings.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#8B5E3C] shrink-0">{t.trainingDate.slice(5)}</span>
                  <Link href={`/members/${t.memberId}`} className="text-[#3E2723] hover:underline truncate block">
                    {t.memberName}
                  </Link>
                </div>
                <span className="text-[#9E8E7E] shrink-0 ml-2">
                  {typeLabel[t.type] || t.type}{t.durationMinutes ? ` ${t.durationMinutes}min` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 快到期会员（左侧警告边条）── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] border-l-4 border-l-[#D4736A] p-5">
        <h3 className="font-serif text-sm text-[#3E2723] mb-3">快到期会员</h3>
        {data.expiringMembers.length === 0 ? (
          <p className="text-xs text-[#9E8E7E]">7天内无到期会员</p>
        ) : (
          <div className="space-y-2">
            {data.expiringMembers.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center justify-between text-xs hover:bg-[#FAF7F2] -mx-1 px-1 py-1 rounded"
              >
                <span className="text-[#3E2723]">{m.name}</span>
                <span className="text-[#D4736A] font-medium">{m.freezeEnd}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
