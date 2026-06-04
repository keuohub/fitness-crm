# MEMBER CARE SYSTEM — 会员陪伴系统业务设计文档
**Sprint 30 · 飞书表单升级为会员陪伴系统**
**日期：2026-06-03**

---

## 设计原则

1. 不再收集数据，改为记录感受
2. 每张表单触发时机由系统自动提醒（纪念日系统）
3. 字段映射到现有 `questionnaire_submissions` + `member_memories` 表
4. Portal 展示从「数据看板」升级为「成长故事」
5. 所有数据可用作故事生成素材

---

## 现有数据库承载分析

### `questionnaire_submissions` 表（36个字段）

当前承载首次评估问卷。后续三张表单的量化题目复用此表：
- `weight` → 体重
- `sleep_hours`(`avg_sleep`) → 睡眠
- `energy_level` → 精力（复用 `low_energy` 字段，反转语义）
- `stress_level` → 压力
- 饮食文本字段（`breakfast/lunch/dinner/water_intake/cravings`）→ 饮食描述

### `member_memories` 表（3个关键字段）

承载质性记录：
- `content: text` → 叙事文本（如「教练观察」「会员自述」）
- `structured_data: text` → JSON 结构数据（如 `{feeling_score: 8, highlight: "..."}`）
- `memory_type: text` → 区分记录类型：`note | milestone | preference | ai_summary | self_report`

### `daily_health_logs` 表（6个字段）

承载周期性健康数据：
- `weight` / `sleep_hours` / `stress_level` / `energy_level` / `pain_areas` / `notes`

### 决策

**不新增表，不新增字段。** 四套表单的数据通过以下方式落库：
- 量化数据 → `daily_health_logs`（新增行）
- 质性记录 → `member_memories`（新增 `memory_type = 'self_report'`）
- 首次评估已有 → `questionnaire_submissions`（不变）

---

## 表单一：15天适应记录

### 定位
新人友好。关注「感觉」而非「数据」。会员在加入第15天收到提醒。

### 题目设计

| 序号 | 题目 | 题型 | 飞书字段名 | 映射目标 |
|:----:|------|:----:|-----------|---------|
| 1 | 过去两周，你觉得自己适应得怎么样？ | 单选 | `adaptation_feeling` | `member_memories.content`（叙事） |
| 2 | 训练后身体的感受 | 多选 | `body_feeling` | `member_memories.structured_data` JSON |
| 3 | 和第一周相比，身体有什么变化？ | 长文本 | `body_change_observed` | `member_memories.content` |
| 4 | 对接下来两周的期待 | 短文本 | `next_expectation` | `member_memories.structured_data` |
| 5 | 给教练的一句话 | 短文本 | `message_to_coach` | `member_memories.content`（`coach_note` 关联） |

### 选项设计

**题目1 选项：**
- 很适应，每周都想来
- 还行，慢慢找到节奏
- 还有点累，需要时间
- 不太确定

**题目2 选项（多选）：**
- 更灵活了 / 更有力量 / 体态变好了 / 还感受不到 / 有点酸 / 睡得更好 / 精力更充沛

### Portal 展示

15天时 Portal 首页「这一路」模块自动更新为第一次自我报告摘要：
> 「第15天 · 你觉得自己『还行，慢慢找到节奏』。身体变得更有力量。你给教练的话：希望坚持下去。」

---

## 表单二：30天月度记录

### 定位
开始建立「变化对比」。用数据说话。第30天提醒。

### 题目设计

