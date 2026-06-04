# SPRINT 20 — GROWTH INTELLIGENCE 1.0 REPORT

Date: 2026-06-02 | TypeScript: 0 errors

---

## Summary

Growth reports now have a **time dimension**. Four new analysis engines added: Score History, Trend Analysis, Momentum Score, and Consistency Score. All rule-based — no GPT, no external APIs.

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/score-history.ts` | Compute growth score at 7d/30d/90d ago by filtering events before cutoff |
| `src/lib/ai/trend-analysis.ts` | Compare current 30d vs previous 30d activity; classify as rising/flat/falling with change% |
| `src/lib/ai/momentum-consistency.ts` | Momentum (recent 30d activity) + Consistency (streak stability across training/photos/feedback) |

## Modified Files

| File | Change |
|------|--------|
| `src/lib/ai/growth-report.ts` | Added `scoreHistory`, `trend`, `momentum`, `consistency` to `GrowthReport` interface and `generateGrowthReport()` |
| `src/app/portal/report/page.tsx` | Added trend/momentum/consistency 3-card grid, score history bar chart |
| `src/app/members/[id]/report/page.tsx` | Same trend modules in CRM layout |

---

## Engine Details

### 1. Score History

Computes what the growth score would have been at 7, 30, and 90 days ago by filtering events to those before the cutoff date. Displayed as a bar chart (90d -> 30d -> 7d -> now).

### 2. Trend Analysis

Compares current 30-day activity (trainings * 2 + total events) against previous 30-day period:
- `changePercent >= 15` -> "rising" / "明显上升"
- `changePercent >= 5` -> "rising" / "小幅上升"
- `changePercent <= -15` -> "falling" / "明显下降"
- `changePercent <= -5` -> "falling" / "小幅下降"
- else -> "flat" / "保持稳定"

### 3. Momentum Score (0-100)

Recent 30-day activity level. Unique training days in last 30 days vs ideal of 12 days (3/week).
- 80+ = "势能强劲", 55+ = "稳步前进", 30+ = "开始恢复", else = "势能不足"

### 4. Consistency Score (0-100)

Long-term streak stability. Weighted: training streak (50%) + photo streak (25%) + feedback streak (25%).
Streak = longest consecutive chain of unique dates where gap <= 2 days.
- 75+ = "高度自律", 50+ = "习惯养成", 25+ = "开始坚持", else = "待建立"

---

## Portal Report Layout

```
[Score Ring — 0-100]
[Trend | Momentum | Consistency] 3-card grid
[Score History — bar chart: 90d -> 30d -> 7d -> now]
[Growth Stage + Next Stage countdown]
[Growth Summary — auto-generated text]
[Score Breakdown — 5 progress bars]
[Strengths — green markers]
[Risks — red markers]
[Recommendations — numbered list]
```

---

## Data Flow (unchanged from Sprint 19)

All new engines consume the same `GrowthEvent[]` array that the report API already generates from 4 DB tables. No new API calls, no new database queries, no new tables.
