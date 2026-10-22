"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

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

      // 提取重定向地址，默认前往月度之星封面画报
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect") || "/admin/stars";
      window.location.href = redirectUrl;
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#FAFAFA]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-5"
            style={{ backgroundColor: `${COLORS.primary}14` }}
          >
            <span
              className="text-xl font-serif"
              style={{ color: COLORS.primary }}
            >
              L
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            徕舞管理中心
          </h1>
          <p className="text-sm text-[#9E9E9E] mt-2">
            管理员登录
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#666666] font-medium mb-2">
              账号 (支持邮箱或直接输入 admin)
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@laiwu.fitness 或 admin"
              className="w-full h-12 px-4 rounded-xl bg-white text-sm text-[#1A1A1A] placeholder-[#9E9E9E] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
              style={{ border: `1px solid ${COLORS.border}` }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-[#666666] font-medium mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full h-12 px-4 rounded-xl bg-white text-sm text-[#1A1A1A] placeholder-[#9E9E9E] outline-none transition-all focus:ring-2 focus:ring-[#1A1A1A]/20"
              style={{ border: `1px solid ${COLORS.border}` }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "#C62828", fontWeight: 500 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: COLORS.primary,
              boxShadow: `0 4px 20px ${COLORS.primary}30`,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#333333")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.primary)
            }
          >
            {loading ? "正在登录..." : "登 录"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#EBE4DF] text-center">
          <p className="text-xs text-[#8C827B]">
            默认账号：<code className="text-[#1C1415] font-semibold">admin</code> 或 <code className="text-[#1C1415] font-semibold">admin@laiwu.fitness</code>
          </p>
          <p className="text-xs text-[#8C827B] mt-1">
            忘记密码请联系店主在后台重置
          </p>
        </div>
      </motion.div>
    </div>
  );
}
