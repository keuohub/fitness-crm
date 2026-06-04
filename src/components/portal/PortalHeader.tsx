"use client";

import { usePortalMember } from "@/context/PortalMemberContext";
import { getMemberLevel, daysSince } from "@/lib/member-level";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "上午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

interface Props {
  title?: string;
  showBack?: boolean;
}

export default function PortalHeader({ title, showBack }: Props) {
  const { member, loading } = usePortalMember();
  const router = useRouter();
  const pathname = usePathname();
  const greeting = getGreeting();

  const isHome = pathname === "/portal";

  if (loading || !member) {
    return (
      <header className="px-6 pt-12 pb-6">
        <div className="h-12 animate-pulse rounded-xl bg-white/50" />
      </header>
    );
  }

  const days = daysSince(member.joinedAt);
  const level = getMemberLevel(days);
  const initial = (member.memberName || "徕")[0];

  return (
    <header className="px-6 pt-12 pb-4" style={{ paddingTop: "max(48px, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-3">
        {/* Back button */}
        {showBack && !isHome && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm flex-shrink-0"
            style={{ boxShadow: "0 2px 8px rgba(62,39,35,0.06)" }}
          >
            <ChevronLeft size={18} className="text-[#3E2723]" />
          </button>
        )}

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif flex-shrink-0"
          style={{ backgroundColor: "rgba(139,94,60,0.12)", color: "#8B5E3C" }}
        >
          {initial}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="text-sm font-bold text-[#3E2723] truncate">{title}</p>
          ) : (
            <p className="text-sm font-bold text-[#3E2723] truncate">
              {greeting}，{member.memberName}
            </p>
          )}
          {isHome && !title && (
            <p className="text-xs text-[#9E8E7E]">
              {days > 0 ? `第 ${days} 天` : "欢迎加入徕舞"}
            </p>
          )}
          {!isHome && (
            <p className="text-xs text-[#9E8E7E]">
              {days > 0 ? `${days} 天陪伴` : ""}
            </p>
          )}
        </div>

        {/* Level capsule */}
        <div
          className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex-shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(62,39,35,0.04)" }}
        >
          <span className="text-xs font-bold" style={{ color: "#8B5E3C" }}>
            Lv.{level.level}
          </span>
          <span className="text-[10px] text-[#9E8E7E]">{level.title}</span>
        </div>
      </div>
    </header>
  );
}