| 序号 | 题目 | 题型 | 飞书字段名 | 映射目标 |
|:----:|------|:----:|-----------|---------|
| 1 | 今天体重（kg） | 数字 | `weight_kg` | `daily_health_logs.weight` |
| 2 | 最近一周平均睡眠（小时） | 数字 | `avg_sleep_hours` | `daily_health_logs.sleep_hours` |
| 3 | 精力水平 | 1-5 | `energy_level` | `daily_health_logs.energy_level` |
| 4 | 压力水平 | 1-5 | `stress_level` | `daily_health_logs.stress_level` |
| 5 | 身体有哪些不舒服的地方 | 多选 | `pain_areas` | `daily_health_logs.pain_areas` |
| 6 | 饮食有什么变化？ | 长文本 | `diet_change` | `member_memories.content` |
| 7 | 这个月最骄傲的一件事 | 长文本 | `proudest_moment` | `member_memories.content`（`milestone` 类型） |
| 8 | 下个月的小目标 | 短文本 | `next_goal` | `member_memories.structured_data` |

### 选项设计

**题目5 选项（多选）：** 肩颈 / 腰 / 膝盖 / 手腕 / 脚踝 / 没有不舒服

**题目3/4：** 1（很低）- 5（很高）

### Portal 展示

30天时生成对比卡片：
> 「30天变化：体重 58→56kg / 精力从 3 到 4 / 睡眠 6→7h。最骄傲的事：平板支撑突破60秒。」

---

## 表单三：90天阶段回顾

### 定位
深度反思 + 教练对话素材。第90天提醒。

### 题目设计

| 序号 | 题目 | 题型 | 飞书字段名 | 映射目标 |
|:----:|------|:----:|-----------|---------|
| 1 | 今天体重（kg） | 数字 | `weight_kg` | `daily_health_logs.weight` |
| 2 | 近一个月平均睡眠 | 数字 | `avg_sleep_hours` | `daily_health_logs.sleep_hours` |
| 3 | 精力水平 | 1-5 | `energy_level` | `daily_health_logs.energy_level` |
| 4 | 压力水平 | 1-5 | `stress_level` | `daily_health_logs.stress_level` |
| 5 | 身体变化最明显的地方 | 单选 | `most_noticeable_change` | `member_memories.content` |
| 6 | 和三个月前比，训练对你意味着什么？ | 长文本 | `training_meaning` | `member_memories.content`（`milestone` 类型） |
| 7 | 有什么想放弃的时刻？怎么过来的？ | 长文本 | `overcome_moment` | `member_memories.content` |
| 8 | 下一个90天想做到什么？ | 长文本 | `next_90_goal` | `member_memories.structured_data` |

### 选项设计

**题目5 选项：**
- 体态（站姿变好、不驼背）
- 体能（不容易累、更有力）
- 体重（数字下降）
- 心态（更自信、更快乐）
- 生活（睡眠变好、饮食规律）

### Portal 展示

90天回顾页（Portal 首页新增模块）：
> 「90天 · 你发现『体态』是最明显的变化。训练从任务变成了习惯。你想放弃过，但都过来了。下一个90天的目标：提升核心力量。」

---

## 表单四：365天周年纪念

### 定位
庆祝 + 感谢。最长的一张，但每题都是主观感受。第365天提醒。

### 题目设计

| 序号 | 题目 | 题型 | 飞书字段名 | 映射目标 |
|:----:|------|:----:|-----------|---------|
| 1 | 今天体重（kg） | 数字 | `weight_kg` | `daily_health_logs.weight` |
| 2 | 近一个月平均睡眠 | 数字 | `avg_sleep_hours` | `daily_health_logs.sleep_hours` |
| 3 | 精力水平 | 1-5 | `energy_level` | `daily_health_logs.energy_level` |
| 4 | 压力水平 | 1-5 | `stress_level` | `daily_health_logs.stress_level` |
| 5 | 这一年，最大的变化是什么？ | 长文本 | `biggest_change_year` | `member_memories.content`（`milestone` 类型） |
| 6 | 训练对你意味着什么？ | 长文本 | `training_identity` | `member_memories.content` |
| 7 | 有没有想感谢的人？ | 长文本 | `gratitude` | `member_memories.content` |
| 8 | 你有什么话想对一年前的自己说？ | 长文本 | `message_to_past_self` | `member_memories.content` |
| 9 | 下一年的期待 | 长文本 | `next_year_wish` | `member_memories.structured_data` |

