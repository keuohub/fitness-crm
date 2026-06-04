"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface Props {
  memberName: string;
  memberId: number;
  joinedAt?: string;
}

export default function MemberStoryCard({ memberName, memberId, joinedAt }: Props) {
  const [quote, setQuote] = useState("");
  const [observation, setObservation] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!quote.trim()) return;
    try {
      await fetch("/api/member-memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          memoryType: "case_study",
          content: quote,
          structuredData: JSON.stringify({ observation, type: "story" }),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent fail
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] p-6"
      style={{
        background: "linear-gradient(160deg, #FFFFFF 0%, #FDF9F5 60%, #F7F1EA 100%)",
        boxShadow: "0 4px 20px rgba(62,39,35,0.05)",
      }}
    >
      <p className="text-xs font-bold text-[#3E2723] mb-4">成长故事</p>
      <p className="text-xs text-[#9E8E7E] mb-4">
        将 {memberName} 的成长经历记录下来，为其他会员提供参考。
      </p>

      <div className="space-y-3 mb-4">
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="会员引用语..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none resize-none"
          style={{ border: `1px solid ${COLORS.border}` }}
        />
        <textarea
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder="教练观察..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] text-sm text-[#3E2723] placeholder-[#9E8E7E] outline-none resize-none"
          style={{ border: `1px solid ${COLORS.border}` }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!quote.trim() || saved}
        className="w-full py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
        style={{
          backgroundColor: saved ? "#16a34a" : COLORS.primary,
          color: "white",
        }}
      >
        {saved ? "已保存" : "保存为案例"}
      </button>
    </motion.div>
  );
}
