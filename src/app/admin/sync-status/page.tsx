"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface SyncLog {
  timestamp: string;
  source: string;
  status: string;
  memberCode?: string;
  memberName?: string;
  message: string;
}

export default function SyncStatusPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sync/feishu")
      .then((r) => r.json())
      .then((data) => {
        setLastSync(data.lastSyncAt);
        setLogs(data.recentLogs || []);
      })
      .catch(() => {});
  }, []);

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/sync" className="text-sm text-[#9E8E7E] hover:underline">
            -- 返回同步面板
          </Link>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-6">同步状态</h1>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
            <p className="text-2xl font-serif font-bold" style={{ color: COLORS.primary }}>
              {lastSync ? new Date(lastSync).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--"}
            </p>
            <p className="text-xs text-[#9E8E7E] mt-1">最后同步</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
            <p className="text-2xl font-serif font-bold text-green-700">{successCount}</p>
            <p className="text-xs text-[#9E8E7E] mt-1">成功</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
            <p className="text-2xl font-serif font-bold" style={{ color: "#D4736A" }}>{errorCount}</p>
            <p className="text-xs text-[#9E8E7E] mt-1">失败</p>
          </div>
        </div>

        {/* Log list */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)" }}>
          <h2 className="font-serif text-lg mb-4">最近日志</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-[#9E8E7E]">暂无同步记录</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between py-2 px-3 rounded-xl text-sm"
                  style={{
                    background: log.status === "error" ? "#D4736A08" : "#FAF7F2",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          log.status === "success"
                            ? "#16a34a"
                            : log.status === "error"
                            ? "#D4736A"
                            : "#9E8E7E",
                      }}
                    />
                    <span className="truncate text-[#3E2723]">
                      {log.memberName || log.message}
                    </span>
                  </div>
                  <span className="text-xs text-[#9E8E7E] flex-shrink-0 ml-2">
                    {log.timestamp?.slice(11, 16) || ""}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
