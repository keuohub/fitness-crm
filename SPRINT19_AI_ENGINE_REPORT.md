# SPRINT 19 — AI GROWTH ENGINE 1.0 REPORT

Date: 2026-06-02 | TypeScript: 0 errors

---

## Summary

Rule-based AI Growth Engine implemented. No GPT/DeepSeek calls — pure deterministic scoring from member data. Portal and CRM both have report views.

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/growth-score.ts` | 0-100 growth score engine (frequency + streak + completeness + photos + feedback) |
| `src/lib/ai/growth-stage.ts` | 5-stage determination (启程/习惯建立/稳定成长/深度蜕变/长期主义) |
| `src/lib/ai/growth-report.ts` | Full report generator: score + stage + summary + strengths + risks + recommendations |
| `src/app/api/ai/growth-report/route.ts` | API endpoint — fetches live data, converts to GrowthEvent[], calls report engine |
| `src/app/portal/report/page.tsx` | Portal report page — score ring, stage card, breakdown bars, strengths/risks/recommendations |
| `src/app/members/[id]/report/page.tsx` | CRM admin report page — same report data, admin layout |

---

## Growth Score Engine

Scoring dimensions (total 100):

| Dimension | Max | Rules |
|-----------|-----|-------|
| 训练频率 | 30 | trainings per week * 10, capped at 30 |
| 连续天数 | 20 | >= 30 days: 20, >= 14: 15, >= 7: 10, >= 3: 5 |
| 档案完整 | 20 | >= 3 questionnaires: 20, >= 2: 15, >= 1: 10 |
| 照片记录 | 15 | >= 8 photos: 15, >= 5: 12, >= 3: 8, >= 1: 5 |
| AI反馈 | 15 | >= 20 feedbacks: 15, >= 10: 12, >= 5: 8, >= 1: 5 |

Score labels: 85+ "成长典范", 70+ "稳步提升", 50+ "持续努力", 30+ "正在起步", else "待成长"

---

## Growth Stage Engine

| Days | Stage | Description |
|------|-------|-------------|
| 0-29 | 启程阶段 | 建立训练节奏 |
| 30-89 | 习惯建立 | 训练融入生活 |
| 90-179 | 稳定成长 | 变化被看见 |
| 180-364 | 深度蜕变 | 身体重塑 |
| 365+ | 长期主义 | 坚持成为习惯 |

---

## Report Sections

Each report includes:
- **Growth Score** — circular ring with numeric score + label
- **Growth Stage** — current phase + days until next stage
- **Summary** — auto-generated Chinese text describing member's state
- **Strengths** — 3 auto-identified positive indicators
- **Risks** — warnings for low training frequency, missing photos, missing questionnaires
- **Recommendations** — 2-4 actionable next steps based on stage + data completeness
- **Score Breakdown** — 5 progress bars showing each dimension

---

## Access Points

- **Portal**: `/portal/report` — member views their own report (requires portal login)
- **CRM**: `/members/[id]/report` — admin views any member's report (requires admin login)

---

## Data Flow

```
Portal / CRM request
  |
  v
GET /api/ai/growth-report?memberId=X
  |-- verifyMemberAccess (portal: own data only; admin: all)
  |-- Promise.all([
  |     db.trainings, db.photos,
  |     db.questionnaireSubmissions, db.aiFeedbackReports
  |   ])
  |-- Convert to GrowthEvent[]
  |-- generateGrowthReport()
  |     |-- getGrowthStats()
  |     |-- computeGrowthScore()
  |     |-- getGrowthStage()
  |     |-- analyzeStrengths()
  |     |-- analyzeRisks()
  |     +-- generateRecommendations()
  v
JSON response -> Portal or CRM render
```

---

## Design Decisions

- **No GPT/DeepSeek** — all scoring is deterministic. This ensures:
  - Consistent results every time
  - Zero API cost
  - Instant response (<100ms server-side)
  - Easy to tune scoring weights later
- **Rule engine first** — GPT can be layered on top later for summary refinement, but the core scoring should stay deterministic
- **Reuses existing data** — no new database tables, no new API dependencies
