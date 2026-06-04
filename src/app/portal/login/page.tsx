"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/portal/ui/GlassCard";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MOTION_DURATIONS } from "@/lib/design/motion";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"phone" | "invite">("phone");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!phone.trim() || !/^\d{11}$/.test(phone.trim())) { setError("请输入正确的手机号"); return; }
    setError("");
    const res = await fetch("/api/auth/sms/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim() }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "发送失败"); return; }
    setSendCooldown(59);
    const timer = setInterval(() => setSendCooldown((p) => { if (p <= 1) { clearInterval(timer); return 0; } return p - 1; }), 1000);
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !/^\d{11}$/.test(phone.trim())) { setError("请输入正确的11位手机号"); return; }
    if (!code.trim()) { setError("请输入验证码"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/login-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "登录失败"); return; }
      window.location.href = "/portal";
      navigator.sendBeacon?.("/api/portal/track", JSON.stringify({ event: "login", page: "/portal/login" }));
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError("请输入邀请码"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "验证失败"); return; }
      window.location.href = "/portal";
      navigator.sendBeacon?.("/api/portal/track", JSON.stringify({ event: "login", page: "/portal/login" }));
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: MOTION_DURATIONS.normal }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-12">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6"
            style={{
              backgroundColor: `${COLORS.primary}14`,
              boxShadow: `0 4px 20px ${COLORS.primary}15`,
            }}
          >
            <span className="text-2xl font-serif" style={{ color: COLORS.primary }}>L</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#3E2723]">徕舞女子塑形</h1>
          <p className="text-sm text-[#9E8E7E] mt-2">会员成长空间</p>
        </div>

        {/* ── Tab切换 ── */}
        <div className="flex mb-6 rounded-xl p-1" style={{ backgroundColor: "#FAF7F2" }}>
          <button
            onClick={() => { setMode("phone"); setError(""); }}
            className="flex-1 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: mode === "phone" ? "white" : "transparent",
              color: mode === "phone" ? COLORS.primary : "#9E8E7E",
              boxShadow: mode === "phone" ? "0 1px 4px rgba(62,39,35,0.06)" : "none",
            }}
          >
            手机号
          </button>
          <button
            onClick={() => { setMode("invite"); setError(""); }}
            className="flex-1 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: mode === "invite" ? "white" : "transparent",
              color: mode === "invite" ? COLORS.primary : "#9E8E7E",
              boxShadow: mode === "invite" ? "0 1px 4px rgba(62,39,35,0.06)" : "none",
            }}
          >
            邀请码
          </button>
        </div>

        <GlassCard padding="md" hover={false}>
          {mode === "phone" ? (
            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label className="block text-xs text-[#9E8E7E] mb-2">手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="输入手机号"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                  style={{ border: `1px solid ${COLORS.border}` }}
                  autoFocus
                  maxLength={11}
                />
              </div>
              <div>
                <label className="block text-xs text-[#9E8E7E] mb-2">验证码</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="输入验证码"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                  style={{ border: `1px solid ${COLORS.border}` }}
                  maxLength={6}
                />
                <button type="button" onClick={handleSendCode} disabled={sendCooldown > 0} className="text-[10px] mt-1 font-medium hover:underline" style={{ color: sendCooldown > 0 ? "#9E8E7E" : COLORS.primary }}>{sendCooldown > 0 ? `${sendCooldown}s 后重发` : "发送验证码"}</button>
              </div>
              {error && <p className="text-xs" style={{ color: "#D4736A" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: COLORS.primary, boxShadow: `0 4px 20px ${COLORS.primary}30` }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A86545")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}
              >
                {loading ? "验证中..." : "进入我的空间"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleInviteLogin} className="space-y-5">
              <div>
                <label className="block text-xs text-[#9E8E7E] mb-2">邀请码</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="输入教练给你的邀请码"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
                  style={{ border: `1px solid ${COLORS.border}` }}
                  autoFocus
                />
              </div>
              {error && <p className="text-xs" style={{ color: "#D4736A" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: COLORS.primary, boxShadow: `0 4px 20px ${COLORS.primary}30` }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A86545")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}
              >
                {loading ? "验证中..." : "进入我的空间"}
              </button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
