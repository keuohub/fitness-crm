# Portal 首页审计报告

> 日期：2026-06-03 | 审计范围：`src/app/portal/page.tsx` 及相关依赖 | 原则：只读不写

---

## 1. 页面树结构

```
PortalLayout (src/app/portal/layout.tsx)
├── PortalMemberProvider
│   └── AuthGuard                          [认证守卫]
│       └── div.min-h-screen.bg-[#FAF7F2]
│           ├── UsageTracker               [埋点，无UI]
│           ├── <main class="px-5 pb-28">
│           │   └── PortalHome (page.tsx)
│           │       ├── [Section 1] Hero
│           │       │   ├── HeroGlow       [装饰：径向光晕]
│           │       │   ├── PortalHeader   [外部组件 src/components/portal/PortalHeader.tsx]
│           │       │   ├── memberName     [数据：PortalMemberContext]
│           │       │   ├── days + stageTitle [数据：daysSince() + 本地 getStageTitle()]
│           │       │   └── Anniversary    [数据：getAnniversaryMessage()]
│           │       ├── [Section 2] DailyMotivation
│           │       │   └── DailyMotivation [外部组件，数据：本地 MOTIVATIONS 常量]
│           │       ├── [Section 3] 这一路 (三段式叙事)
│           │       │   └── buildThreeStageNarrative()
│           │       │       [数据：/api/portal/growth-story]
│           │       ├── [Section 4] 最值得骄傲的事
│           │       │   └── storyData.milestones [数据：/api/portal/growth-story]
│           │       ├── [Section 5] 这一刻的你
│           │       │   └── matchGrowthMessages() [数据：/api/portal/latest-self-report + 本地语料库]
│           │       ├── [Section 6] 最近一次记录
│           │       │   └── selfReport [数据：/api/portal/latest-self-report]
│           │       ├── [Section 7] 未来的一封信
│           │       │   └── futureGoal [数据：selfReport.content lines 提取]
│           │       ├── [Section 8] 最近时刻
│           │       │   └── latestEvent [数据：useGrowthEvents → /api/trainings 等4个API]
│           │       └── [Section 9] 成长旅程
│           │           └── previewEvents [数据：useGrowthEvents]
│           └── PortalNav                    [底部导航 src/components/portal/PortalNav.tsx]
```

### Section 顺序及组件来源

| 序号 | Section | 组件来源 | 数据来源 |
|------|---------|----------|----------|
| 1 | Hero | PortalHeader (外部) + 内联 JSX | PortalMemberContext + daysSince() |
| 2 | 每日一语 | DailyMotivation (外部) | 本地 MOTIVATIONS 常量 |
| 3 | 这一路 | 内联 JSX | /api/portal/growth-story |
| 4 | 最值得骄傲的事 | GlassCard (外部) | /api/portal/growth-story |
| 5 | 这一刻的你 | GlassCard | /api/portal/latest-self-report + 语料库 |
| 6 | 最近一次记录 | GlassCard + Link | /api/portal/latest-self-report |
| 7 | 未来的一封信 | GlassCard | selfReport.content |
| 8 | 最近时刻 | GlassCard | useGrowthEvents hook |
| 9 | 成长旅程 | 内联 timeline JSX | useGrowthEvents hook |
| — | Header | PortalHeader (外部) | PortalMemberContext |
| — | Bottom Nav | PortalNav (外部) | usePathname() |

---

## 2. 首页首屏分析

### 高度计算（移动端 390px 宽度）

| 元素 | 高度 | 来源 |
|------|------|------|
| PortalHeader | ~52px | sticky top-0, 内容区 |
| Hero pt-10 | +40px padding-top | `pt-10` |
| Hero 文字区 | ~120px | 标题 + 副标题 + 行间距 |
| Hero pb-4 | +16px padding-bottom | `pb-4` |
| Anniversary Card | ~100px | 条件渲染 (p-5 rounded-2xl) |
| Section 间距 | +80px | `space-y-20` |
| **首屏总计** | **~408px** | 不含 DailyMotivation |

### 留白来源分析

| 来源 | 值 | 位置 |
|------|-----|------|
| `main.px-5` | 20px 左右 | layout.tsx 全局 |
| `page.px-5` | 20px 左右（叠加） | page.tsx 容器**双重 px-5！** |
| `pt-10` | 40px 顶部 | Hero section |
| `space-y-20` | 80px 段间距 | page.tsx 容器级 |
| `pb-28` | 112px 底部 | layout.tsx（为 bottom nav 留空） |
| `mb-6/8` | 24/32px 标题下间距 | 各 section |
| `max-w-lg` | 512px 最大宽度 | 居中留白 |

