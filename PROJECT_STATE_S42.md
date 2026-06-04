# PROJECT_STATE_S42

> 存档日期：2026-06-04
> 版本：Sprint 42 稳定版
> 原则：只记录事实，不给建议。

---

## 1. 版本信息

| 项 | 值 |
|---|---|
| 版本号 | Sprint 42 Stable |
| Git Tag | `sprint-42-stable-final` |
| 归档分支 | `archive/sprint-42-stable-final` |
| 最新 Commit | `84b3ceda SPRINT_42_STABLE: 全站稳定版本存档` |
| 分支 | `main` |

---

## 2. 首页结构（按实际顺序）

共 19 个板块，全部为文字驱动，零图片：

| 序号 | 板块 | 组件文件 | 说明 |
|------|------|----------|------|
| 1 | Hero | `HeroSection.tsx` | 品牌主标题 + 副标题 + 品牌名 |
| 2 | Belief | `BeliefSection.tsx` | 关于徕舞，品牌宣言 |
| 3 | FounderLetter | `FounderLetterSection.tsx` | 写给未来五年的自己 |
| 4 | MonthlyJournal | `MonthlyJournalSection.tsx` | 品牌发展时间线 |
| 5 | Manifesto | `ManifestoSection.tsx` | 关于小桥，创始人介绍 |
| 6 | Evidence | `EvidenceSection.tsx` | 滚动计数：会员/训练/成长事件/留存率 |
| 7 | ActivityFeed | `ActivityFeedSection.tsx` | 实时训练动态（API 驱动） |
| 8 | Journey | `JourneySection.tsx` | 5 阶段滚动视差旅程 |
| 9 | Cases | `CasesSection.tsx` | 成长档案：3 位会员记录 |
| 10 | Stories | `StoriesTeaserSection.tsx` | 成长故事卡片（链接到 /stories） |
| 11 | Studio | `StudioSection.tsx` | 训练空间三栏文字 |
| 12 | BrandFilm | `BrandFilmSection.tsx` | 品牌影片占位区 |
| 13 | Ecosystem | `EcosystemSection.tsx` | 产品生态三栏 |
| 14 | AIReport | `AIReportSection.tsx` | 洞察引擎 + 报告展示（API 驱动） |
| 15 | HowItWorks | `HowItWorksSection.tsx` | 使用流程 5 步 |
| 16 | Partner | `PartnerSection.tsx` | 合作伙伴/适用对象 |
| 17 | Try | `TrySection.tsx` | 体验入口 3 个链接 |
| 18 | Contact | `ContactSection.tsx` | 微信 + 联系方式 |
| 19 | Demo | `DemoSection.tsx` | 预约演示表单 |

**Footer：** 徕舞成长系统 · 钟祥徕舞女子塑形

---

## 3. 品牌系统

### 3.1 核心文案

| 位置 | 内容 |
|------|------|
| Hero 主标题 | 成长值得被记录，坚持值得被看见 |
| Hero 副标题 | 不是一次训练改变了身体，而是一次次记录，让成长慢慢发生。 |
| 品牌名 | 钟祥 · 徕舞 |
| 来源 | `src/lib/brand-voice.ts` → `BRAND_CORE_MESSAGE` |

### 3.2 品牌关键词

- **鼓励：** 成长、记录、坚持、时间、练习、出现、积累
- **禁止：** 蜕变、逆袭、重塑、赋能、系统化、领先

### 3.3 品牌文件

- `src/lib/brand-voice.ts` — 品牌文案唯一来源
- `src/lib/HomepageReadingRhythm.ts` — 阅读节奏规范
- `src/lib/design/DESIGN_TOKEN.ts` — 视觉设计令牌

---

## 4. 视觉系统

| 属性 | 值 |
|------|-----|
| 标题颜色（H1/H2） | `#1D1D1F` |
| 正文颜色 | `#6E6E73` |
| 强调色（Primary） | `#8B5E3C`（莲花棕） |
| 深色（Secondary） | `#3E2723`（深棕） |
| 背景色 | `#FFFFFF`（品牌页）/ `#FAF7F2`（卡片底色） |
| 边框色 | `#E8E0D5` |
| 标题字体 | `font-semibold`, `tracking-[-0.03em]`, `leading-[1.15]` |
| 正文字体 | PingFang SC 优先，`leading-[1.9]` |
| 数字字体 | SF Pro Display / Inter（`var(--font-number)`） |
| 标题最大宽度 | `max-w-[12ch]` |
| 正文最大宽度 | `max-w-[34em]` |
| 长文最大宽度 | `max-w-[42em]` |
| 板块间距 | `py-32 md:py-40` |

---

## 5. 技术系统

| 项 | 值 |
|---|---|
| Next.js | 16.2.6 (Turbopack) |
| TypeScript | 严格模式 |
| 数据库 | SQLite (better-sqlite3) |
| ORM | Drizzle ORM |
| 动画 | Framer Motion |
| CSS | Tailwind CSS |
| AI | DeepSeek API（`.env.local` 中配置） |
| 运行端口 | 3001（3000 是 Codex 专用） |
| 服务方式 | macOS launchd (`com.laiwu.dev`) |
| 服务状态 | running, pid=37275 |
| Node | v26.0.0 |
| npm | 11.12.1 |

### 5.1 已知 API 端点

- `GET /api/platform-stats/activities` — 训练动态
- `GET /api/ai-report-sample` — AI 报告样本
- 更多 API 位于 `src/app/api/`

### 5.2 路由

- `/` — 品牌首页
- `/stories` — 成长故事列表
- `/portal` — 会员 Portal
- `/portal/growth` — 成长档案样例
- `/portal/feedback` — 阶段回顾样例

---

## 6. 当前已知问题

1. **CasesSection 与 StoriesTeaserSection 信息重复。** 两个板块引用相同三个会员数据，表达内容高度重叠。

2. **首页共 19 个板块。** 从 Ecosystem 开始的 7 个板块连续呈现产品功能说明，视觉节奏偏密。

3. **BrandFilmSection 为纯占位区。** 无实际视频内容。

4. **Better-sqlite3 在 Node v26 下需 `npm rebuild` 后运行。** 切换 Node 版本后需重编译。

5. **DESIGN_TOKEN.ts 中的 TYPOGRAPHY 对象仍引用 `font-serif`，但全站组件已不使用。**

---

## 7. 禁止修改项

以下内容在 Sprint 42 封版后禁止修改（除非新建 Sprint）：

- Hero 文案：`BRAND_CORE_MESSAGE.hero` 和 `.subtitle`
- 品牌颜色：`COLORS.primary = "#8B5E3C"`
- 字体体系：PingFang SC 优先，禁止 font-serif
- 标题层级：H1 font-semibold, H2 font-semibold, 数字 font-semibold
- 品牌关键词策略
- 数据库 Schema
- API 路由
- CRM/Portal 功能逻辑

---

*此文件为项目状态快照，不包含任何建议或计划。*
