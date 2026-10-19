"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function daysSince(dateStr: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getLevel(trainingCount: number) {
  if (trainingCount >= 51) return { name: "光芒", emoji: "🦋" };
  if (trainingCount >= 21) return { name: "新生", emoji: "🌿" };
  if (trainingCount >= 6)  return { name: "绽放", emoji: "🌱" };
  return { name: "遇见", emoji: "✨" };
}

interface MemberData {
  name: string;
  memberNo?: string;
  joinedAt: string;
  desiredState?: string;
  trainingCount: number;
}

export default function PortalMePage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/portal/login");
      return;
    }

    const memberId = getMemberId();

    Promise.all([
      fetch(`/api/members/${memberId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/trainings?memberId=${memberId}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([memberData, trainings]) => {
        const trainingCount = Array.isArray(trainings) ? trainings.length : 0;
        setMember({
          name: memberData?.name || getMemberName(),
          memberNo: memberData?.memberNo || memberData?.member_code,
          joinedAt: memberData?.joinedAt || memberData?.joined_at || "",
          desiredState: memberData?.desiredState || memberData?.desired_state || "",
          trainingCount,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("portal_member_id");
    localStorage.removeItem("portal_member_name");
    localStorage.removeItem("portal_login_expires");
    localStorage.removeItem("portal_member");
    router.replace("/portal/login");
  };

  if (loading) {
    return (
      <div className="py-12 px-4 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[#F5F5F5] animate-pulse" />
          <div className="h-5 w-24 bg-[#F5F5F5] rounded animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-[#F5F5F5] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-20 text-center px-4">
        <p className="text-sm text-[#666666] leading-relaxed">
          暂时无法获取你的信息<br />
          <span className="text-xs text-[#AAAAAA]">下拉刷新试试看</span>
        </p>
      </div>
    );
  }

  const level = getLevel(member.trainingCount);
  const joinDays = member.joinedAt ? daysSince(member.joinedAt) : 0;
  const initial = member.name ? member.name.charAt(0) : "?";

  return (
    <div className="py-8 px-4 space-y-6">
      {/* 头像和名字 */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="w-20 h-20 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-2xl font-light">
          {initial}
        </div>
        <p className="text-lg font-medium text-[#1A1A1A]">{member.name}</p>
      </div>

      {/* 信息卡片 */}
      <div className="bg-white border border-[#EBEBEB] rounded-lg divide-y divide-[#F0F0F0]">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-[#666666]">你的阶段</span>
          <span className="text-sm font-medium text-[#1A1A1A]">{level.emoji} {level.name}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-[#666666]">一起走过的日子</span>
          <span className="text-sm font-medium text-[#1A1A1A]">{joinDays} 天</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-[#666666]">你为自己努力的次数</span>
          <span className="text-sm font-medium text-[#1A1A1A]">{member.trainingCount} 次</span>
        </div>
        {member.memberNo && (
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-[#666666]">你的专属编号</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{member.memberNo}</span>
          </div>
        )}
        {member.joinedAt && (
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-[#666666]">你来的那天</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{member.joinedAt.slice(0, 10)}</span>
          </div>
        )}
        {member.desiredState && (
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-[#666666]">你想要的改变</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{member.desiredState}</span>
          </div>
        )}
      </div>

      {/* 暂时离开 */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="w-full border border-[#EBEBEB] text-[#AAAAAA] rounded-lg px-4 py-3 text-sm font-medium hover:text-[#666666] hover:border-[#D0D0D0] transition-colors duration-200"
        >
          暂时离开
        </button>
      </div>
    </div>
  );
}