### Portal 展示

365天纪念页面（Portal 首页 Hero 区域变化）：
> 「365天 · 你已经坚持了一整年。你对自己说：『谢谢你没有放弃。』训练已经成了你的一部分。」

---

## 飞书 → CRM 同步方案

### 同步流程

```
飞书多维表格（新增4张表或4个视图）
  ↓ feishu sync API (/api/sync/feishu)
  ↓ 字段映射 + 类型路由
  ↓ daily_health_logs（量化数据）
  ↓ member_memories（质性记录）
  ↓ Portal 展示 + 成长故事素材
```

### 字段映射总表

| 飞书字段 | CRM 目标表 | CRM 目标列 | 类型 |
|----------|-----------|-----------|:----:|
| `member_code` | `members` | `member_code` | 匹配键 |
| `weight_kg` | `daily_health_logs` | `weight` | REAL |
| `avg_sleep_hours` | `daily_health_logs` | `sleep_hours` | REAL |
| `energy_level` | `daily_health_logs` | `energy_level` | INT |
| `stress_level` | `daily_health_logs` | `stress_level` | INT |
| `pain_areas` | `daily_health_logs` | `pain_areas` | TEXT |
| `adaptation_feeling` | `member_memories` | `content` | TEXT |
| `body_feeling` | `member_memories` | `structured_data` | JSON |
| `body_change_observed` | `member_memories` | `content` | TEXT |
| `next_expectation` | `member_memories` | `structured_data` | JSON |
| `message_to_coach` | `member_memories` | `content` | TEXT |
| `diet_change` | `member_memories` | `content` | TEXT |
| `proudest_moment` | `member_memories` | `content` | TEXT (memory_type=milestone) |
| `next_goal` | `member_memories` | `structured_data` | JSON |
| `most_noticeable_change` | `member_memories` | `content` | TEXT |
| `training_meaning` | `member_memories` | `content` | TEXT (memory_type=milestone) |
| `overcome_moment` | `member_memories` | `content` | TEXT |
| `next_90_goal` | `member_memories` | `structured_data` | JSON |
| `biggest_change_year` | `member_memories` | `content` | TEXT (memory_type=milestone) |
| `training_identity` | `member_memories` | `content` | TEXT |
| `gratitude` | `member_memories` | `content` | TEXT |
| `message_to_past_self` | `member_memories` | `content` | TEXT |
| `next_year_wish` | `member_memories` | `structured_data` | JSON |

---

## Portal 展示方案

### 首页改造

| 模块 | 数据源 | 触发条件 |
|------|--------|---------|
| 纪念日横幅 | `members.joined_at` | 15/30/90/365天 |
| 阶段自我报告摘要 | `member_memories`（`memory_type=self_report`） | 有最新报告时显示 |
| 对比卡片 | `daily_health_logs` 最早 vs 最新 | 有 ≥ 2 条记录时 |
| 故事片段 | `member_memories.content` | 有 `milestone` 类型记录时 |

### 成长页改造

| 模块 | 数据源 |
|------|--------|
| 里程碑时间轴 + 自我报告节点 | `member_memories`（`memory_type=milestone|self_report`）|
| 健康日志趋势图 | `daily_health_logs`（体重/睡眠/精力/压力折线） |

---

## 故事生成素材方案

### 素材来源优先级

1. `member_memories` 中的 `proudest_moment` / `overcome_moment` / `biggest_change_year` → 核心故事
2. `daily_health_logs` 中的体重变化、精力提升 → 数据佐证
3. `questionnaire_submissions` 中的 `desired_state` / `commitment` → 对照初心
4. `trainings` 中的训练次数、类型分布 → 坚持证据

### 故事模板示例

**15天适应故事：**
> 第15天，微微觉得「还行，慢慢找到节奏」。身体开始有力量了。她跟教练说：「希望坚持下去。」这个小目标，正在一点点变成现实。

