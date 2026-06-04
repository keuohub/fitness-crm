"use client";

import { usePortalMember } from "@/context/PortalMemberContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { member, loading, error } = usePortalMember();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (error === "AUTH_REQUIRED" || !member) {
      if (pathname !== "/portal/login") {
        router.replace("/portal/login");
      }
    }
  }, [loading, error, member, pathname, router]);

  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-sm text-[#3E2723] font-medium mb-2">正在验证身份...</p>
        <p className="text-xs text-[#9E8E7E]">
          {error ? `验证失败：${error}，即将跳转到登录页` : "如长时间未跳转，请手动刷新页面"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
