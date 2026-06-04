"use client";

import { useState, useEffect, useMemo } from "react";
import type { GrowthEvent } from "@/types/growth";

// ─── API 原始返回类型 ───

interface TrainingRaw {
  id: number;
  trainingDate: string;
  type: string;
  durationMinutes: number | null;
  focusArea: string | null;
  notes: string | null;
}

interface PhotoRaw {
  id: number;
  photoType: string;
  takenAt: string | null;
}

interface QuestionnaireRaw {
  id: number;
  submittedAt: string;
  weight?: number | null;
}

interface AIReportRaw {
  id: number;
  reportType: string;
  generatedAt: string;
  createdAt: string;
}

// ─── 标签映射 ───

const trainingTypeLabel = (t: string) =>
  ({ private: "私教", group: "团课", assessment: "评估" }[t] || t);

const photoTypeLabel = (t: string) =>
  ({ body: "体型", posture: "体态", progress: "进度" }[t] || t);

const reportTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    daily: "每日关怀",
    weekly: "周报",
    monthly: "月报",
    "15days": "15日总结",
    quarterly: "季度总结",
    semiyearly: "半年总结",
    yearly: "年度总结",
  };
  return map[t] || t;
};

// ─── Hook 返回值 ───

interface UseGrowthEventsResult {
  events: GrowthEvent[];
  loading: boolean;
  error: string | null;
}

// ─── 里程碑引擎 ───

