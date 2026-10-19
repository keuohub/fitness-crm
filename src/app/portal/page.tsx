"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalEntry() {
  const router = useRouter();

  useEffect(() => {
    const expires = localStorage.getItem("portal_login_expires");
    if (expires && Date.now() <= parseInt(expires, 10)) {
      router.replace("/portal/growth");
    } else {
      router.replace("/portal/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
