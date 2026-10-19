"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGrowthEvents } from "@/hooks/useGrowthEvents";

function getMemberId(): string {
  if (typeof window === "undefined") return "1";
  return localStorage.getItem("portal_member_id") || "1";
}

function getMemberName(): string {
  if (typeof window === "undefined") return "你";
  return localStorage.getItem("portal_member_name") || "你";
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const expires = localStorage.getItem("portal_login_expires");
  if (!expires) return false;
  if (Date.now() > parseInt(expires, 10)) {
    localStorage.removeItem("portal_member_id");
    localStorage.removeItem("portal_member_name");
    localStorage.removeItem("portal_login_expires");
    return false;
  }
  return true;
}

function getLevel(trainingCount: number) {
  if (trainingCount >= 51) return { name: "光芒", emoji: "🦋", stage: "长期主义者" };
  if (trainingCount >= 21) return { name: "新生", emoji: "🌿", stage: "深度蜕变" };
  if (trainingCount >= 6)  return { name: "绽放", emoji: "🌱", stage: "稳定成长" };
  return { name: "遇见", emoji: "✨", stage: "启程" };
}

function daysSince(dateStr: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const MOTIVATIONS: Record<string, { title: string; body: string }> = {
  "启程": {
    title: "你已经迈出了最重要的一步",
    body: "身体需要时间，习惯需要耐心。每一次来，都是对自己的一次郑重承诺。",
  },
  "稳定成长": {
    title: "身体的记忆在被悄悄改写",
    body: "训练不再是需要鼓起勇气的事，而是你生活中自然的一部分。那些变化，正在发生。",
  },
  "深度蜕变": {
    title: "你正在成为你想要的样子",
    body: "半年的坚持不是一个小数字。你的身体从内到外都在被重新塑造，这份力量来自你自己。",
  },
  "长期主义者": {
    title: "坚持，已经是你的一部分",
    body: "一年过去了，你不再需要被提醒要坚持。因为你已经是那个会坚持的人。这不是终点，是新故事的开始。",
  },
};

export default function PortalGrowthPage() {
  const router = useRouter();
  const [member, setMember] = useState<{ id: number; name: string; joinedAt: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/portal/login");
      return;
    }
    const raw = localStorage.getItem("portal_member");
    if (raw) {
      try { setMember(JSON.parse(raw)); } catch {}
    } else {
      setMember({
        id: parseInt(getMemberId(), 10),
        name: getMemberName(),
        joinedAt: "",
      });
    }
    setAuthChecked(true);
  }, [router]);

  const memberId = member?.id ?? 1;
  const memberName = member?.name ?? "你";
  const joinedAt = member?.joinedAt ?? "";

  const { events, loading, error } = useGrowthEvents(memberId);

  const statistics = useMemo(() => {
    const trainings = events.filter((e) => e.type === "training");
    const questionnaires = events.filter((e) => e.type === "questionnaire");
    const photos = events.filter((e) => e.type === "photo");
    const aiReports = events.filter((e) => e.type === "ai_report");
    const level = getLevel(trainings.length);
    const joinDays = joinedAt ? daysSince(joinedAt) : 0;
    return { trainings, questionnaires, photos, aiReports, level, joinDays };
  }, [events, joinedAt]);

  const motivation = MOTIVATIONS[statistics.level.stage] || MOTIVATIONS["启程"];

  const fmt = (n: number) => n === 0 ? "—" : String(n);

  if (!authChecked || loading) {
    return (
      <div className="py-12 px-4 space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-[#F5F5F5] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-[#666666]">遇到了一点小问题：{error}</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 space-y-8">
      {/* 问候语 */}
      <div className="pt-2 space-y-4">
        <div>
          <p className="text-lg font-medium text-[#1A1A1A] leading-relaxed">
            {memberName}
            {statistics.level.stage === "启程"
              ? "，欢迎来到属于你的成长空间"
              : statistics.level.stage === "稳定成长"
              ? "，每一次来，都在悄悄改写身体的记忆"
              : statistics.level.stage === "深度蜕变"
              ? "，你已经走了很远，比你想的更远"
              : "，坚持已经是你的一部分。这不是终点，是新故事的开始"}
          </p>
          <p className="text-sm text-[#666666] mt-2 leading-relaxed">
            {statistics.trainings.length === 0
              ? "从第一次训练开始，你的每一滴汗水都会被认真记录。慢慢来，身体会记住的。"
              : statistics.trainings.length < 6
              ? "你已经完成了 " + statistics.trainings.length + " 次训练。身体正在适应，习惯正在形成。这 " + statistics.trainings.length + " 次，每一次都算数。"
              : statistics.trainings.length < 21
              ? statistics.trainings.length + " 次训练。这不是一个小数字。你的身体从内到外，都在被重新塑造。"
              : statistics.trainings.length < 51
              ? statistics.trainings.length + " 次训练。半百之约，你的身体已经完全不同了。"
              : statistics.trainings.length + " 次训练。一年多的坚持，这已经不只是训练了，这是你选择的生活。"}
          </p>
        </div>
        {statistics.joinDays > 0 && (
          <p className="text-sm text-[#AAAAAA]">
            一起走过了 {statistics.joinDays} 天
            {statistics.joinDays >= 365 ? "。谢谢你，把这么长的时光交给了徕舞。" :
             statistics.joinDays >= 180 ? "。半年的相伴，你的变化我们都看在眼里。" :
             statistics.joinDays >= 90 ? "。三个月，足够让一个习惯变成本能。" :
             statistics.joinDays >= 30 ? "。一个月了，你还在坚持，这就是最好的开始。" :
             "。故事才刚刚开始。"}
          </p>
        )}
      </div>

      {/* 小桥的每日一语 */}
      <div className="text-center py-8 border-y border-[#F0F0F0]">
        <p className="text-[11px] tracking-[0.2em] font-medium text-[#AAAAAA] mb-4">
          小桥的悄悄话
        </p>
        <p className="text-xl text-[#1A1A1A] leading-relaxed italic max-w-xs mx-auto">
          &ldquo;{motivation.title}&rdquo;
        </p>
        <p className="text-sm text-[#666666] mt-4 leading-relaxed max-w-sm mx-auto">
          {motivation.body}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-2xl mb-1">{statistics.level.emoji}</p>
          <p className="text-xs text-[#AAAAAA]">你的阶段</p>
          <p className="text-sm font-medium text-[#1A1A1A] mt-1">{statistics.level.name}</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-xl font-medium text-[#1A1A1A]">{fmt(statistics.joinDays)}</p>
          <p className="text-xs text-[#AAAAAA]">一起走过的日子</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-xl font-medium text-[#1A1A1A]">{fmt(statistics.trainings.length)}</p>
          <p className="text-xs text-[#AAAAAA]">你为自己努力的次数</p>
          <p className="text-[10px] text-[#AAAAAA] mt-0.5">每一次都算数</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-xl font-medium text-[#1A1A1A]">{fmt(statistics.questionnaires.length)}</p>
          <p className="text-xs text-[#AAAAAA]">你认真了解自己的次数</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-xl font-medium text-[#1A1A1A]">{fmt(statistics.photos.length)}</p>
          <p className="text-xs text-[#AAAAAA]">你记录变化的次数</p>
          <p className="text-[10px] text-[#AAAAAA] mt-0.5">每一次都珍贵</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 text-center">
          <p className="text-xl font-medium text-[#1A1A1A]">{fmt(statistics.aiReports.length)}</p>
          <p className="text-xs text-[#AAAAAA]">小桥给你的悄悄话</p>
        </div>
      </div>

      {/* 成长足迹 */}
      <div>
        <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">你的成长足迹</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[#AAAAAA] text-center py-12 leading-relaxed">
            你的成长故事即将开始<br />
            <span className="text-xs">每一次训练，都会在这里留下温暖的印记</span>
          </p>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-3 border-b border-[#F0F0F0] last:border-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center text-xs text-[#666666]">
                  {event.type === "training" ? "训" :
                   event.type === "questionnaire" ? "卷" :
                   event.type === "photo" ? "照" :
                   event.type === "ai_report" ? "AI" :
                   event.type === "milestone" ? "🏆" :
                   event.type === "join" ? "入" : "·"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A1A] font-medium truncate">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-[#666666] mt-0.5 line-clamp-2">{event.description}</p>
                  )}
                  <p className="text-xs text-[#AAAAAA] mt-1">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