function detectMilestones(events: GrowthEvent[]): GrowthEvent[] {
  const milestones: GrowthEvent[] = [];
  const existingTitles = new Set(events.map((e) => e.title));

  const trainings = events.filter((e) => e.type === "training");
  const aiReports = events.filter((e) => e.type === "ai_report");
  const photos = events.filter((e) => e.type === "photo");
  const questionnaires = events.filter((e) => e.type === "questionnaire");

  // ── 1. 第10次训练 ──
  if (trainings.length >= 10) {
    const title = "完成第10次训练";
    if (!existingTitles.has(title)) {
      const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));
      const tenth = sorted[9];
      milestones.push({
        id: "milestone_training_10",
        type: "milestone",
        date: tenth.date,
        title,
        description: "你已经坚持了10次训练，身体正在悄悄改变",
        source: "/api/trainings",
        payload: { count: 10 },
      });
    }
  }

  // ── 1a. 第一次训练 ──
  if (trainings.length >= 1) {
    const title = "完成第一次训练";
    if (!existingTitles.has(title)) {
      const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      milestones.push({
        id: "milestone_training_1",
        type: "milestone",
        date: first.date,
        title,
        description: "改变从第一次开始，你迈出了最重要的一步",
        source: "/api/trainings",
        payload: { count: 1 },
      });
    }
  }

  // ── 1b. 第25次训练 ──
  if (trainings.length >= 25) {
    const title = "完成第25次训练";
    if (!existingTitles.has(title)) {
      const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));
      const target = sorted[24];
      milestones.push({
        id: "milestone_training_25",
        type: "milestone",
        date: target.date,
        title,
        description: "四分之一的百次训练，你已经走了很远",
        source: "/api/trainings",
        payload: { count: 25 },
      });
    }
  }

  // ── 1c. 第50次训练 ──
  if (trainings.length >= 50) {
    const title = "完成第50次训练";
    if (!existingTitles.has(title)) {
      const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));
      const target = sorted[49];
      milestones.push({
        id: "milestone_training_50",
        type: "milestone",
        date: target.date,
        title,
        description: "五十次训练的积累，身体已经完全不同",
        source: "/api/trainings",
        payload: { count: 50 },
      });
    }
  }

  // ── 1d. 第100次训练 ──
  if (trainings.length >= 100) {
    const title = "完成第100次训练";
    if (!existingTitles.has(title)) {
      const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));
      const target = sorted[99];
      milestones.push({
        id: "milestone_training_100",
        type: "milestone",
        date: target.date,
        title,
        description: "百次训练的勋章，坚持已经成为你是谁的一部分",
        source: "/api/trainings",
        payload: { count: 100 },
      });
    }
  }

  // ── 2. 连续7天训练 ──
  {
    const uniqueDates = [...new Set(trainings.map((t) => t.date))].sort();
    let maxStreak = 0;
    let streakEnd = "";
    let currentStreak = 0;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakEnd = uniqueDates[i];
      }
    }

    if (maxStreak >= 7) {
      const title = "连续7天打卡";
      if (!existingTitles.has(title)) {
        milestones.push({
          id: "milestone_streak_7",
          type: "milestone",
          date: streakEnd,
          title,
          description: "连续一周的训练，自律已经成为习惯",
          source: "/api/trainings",
          payload: { streakDays: maxStreak, streakEnd },
        });
      }
    }

    if (maxStreak >= 30) {
      const title = "连续30天打卡";
      if (!existingTitles.has(title)) {
        milestones.push({
          id: "milestone_streak_30",
          type: "milestone",
          date: streakEnd,
          title,
          description: "连续一个月，训练已经融入你的生活节奏",
          source: "/api/trainings",
          payload: { streakDays: maxStreak, streakEnd },
        });
      }
    }
  }

  // ── 3. 首次AI反馈 ──
  if (aiReports.length > 0) {
    const title = "收到第一份成长报告";
    if (!existingTitles.has(title)) {
      const first = [...aiReports].sort((a, b) => a.date.localeCompare(b.date))[0];
      milestones.push({
        id: "milestone_first_ai",
        type: "milestone",
        date: first.date,
        title,
        description: "小桥开始了解你的身体数据，陪伴正式开启",
        source: "/api/ai/period-report",
        payload: (first.payload as AIReportRaw),
      });
    }
  }

  // ── 4. 体重变化超过2kg ──
  {
    const qWithWeight = questionnaires
      .filter((e) => {
        const p = e.payload as QuestionnaireRaw;
        return p.weight != null && !isNaN(p.weight);
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 1; i < qWithWeight.length; i++) {
      const prevWeight = (qWithWeight[i - 1].payload as QuestionnaireRaw).weight!;
      const currWeight = (qWithWeight[i].payload as QuestionnaireRaw).weight!;
      const diff = currWeight - prevWeight;

      if (Math.abs(diff) > 2) {
        const isLoss = diff < 0;
        const title = isLoss
          ? "体重下降2kg"
          : "体重增加2kg，别担心";

        if (!existingTitles.has(title)) {
          milestones.push({
            id: `milestone_weight_${qWithWeight[i].id}`,
            type: "milestone",
            date: qWithWeight[i].date,
            title,
            description: isLoss
              ? "你的坚持有了看得见的结果"
              : "可能是肌肉在增长，你的身体在变强",
            source: "/api/questionnaire",
            payload: { prevWeight, currWeight, diff },
          });
        }
      }
    }
  }

  // ── 5. 累计上传5张照片 ──
  if (photos.length >= 5) {
    const title = "记录了5次体态变化";
    if (!existingTitles.has(title)) {
      const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
      const fifth = sorted[4];
      milestones.push({
        id: "milestone_photos_5",
        type: "milestone",
        date: fifth.date,
        title,
        description: "每一张照片都是你成长的见证",
        source: "/api/photos",
        payload: { count: 5 },
      });
    }
  }

  return milestones;
}

// ─── Hook ───

