"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

interface CaseItem {
  memberId: number;
  name: string;
  role: string;
  totalTrainings: number;
  daysSinceJoin: number;
  latestAiComment: string | null;
}

export default function CasesSection() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data) => { setCases(data.cases ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <section className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
        <div className="text-center text-sm text-[#AAAAAA]">加载成长档案...</div>
      </section>
    );
  }

  if (cases.length === 0) {
    return (
      <section className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
        <div className="text-center text-sm text-[#AAAAAA]">成长档案即将上线</div>
      </section>
    );
  }

  return (
    <section id="cases" className="max-w-prose mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-16"
          style={{ color: COLORS.primary }}
        >
          成长档案
        </p>

        <h2 className="text-xl sm:text-2xl font-normal text-[#1A1A1A] tracking-normal mb-20 max-w-[12ch]">
          她们的成长记录
        </h2>
      </motion.div>

      <div className="divide-y divide-[#F0F0F0]">
        {cases.map((m) => (
          <motion.article
            key={m.memberId}
            {...MICRO.scrollReveal}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            className="py-12 first:pt-0 last:pb-0"
          >
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-medium mb-6"
              style={{ color: COLORS.primary }}
            >
              {m.role}
            </p>

            <div className="flex items-baseline gap-8 mb-8">
              <div>
                <span
                  className="text-2xl font-semibold text-[#1A1A1A] tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-number, 'Inter', sans-serif)" }}
                >
                  {m.totalTrainings}
                </span>
                <span className="text-xs text-[#4A4A4A] ml-2">次训练</span>
              </div>
              <div>
                <span
                  className="text-2xl font-semibold text-[#1A1A1A] tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-number, 'Inter', sans-serif)" }}
                >
                  {Math.floor(m.daysSinceJoin / 30)}
                </span>
                <span className="text-xs text-[#4A4A4A] ml-2">个月</span>
              </div>
            </div>

            <p className="text-base text-[#1A1A1A] leading-[1.7] max-w-prose">
              {m.latestAiComment ?? "每一次训练，都在构建更好的自己。"}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
