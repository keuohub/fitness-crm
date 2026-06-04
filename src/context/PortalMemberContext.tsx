"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface PortalMember {
  memberId: number;
  memberName: string;
  joinedAt: string;
}

interface PortalMemberContextValue {
  member: PortalMember | null;
  loading: boolean;
  error: string | null;
}

const PortalMemberContext = createContext<PortalMemberContextValue>({
  member: null,
  loading: true,
  error: null,
});

export function PortalMemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<PortalMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch("/api/portal/me", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "AUTH_REQUIRED" : "SERVER_ERROR");
        return r.json();
      })
      .then((data) => {
        setMember({
          memberId: data.memberId,
          memberName: data.memberName || "会员",
          joinedAt: data.joinedAt || "",
        });
      })
      .catch((err) => {
        console.error("[PortalMemberContext] fetch /api/portal/me 失败:", err.message, err);
        if (err.name === "AbortError") {
          setError("网络超时，请检查连接");
        } else if (err.message === "AUTH_REQUIRED") {
          setError("AUTH_REQUIRED");
        } else {
          setError("加载失败");
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

  return (
    <PortalMemberContext.Provider value={{ member, loading, error }}>
      {children}
    </PortalMemberContext.Provider>
  );
}

export function usePortalMember() {
  return useContext(PortalMemberContext);
}