export function useGrowthEvents(
  memberId: number,
  joinedAt?: string,
  memberName?: string,
): UseGrowthEventsResult {
  const [trainings, setTrainings] = useState<TrainingRaw[] | null>(null);
  const [photos, setPhotos] = useState<PhotoRaw[] | null>(null);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireRaw[] | null>(null);
  const [aiReports, setAIReports] = useState<AIReportRaw[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      console.log("[GrowthEvents] fetch start");
      const timedFetch = (url: string) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
      };
      setLoading(true);
      setError(null);

      const fetchers: Promise<void>[] = [
        timedFetch(`/api/trainings?memberId=${memberId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject("trainings fetch failed")))
          .then((data: TrainingRaw[]) => { if (!cancelled) setTrainings(data); })
          .catch((e) => { if (e.name !== "AbortError") console.error("[useGrowthEvents] 训练数据加载失败:", e); if (!cancelled) setTrainings([]); }),

        timedFetch(`/api/photos?memberId=${memberId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject("photos fetch failed")))
          .then((data: PhotoRaw[]) => { if (!cancelled) setPhotos(data); })
          .catch((e) => { if (e.name !== "AbortError") console.error("[useGrowthEvents] 照片数据加载失败:", e); if (!cancelled) setPhotos([]); }),

        timedFetch(`/api/questionnaire?memberId=${memberId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject("questionnaire fetch failed")))
          .then((data: QuestionnaireRaw[]) => { if (!cancelled) setQuestionnaires(data); })
          .catch((e) => { if (e.name !== "AbortError") console.error("[useGrowthEvents] 问卷数据加载失败:", e); if (!cancelled) setQuestionnaires([]); }),

        timedFetch(`/api/ai/period-report?memberId=${memberId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject("ai reports fetch failed")))
          .then((data: AIReportRaw[]) => { if (!cancelled) setAIReports(data); })
          .catch((e) => { if (e.name !== "AbortError") console.error("[useGrowthEvents] AI反馈数据加载失败:", e); if (!cancelled) setAIReports([]); }),
      ];

      await Promise.allSettled(fetchers);

      console.log("[GrowthEvents] fetch done");
      if (!cancelled) {
        console.log("[GrowthEvents] loading false");
        setLoading(false);
      }
    }

    // 重置状态
    setTrainings(null);
    setPhotos(null);
    setQuestionnaires(null);
    setAIReports(null);

    fetchAll();

    return () => { cancelled = true; };
  }, [memberId]);

  // ── 用 useMemo 聚合 + 排序 + 里程碑检测，依赖各数据源 ──
  const events = useMemo<GrowthEvent[]>(() => {
    const all: GrowthEvent[] = [];

    // 0. 加入会员事件
    if (joinedAt) {
      all.push({
        id: "join",
        type: "join",
        date: joinedAt.slice(0, 10),
        title: memberName ? `${memberName}加入徕舞` : "加入徕舞女子塑形",
        source: "/api/members",
        payload: { joinedAt },
      });
    }

    // 1. 训练记录
    if (trainings) {
      for (const t of trainings) {
        const label = trainingTypeLabel(t.type);
        const focus = t.focusArea ? ` · ${t.focusArea}` : "";
        const duration = t.durationMinutes ? ` ${t.durationMinutes}min` : "";
        all.push({
          id: `training_${t.id}`,
          type: "training",
          date: t.trainingDate,
          title: `${label}训练${focus}${duration}`,
          description: t.notes || undefined,
          source: "/api/trainings",
          payload: t,
        });
      }
    }

    // 2. 照片
    if (photos) {
      for (const p of photos) {
        all.push({
          id: `photo_${p.id}`,
          type: "photo",
          date: p.takenAt || "",
          title: `上传${photoTypeLabel(p.photoType)}照片`,
          source: "/api/photos",
          payload: p,
        });
      }
    }

    // 3. 问卷
    if (questionnaires) {
      questionnaires.forEach((q, i) => {
        all.push({
          id: `questionnaire_${q.id}`,
          type: "questionnaire",
          date: q.submittedAt?.slice(0, 10) || "",
          title: questionnaires.length === 1 ? "完成首次健康问卷" : `第${i + 1}次健康问卷`,
          source: "/api/questionnaire",
          payload: q,
        });
      });
    }

    // 4. AI 反馈报告
    if (aiReports) {
      for (const r of aiReports) {
        const date = (r.generatedAt || r.createdAt || "").slice(0, 10);
        all.push({
          id: `ai_report_${r.id}`,
          type: "ai_report",
          date,
          title: `${reportTypeLabel(r.reportType)}`,
          source: "/api/ai/period-report",
          payload: r,
        });
      }
    }

    // 按日期倒序
    all.sort((a, b) => b.date.localeCompare(a.date));

    // ── 里程碑检测并合并 ──
    const milestones = detectMilestones(all);
    const merged = [...all, ...milestones];
    merged.sort((a, b) => b.date.localeCompare(a.date));

    return merged;
  }, [memberId, joinedAt, memberName, trainings, photos, questionnaires, aiReports]);

  return { events, loading, error };
}
