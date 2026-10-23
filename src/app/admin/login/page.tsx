"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "账号或密码错误");
        return;
      }

      // 只允许跳回站内后台路径，挡掉 ?redirect=javascript:... 与外部钓鱼地址
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("redirect") || "";
      const safe =
        raw.startsWith("/admin") && !raw.startsWith("//") && !raw.includes("://")
          ? raw
          : "/admin";
      window.location.href = safe;
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4 selection:bg-[#E8EEFF] selection:text-[#2563EB]">
      {/* Container */}
      <div className="w-full max-w-sm bg-white border border-[#E1E5EB] rounded-2xl shadow-sm p-8 space-y-6">
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#2563EB] text-white rounded-xl mx-auto flex items-center justify-center font-bold text-xl tracking-wider shadow-sm">
            LW
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#2563EB] tracking-widest uppercase mt-3">
              LAIWU DIGITAL EDITORIAL
            </div>
            <h1 className="text-xl font-bold text-[#292D35] tracking-tight mt-0.5">
              徕舞女子塑形 · 管理中枢
            </h1>
          </div>
          <p className="text-xs text-[#697180]">
            统一连接学员微信小程序与门店运营业务
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1.5">
              管理员账号 (输入 admin 即可)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1.5">
              安全密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "正在验证身份..." : (
              <>
                进入管理后台 <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#F0F2F6] flex items-center justify-between text-[11px] text-[#697180]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 安全鉴权环境
          </span>
          <span className="tabular-nums">v2.5.0</span>
        </div>
      </div>
    </div>
  );
}
