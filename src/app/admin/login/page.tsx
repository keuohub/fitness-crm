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
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      window.location.href = "/members";
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#FAF7F2]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5"
            style={{ backgroundColor: `${COLORS.primary}14` }}
          >
            <span
              className="text-xl font-serif"
              style={{ color: COLORS.primary }}
            >
              L
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#3E2723]">
            徕舞管理中心
          </h1>
          <p className="text-sm text-[#9E8E7E] mt-2">
            管理员登录
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#9E8E7E] mb-2">
              账号
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@laiwu.fitness"
              className="w-full h-12 px-4 rounded-xl bg-white text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
              style={{ border: `1px solid ${COLORS.border}` }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-[#9E8E7E] mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入管理员密码"
              className="w-full h-12 px-4 rounded-xl bg-white text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none transition-all focus:ring-2 focus:ring-[#8B5E3C]/20"
              style={{ border: `1px solid ${COLORS.border}` }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "#D4736A" }}>
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
              (e.currentTarget.style.backgroundColor = "#A86545")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.primary)
            }
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
