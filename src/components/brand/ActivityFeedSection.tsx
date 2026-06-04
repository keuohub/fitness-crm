"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";
import { sanitizeName } from "@/lib/display-name";

interface Activity {
  id: string;
  memberName: string;
  action: string;
  time: string;
}

function timeAgo(d: string): string {
  const now = Date.now();
  const then = new Date(d).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

export default function ActivityFeedSection() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform-stats/activities")
      .then((r) => r.json())
      .then((d) => {
        const sanitized = (d.activities ?? []).map((a: Activity) => ({
          ...a,
          memberName: sanitizeName(a.memberName),
        }));
        setActivities(sanitized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="max-w-4xl mx-auto px-6 py-32 bg-white">
        <div className="text-center text-sm text-[#6E6E73]">加载实时动态...</div>
      </section>
    );
  }

  if (activities.length === 0) return null;

  return (
    <section id="activity" className="max-w-4xl mx-auto px-6 py-32 bg-white">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-12"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-6"
          style={{ color: COLORS.primary }}
        >
          Live Activity
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">
          今天的训练记录
        </h2>
      </motion.div>

      <div className="overflow-hidden relative max-h-[280px]">
        <motion.div
          className="space-y-2"
          animate={{ y: [0, -40] }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        >
          {[...activities, ...activities].map((a, i) => (
            <div
              key={`${a.id}-${i}`}
              className="flex items-center justify-between py-3 px-5 rounded-2xl bg-[#FAF7F2]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <span className="text-sm font-medium text-[#3E2723]">
                  {a.memberName}
                </span>
                <span className="text-sm text-[#6E6E73]">{a.action}</span>
              </div>
              <span className="text-xs text-[#6E6E73] flex-shrink-0">
                {timeAgo(a.time)}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none" style={{ background: "linear-gradient(180deg, white, transparent)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ background: "linear-gradient(0deg, white, transparent)" }} />
      </div>
    </section>
  );
}