### 问题发现

1. **双重 `px-5`**：layout.tsx 的 `<main className="px-5">` + page.tsx 的 `<div className="px-5">` = 40px 左右内边距，手机端过于拥挤
2. **`space-y-20` (80px)** 段间距过大，9个 section × 80px = 720px 纯间距，远超内容本身
3. **`pb-28` (112px)** 底部为 bottom nav 预留空间过大

---

## 3. AI 文案审计

### Portal UI（面向会员）— 零 AI 文案

Portal 所有页面（page.tsx, growth, feedback, me, share, report）中不含任何"AI"相关文字。

### 后端/内部代码残留

| 文件 | 行号 | 实际文案 | 是否展示给用户 |
|------|------|----------|----------------|
| `src/hooks/useGrowthEvents.ts` | 134 | `"收到第一份AI成长报告"` | **是**（时间轴事件标题） |
| `src/hooks/useGrowthEvents.ts` | 346 | `` `AI ${reportTypeLabel(r.reportType)}` `` | **是**（时间轴事件标题） |
| `src/app/api/portal/latest-self-report/route.ts` | 41 | `ai_summary: "成长记录"` | 否（仅数据 key） |
| `src/app/api/platform-stats/route.ts` | 11 | `totalAIFeedbacks` | 否（变量名） |

**需修复：2处** — useGrowthEvents.ts 第134行和第346行的事件标题会直接显示给用户。

---

## 4. 首页模块清单

| # | 模块 | 状态 | 条件 | 数据依赖 |
|---|------|------|------|----------|
| 1 | Hero (会员名+天数+阶段) | 已使用 | 始终渲染 | PortalMemberContext |
| 2 | Anniversary Banner | 已使用 | days = 30/90/180/365/1095/1825 | daysSince() |
| 3 | 每日一语 | 已使用 | 始终渲染 | 本地常量 |
| 4 | 这一路 (三段叙事) | 已使用 | storyData存在 + ≥2条记录 | /api/portal/growth-story |
| 5 | 最值得骄傲的事 | 已使用 | storyData.milestones 含关键词 | /api/portal/growth-story |
| 6 | 这一刻的你 | 已使用 | selfReport.content 关键词匹配 | /api/portal/latest-self-report |
| 7 | 最近一次记录 | 已使用 | selfReport 非空 | /api/portal/latest-self-report |
| 8 | 未来的一封信 | 已使用 | selfReport 含目标关键词 | /api/portal/latest-self-report |
| 9 | 最近时刻 | 已使用 | latestEvent 存在 | useGrowthEvents (4个API) |
| 10 | 成长旅程 (时间轴) | 已使用 | previewEvents 非空 | useGrowthEvents |
| — | TripleRing (Lv环) | 已废弃 | Sprint 32-33 已删除 | — |
| — | 教练寄语 (coach-note) | 已隐藏 | Sprint 34A 隐藏 | — |

---

## 5. 风险评估

### 低风险 — 仅涉及 UI 修改

| 组件/模块 | 依赖 |
|-----------|------|
| HeroGlow 装饰 | 纯 CSS |
| 每日一语 文案 | 本地常量 MOTIVATIONS |
| Section 间距/留白 | Tailwind className |
| 三段叙事 排版 | 内联 JSX + storyData |
| GlassCard padding | 组件 props |

### 中风险 — 涉及 API 调用

| 组件/模块 | API |
|-----------|-----|
| 这一路 / 最骄傲的事 | `/api/portal/growth-story` |
| 这一刻 / 最近记录 / 未来信 | `/api/portal/latest-self-report` |
| 最近时刻 / 成长旅程 | `useGrowthEvents` → 4个API |

### 高风险 — 涉及数据库或认证

| 组件/模块 | 依赖 |
|-----------|------|
| useGrowthEvents | trainings / photos / questionnaire / ai_feedback_reports 表 |
| PortalMemberContext | members 表 + member_sessions 表 |
| API 全部 | member-ownership.ts + auth cookie |

---

## 6. 总结

- **9个活跃 Section**，全部有条件渲染
- **2处 AI 文案残留**在时间轴事件标题中（用户可见）
- **双重 px-5** 导致手机端留白过大
- **space-y-20 段间距** 800px+ 纯间距，建议降为 `space-y-12` 或 `space-y-16`
- 零废弃组件，零死代码
