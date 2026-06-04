# LONG TERM MEMBER SYSTEM PLAN
**Sprint 28 — 长期会员陪伴系统规划**
**日期：2026-06-02**

---

## 战略目标

将 Portal 从「新会员成长记录系统」升级为「长期会员陪伴系统」。

当前系统擅长记录短期变化（天、周、月）。长期会员（>6个月）需要不同的叙事框架：累计、对比、荣誉、归属。

---

## 一、现有数据基础

### 1.1 数据库现状

| 表 | 可支撑的长期逻辑 | 当前数据量 |
|----|------------------|:--------:|
| `members` | `joined_at`（入会日期）、`status`（活跃/冻结/存档） | 17 人 |
| `trainings` | `training_date`、`type`、`duration_minutes` | 50 条 |
| `photos` | `taken_at`（拍摄日期）、`photo_type` | 8 条 |
| `questionnaire_submissions` | `submitted_at`、`weight`、完整问卷字段 | 19 条 |
| `ai_feedback_reports` | `report_type`、`generated_at`、`content` | 45 条 |
| `member_memories` | `memory_type`（note/milestone/preference/ai_summary）、`content` | 6 条 |
| `daily_health_logs` | `log_date`、`weight`、`sleepHours`、`stressLevel` | 15 条 |

### 1.2 已有引擎（可复用）

| 文件 | 功能 | 可扩展方向 |
|------|------|-----------|
| `src/lib/member-badges.ts` | 7 种勋章（first-questionnaire ~ streak-7） | 新增长期荣誉勋章 |
| `src/lib/member-level.ts` | 5 级成长等级（Lv1-Lv5，基于天数） | 扩展为多维度等级 |
| `src/lib/member-growth.ts` | 成长事件聚合 | 扩展为里程碑引擎 |
| `src/lib/ai/growth-stage.ts` | 5 阶段判断 | 扩展为长期阶段分类 |
| `src/lib/ai/growth-report.ts` | 单次报告 | 扩展为对比（本月 vs 上月） |

---

## 二、子系统设计

### 子系统 1：90 天阶段回顾体系

**目标：** 每 90 天给会员一份对比回顾，让变化「被看见」。

**触发时机：**
- 加入第 90 天
- 之后每 90 天（第 180 天、第 270 天、第 360 天…）

**数据来源（全在现有表中）：**
- 体重对比：`questionnaire_submissions.weight`（首次 vs 最近）
- 训练次数：`trainings` 90 天窗口 COUNT
- 照片对比：`photos` 取最早和最近各一张
- AI 反馈总结：`ai_feedback_reports` 最近 90 天内
- 睡眠变化：`daily_health_logs.sleepHours` 均值（如有数据）

**飞书表单设计（如需）：**
字段仅需：
- 体重（kg）
- 睡眠时长（小时/日均）
- 压力水平（1-5）
- 精力水平（1-5）
- 自我评价（自由文本）

**CRM 同步：** 飞书表单提交后通过 `feishu sync` 写入 `daily_health_logs` 表。不新增表。

**影响：** 零数据库改动。仅需新增 90 天报告查询 SQL。

---

### 子系统 2：会员旅程 Timeline

**目标：** 展示会员的完整时间线，不仅是训练。

**数据结构：** 从现有 `useGrowthEvents` hook 扩展（已有 4 源聚合：trainings + photos + questionnaires + aiFeedbackReports）。

**新增维度：**

| 事件类型 | 数据来源 | 显示文案 |
|----------|---------|---------|
| 加入徕舞 | `members.joined_at` | 「DAY 1 — 开始旅程」 |
| 第一次训练 | `trainings` 最早一条 | 「第一次训练」 |
| 每次训练 | `trainings` | 「第 N 次训练 · {类型}」 |
| 照片记录 | `photos` | 「第 N 张体态照片」 |
| 问卷提交 | `questionnaire_submissions` | 「第 N 份健康问卷」 |
| AI 阶段回顾 | `ai_feedback_reports` | 「阶段回顾 · {月度/季度}」 |
| 成长里程碑 | 自动检测（已有 member-badges 逻辑） | 「获得 N 勋章」 |

**视觉：** 纵向时间轴，每个事件一行，图标 + 日期 + 描述。

**影响：** 零数据库改动。修改 `src/hooks/useGrowthEvents.ts` 加入 `joinedAt` 事件。

