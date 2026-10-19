"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/portal/login") return;

    const expires = localStorage.getItem("portal_login_expires");
    const memberId = localStorage.getItem("portal_member_id");

    if (!expires || !memberId || Date.now() > parseInt(expires, 10)) {
      router.replace("/portal/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
