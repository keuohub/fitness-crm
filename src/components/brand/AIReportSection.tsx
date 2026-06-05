"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";
import { sanitizeName } from "@/lib/display-name";

const FLOW = ["问卷", "训练记录", "照片记录", "洞察分析", "成长反馈"];

interface ReportSample {
  exists: boolean;
  reportType: string;
  memberName: string;
  content: string;
  generatedAt: string;
}

const reportTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    weekly: "周报",
    monthly: "月报",
    yearly: "年度回顾",
    daily: "每日关怀",
    initial_assessment: "初始评估",
    quarterly: "季度总结",
    "15days": "15日总结",
    semiyearly: "半年总结",
  };
  return map[t] || "阶段回顾";
};

function FlowDiagram() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-8">
      {FLOW.map((step, i) => (
        <div key={step} className="flex items-center gap-3">
          <motion.div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-xs font-semibold text-white"
            style={{
              backgroundColor:
                i === FLOW.length - 1 ? COLORS.primary : "#3E2723",
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.15 }}
          >
            {step}
          </motion.div>
          {i < FLOW.length - 1 && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="flex-shrink-0 opacity-30"
            >
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke={COLORS.primary}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AIReportSection() {
  const [report, setReport] = useState<ReportSample | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai-report-sample")
      .then((r) => r.json())
      .then((d) => {
        if (d?.exists && d.memberName) {
          d.memberName = sanitizeName(d.memberName);
        }
        setReport(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section id="insight" className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-16"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8"
          style={{ color: COLORS.primary }}
        >
          分析引擎
        </p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">
          成长记录
        </h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">
          训练、问卷与照片形成长期档案。
        </p>
      </motion.div>

      <FlowDiagram />

      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="mt-16 rounded-3xl p-10 max-w-2xl mx-auto"
        style={{
          background: "#FAF7F2",
          boxShadow: "0 2px 20px rgba(62,39,35,0.05)",
        }}
      >
        <div className="space-y-6">
          {loading ? (
            <p className="text-sm text-[#6E6E73]">加载样本...</p>
          ) : report?.exists ? (
            <>
              <div>
                <p
                  className="text-[10px] uppercase tracking-wider font-medium mb-1"
                  style={{ color: COLORS.primary }}
                >
                  {reportTypeLabel(report.reportType)} ·{" "}
                  {report.generatedAt?.slice(0, 7) ?? ""}
                </p>
                <p className="text-xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">
                  {report.memberName}的{reportTypeLabel(report.reportType)}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[#3E2723] leading-relaxed">
                  {report.content.length > 200
                    ? report.content.slice(0, 200) + "..."
                    : report.content}
                </p>
                <div
                  className="h-3 rounded-full w-3/4 opacity-10"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <div
                  className="h-3 rounded-full w-1/2 opacity-10"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <div
                  className="h-3 rounded-full w-2/3 opacity-10"
                  style={{ backgroundColor: COLORS.primary }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <div
                  className="rounded-full px-3 py-1 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${COLORS.primary}14`,
                    color: COLORS.primary,
                  }}
                >
                  真实回顾
                </div>
                <div
                  className="rounded-full px-3 py-1 text-[10px] font-medium"
                  style={{
                    backgroundColor: "#3E2723" + "10",
                    color: "#3E2723",
                  }}
                >
                  自动生成
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p
                  className="text-[10px] uppercase tracking-wider font-medium mb-1"
                  style={{ color: COLORS.primary }}
                >
                  周报 · 2026年5月
                </p>
                <p className="text-xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15]">
                  阶段回顾样本
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[#3E2723] leading-relaxed">
                  系统会根据训练数据、体态照片和健康问卷自动生成个性化反馈报告。
                  报告包含训练分析、体态变化趋势和成长建议。
                </p>
                <div
                  className="h-3 rounded-full w-3/4 opacity-10"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <div
                  className="h-3 rounded-full w-1/2 opacity-10"
                  style={{ backgroundColor: COLORS.primary }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <div
                  className="rounded-full px-3 py-1 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${COLORS.primary}14`,
                    color: COLORS.primary,
                  }}
                >
                  接入数据
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </section>
  );
}