---

### 子系统 3：坚持档案

**目标：** 会员在 Portal「我的」页面看到自己的累计数据。

**计算维度（全部从现有表推导）：**

| 指标 | 算法 | 数据源 |
|------|------|--------|
| 累计训练次数 | COUNT(`trainings`) WHERE `member_id`=X | `trainings` |
| 累计训练天数 | COUNT(DISTINCT `training_date`) | `trainings` |
| 连续训练月份 | 按月份聚合，计连续有训练的月数 | `trainings` |
| 累计成长记录 | `trainings` + `photos` + `questionnaire_submissions` + `ai_feedback_reports` 总和 | 四表 |
| 首次训练日期 | MIN(`training_date`) | `trainings` |
| 最近训练日期 | MAX(`training_date`) | `trainings` |
| 拥有勋章数 | 调用 `generateBadges()` | `member-badges.ts` |

**影响：** 零数据库改动。新增 `src/lib/member-archive.ts` 纯计算文件。

---

### 子系统 4：荣誉体系

**目标：** 给长期会员颁发荣誉勋章。

**设计原则：** 完全基于 `trainings` 表推导，不新增表。

**新增勋章：**

| ID | 勋章名 | 解锁条件 | 数据源 |
|----|--------|---------|--------|
| `training-100` | 百次蜕变 | `trainingCount >= 100` | `trainings` COUNT |
| `training-300` | 坚定前行 | `trainingCount >= 300` | `trainings` COUNT |
| `training-500` | 终身践行者 | `trainingCount >= 500` | `trainings` COUNT |
| `years-1` | 一年陪伴 | `daysSinceJoin >= 365` | `members.joined_at` |
| `years-3` | 三年成长 | `daysSinceJoin >= 1095` | `members.joined_at` |
| `years-5` | 五年蜕变 | `daysSinceJoin >= 1825` | `members.joined_at` |
| `months-consecutive-6` | 半年不停歇 | `consecutiveTrainingMonths >= 6` | `trainings` 月份聚合 |
| `months-consecutive-12` | 全年坚持 | `consecutiveTrainingMonths >= 12` | `trainings` 月份聚合 |

**最终勋章总数：7（现有）+ 8（新增）= 15 枚。**

**影响：** 零数据库改动。扩展 `src/lib/member-badges.ts` `generateBadges()` 函数。

---

### 子系统 5：CRM 会员状态分类

**目标：** 教练在 CRM 会员列表中一眼看出会员健康度。

**分类规则（从现有数据推导）：**

| 状态 | 规则 | 颜色 |
|------|------|:----:|
| **高活跃** | 近 30 天训练 >= 8 次 | 绿色 |
| **稳定** | 近 30 天训练 4-7 次 | 蓝色 |
| **风险** | 近 30 天训练 1-3 次 | 橙色 |
| **沉默** | 近 30 天训练 0 次 | 灰色 |

**同时考虑冷冻状态：**
- `freeze_status = 'frozen'` → 显示「冷冻中」

**计算方式：** SQL 查询 `trainings` 表 WHERE `training_date >= 30天前`，按 `member_id` 聚合 COUNT。

**影响：** 零数据库改动。`members` 表已有 `status` 字段：
- `status: 'active' | 'inactive' | 'archived'`
- `freeze_status: 'active' | 'frozen'`

CRM 会员列表页新增一列显示「活跃度标签」。

---

## 三、数据库影响分析

| 操作 | 说明 |
|------|------|
| 新增表 | **0 张** |
| 修改现有表 | **0 处** |
| 新增字段 | **0 个** |
| 修改 schema.ts | **0 行** |

所有计算基于现有字段：
- `training_date` → 训练频次、连续月份
- `joined_at` → 加入天数、年限
- `taken_at` → 照片记录时间
- `submitted_at` → 问卷提交时间
- `generated_at` → AI 报告时间
- `log_date` → 健康日志时间

---

## 四、页面原型设计

### 4.1 Portal「我的」页增强