**90天成长故事：**
> 90天前，王莉说自己「核心力量薄弱」。90天后，她说体态是最明显的变化。中间想过放弃——但每次站在训练室门口，她还是走了进去。下一个90天，她想提升核心力量。

**365天蜕变故事：**
> 一年了。陈知意说「最大的变化是心态」。训练不再是坚持，而是生活本身。她想对一年前的自己说：「谢谢你没有放弃。」

---

## 数据库影响

| 操作 | 数量 |
|------|:----:|
| 新增表 | 0 |
| 新增字段 | 0 |
| 修改 schema.ts | 0 |
| 新增 API | 0（复用现有 `/api/sync/feishu` 同步逻辑） |

---

## 开发阶段预估

### Phase 1: 飞书表单创建
- 在飞书多维表格中新建 4 张子表或 4 个视图
- 配置字段（按本文档字段名）
- 时间：1h

### Phase 2: 同步逻辑扩展
- 修改 `src/app/api/sync/feishu/route.ts` 中的 `mapFeishuToMember` 函数
- 新增「按 memory_type 写入 member_memories」分支
- 新增「写入 daily_health_logs」分支
- 时间：3h

### Phase 3: Portal 展示
- Portal 首页新增「自我报告摘要」模块
- Portal 成长页新增健康日志趋势图
- 时间：3h

### Phase 4: 故事生成
- 新增 `src/lib/story-generator.ts`
- 根据 `member_memories` + 数据自动组装故事文本
- 时间：2h

**总计：约 9 小时（分 4 个 Phase，可分批交付）**

---

## 附录：飞书表单创建指引

### 在飞书多维表格中创建

1. 进入飞书 → 多维表格 → 徕舞会员表
2. 新建 4 张子表：
   - 「15天适应记录」
   - 「30天月度记录」
   - 「90天阶段回顾」
   - 「365天周年纪念」
3. 每张子表第一个字段设为「会员编号」（关联主表 `member_code`）
4. 按本文档题目设计添加对应字段
5. 将 4 张子表的 `table_id` 配置到 `.env.local`：
   ```
   FEISHU_TABLE_15D=tblXXXXXXXX
   FEISHU_TABLE_30D=tblYYYYYYYY
   FEISHU_TABLE_90D=tblZZZZZZZZ
   FEISHU_TABLE_365D=tblWWWWWWWW
   ```


---

## APPENDIX · v2 优化（2026-06-03）

### 调整原则

伴随会员陪伴时间增长，逐步降低数据记录比例，提高成长记录与人生叙事比例。

### 30天成长记录（4题，原8题）

| 变化 | 说明 |
|------|------|
| 删除 | 今天体重（kg） |
| 新增 | 最近一个月，你最明显感受到的变化是什么？（8选1：身体更轻松/精力更充沛/睡眠更稳定/情绪更平和/更有自信/姿态改善/疼痛减少/暂时没有明显变化） |
| 保留 | 饮食变化、最骄傲的一件事、下个月的小目标 |

### 90天阶段回顾（7题，原8题）

| 变化 | 说明 |
|------|------|
| 删除 | 体重、睡眠、精力、压力（全部量化题） |
| 新增 | 最近三个月最大的变化、最满意的坚持、最近生活状态如何、加入以来改变最大的是 |
| 保留 | 训练的意义、想放弃时如何坚持、下一个90天目标 |

### 365天周年纪念（8题，原9题）

| 变化 | 说明 |
|------|------|
| 删除 | 体重、睡眠、精力、压力（全部量化题） |
| 新增 | 最值得骄傲的一件事、最难忘的训练瞬间、如果向新会员介绍徕舞 |
| 保留 | 最大变化、训练的意义、想感谢的人、对一年前自己的话、下一年的期待 |

### 验收目标

90天和365天表单完成后，会员感受到的是：

**"我被看见。"** 而不是 **"我被统计。"**
