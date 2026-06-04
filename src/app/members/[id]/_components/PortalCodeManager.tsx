"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface Props {
  memberId: number;
}

export default function PortalCodeManager({ memberId }: Props) {
  const [portalCode, setPortalCode] = useState<string | null>(null);
  const [portalEnabled, setPortalEnabled] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/portal/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action: "get-code" }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPortalCode(data.portalCode || null);
        setPortalEnabled(data.portalEnabled || 0);
      })
      .catch(() => {});
  }, [memberId]);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await fetch("/api/portal/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action: "generate-code" }),
    });
    const data = await res.json();
    if (data.portalCode) {
      setPortalCode(data.portalCode);
      setPortalEnabled(1);
    }
    setLoading(false);
  };

  const handleToggle = async () => {
    setLoading(true);
    const res = await fetch("/api/portal/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action: "toggle-enabled" }),
    });
    const data = await res.json();
    setPortalEnabled(data.portalEnabled);
    setLoading(false);
  };

  const handleCopy = () => {
    if (portalCode) {
      navigator.clipboard.writeText(portalCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #FDF9F5 0%, #FFF 100%)",
        border: "1px solid #E8E0D5",
      }}
    >
      <p className="font-serif text-sm font-bold text-[#3E2723] mb-4">会员 Portal 邀请码</p>

      {portalCode ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <code className="flex-1 h-10 px-4 rounded-xl bg-[#FAF7F2] text-lg font-mono font-bold text-[#3E2723] flex items-center tracking-widest"
              style={{ border: "1px solid #E8E0D5" }}>
              {portalCode}
            </code>
            <button
              onClick={handleCopy}
              className="h-10 px-4 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: copied ? "#E8E0D5" : COLORS.primary,
                color: copied ? "#3E2723" : "#FFFFFF",
              }}
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={portalEnabled === 1}
                onChange={handleToggle}
                disabled={loading}
                className="w-4 h-4 rounded accent-[#8B5E3C]"
              />
              <span className="text-sm text-[#3E2723]">已启用</span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs hover:underline transition-colors"
              style={{ color: COLORS.primary }}
            >
              重新生成
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-10 rounded-xl text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: COLORS.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A86545")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}
        >
          {loading ? "生成中..." : "生成邀请码"}
        </button>
      )}
    </div>
  );
}