```
┌──────────────────────────┐
│     会员身份卡            │
│  ┌──────────────────┐    │
│  │ 姓名 · 等级 · 天数 │    │
│  └──────────────────┘    │
│                          │
│  ── 坚持档案 ──          │
│  累计训练    52 次       │
│  训练天数    48 天       │
│  连续月份    8 个月      │
│  成长记录    120 条      │
│                          │
│  ── 荣誉勋章 ──          │
│  [🏅][🏅][🏅][  ][  ]   │
│                          │
│  ── 成长旅程 ──          │
│  ● 加入徕舞 (2025.06)    │
│  │                       │
│  ● 第一次训练            │
│  │                       │
│  ● 第10次训练            │
│  │                       │
│  ● 连续30天              │
│  │                       │
│  ● 一年陪伴 🎉           │
│  ↓                       │
└──────────────────────────┘
```

### 4.2 Portal「成长」页增强

```
┌──────────────────────────┐
│  ── 90天变化回顾 ──      │
│  体重    58kg → 55kg     │
│  训练    18次 (vs上期)   │
│  照片    对比展示        │
│  AI总结  教练评语        │
│                          │
│  ── 旅程进度条 ──        │
│  启程 → 习惯 → 稳定 →   │
│            ▲ 当前位置     │
│                          │
│  ── 里程碑时间轴 ──      │
│  ...                     │
└──────────────────────────┘
```

### 4.3 CRM 会员列表增强

```
┌──────────────────────────────┐
│ 会员列表（新增活跃度）       │
├────┬──────┬──────┬──────────┤
│ 姓名│加入  │训练  │状态      │
├────┼──────┼──────┼──────────┤
│ 王莉│365天│52次  │🟢 高活跃 │
│ 微微│366天│48次  │🟢 高活跃 │
│ 李婷│200天│30次  │🔵 稳定   │
│ 张悦│120天│24次  │🟠 风险   │
│ ...│     │      │          │
└────┴──────┴──────┴──────────┘
```

---

## 五、开发工作量评估

### 新增文件

| 文件 | 行数 | 说明 |
|------|:----:|------|
| `src/lib/member-archive.ts` | ~80 | 坚持档案计算函数 |
| `src/lib/member-badges.ts` | +40 | 新增 8 个勋章规则 |

### 修改文件

| 文件 | 改动 | 说明 |
|------|:----:|------|
| `src/app/portal/me/page.tsx` | +50 | 加入坚持档案区、旅程 Timeline |
| `src/app/portal/growth/page.tsx` | +30 | 90 天回顾区（如有数据） |
| `src/app/members/page.tsx` | +40 | 新增活跃度状态列 |
| `src/hooks/useGrowthEvents.ts` | +15 | 加入 joinedAt 事件 |

### 数据库

| 表 | 改动 |
|----|:----:|
| 全部 | **0 个字段新增** |

### 工作量估算

| 子系统 | 复杂度 | 时间 |
|--------|:------:|:----:|
| 1. 90天阶段回顾 | 中 | 2h |
| 2. 会员旅程 Timeline | 低 | 1h |
| 3. 坚持档案 | 低 | 1.5h |
| 4. 荣誉体系（新勋章） | 低 | 1h |
| 5. CRM 会员状态分类 | 低 | 1h |

**总计：约 6.5 小时开发 + 1 小时测试。**

---

## 六、与现有系统的协调

| 已有功能 | 本 Sprint 后变化 |
|----------|----------------|
| `member-badges.ts`（7 勋章） | 扩展为 15 勋章 |
| `member-level.ts`（Lv1-Lv5） | 保持不变，仅增加展示 |
| `member-growth.ts` | 复用，新增 join_at 事件 |
| `growth-report.ts` | 新增 90 天对比模式 |
| `GrowthTimeline.tsx` | 从时间轴升级为完整旅程 |
| `BadgeCard.tsx` | 勋章数量增加，布局不变 |
| CRM `/members` 列表 | 新增「活跃度」状态列 |

---

## 七、风险

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| 17 名会员数据量小，部分勋章（100次训练）无人解锁 | 低 | 规则定义即可，数据量增长后自然解锁 |
| joined_at 全为 2025-06 或 2026-06（种子数据），跨年勋章需真实数据 | 低 | 不影响逻辑，真实运营后生效 |
| daily_health_logs 数据少（15条），90天体重对比可能无数据 | 低 | 无数据时隐藏该区域 |
| 勋章总计 15 枚，BadgeCard 布局需测试是否溢出 | 低 | 使用 masonry 或 scroll 布局 |
