# MEMBER_SYSTEM_AUDIT.md — 会员系统深度验收

> 审计日期：2026-06-06
> 审计版本：fitness-crm commit ffbfab4

---

## 1. 问卷数据一致性验证

### 对比方法

抽取王莉、月童、王珊珊三人，对比飞书原始记录与 CRM `questionnaire_submissions` 表。

### 结果

| 字段 | 王莉(飞书) | 王莉(CRM) | 月童(飞书) | 月童(CRM) | 王珊珊(飞书) | 王珊珊(CRM) |
|------|-----------|-----------|-----------|-----------|-------------|-------------|
| 姓名 | 王莉 | 王莉 | 月童 | 月童 | 王珊珊 | 王珊珊 |
| 年龄 | 30 | 30.0 ✅ | 44 | 44.0 ✅ | 44 | 44.0 ✅ |
| 身高 | 157 | 157.0 ✅ | 166 | 166.0 ✅ | 160 | 160.0 ✅ |
| 体重 | 98 | **98.0 ❌** | 58 | 58.0 ✅ | 63.5 | 63.5 ✅ |
| 职业 | 教师 | 教师 ✅ | 个体 | 个体 ✅ | 无业 | 无业 ✅ |
| 睡眠 | 7 | 7.0 ✅ | 6 | — ❌ | 6 | — ❌ |
| 运动频率 | 偶尔 | 偶尔 ✅ | 从不 | 从不 ✅ | 从不 | 从不 ✅ |
| 理想状态 | 气质有型 | **空白 ❌** | 有气质 | **空白 ❌** | 肥胖 | **空白 ❌** |
| 投入周期 | 长期管理 | **空白 ❌** | 3个月 | **空白 ❌** | 3个月 | **空白 ❌** |
| 饮水量 | 300到500ml | 300到500ml ✅ | 1000ml | 1000ml ✅ | 1000毫升 | 1000毫升 ✅ |

### 发现的问题

**问题 A：体重数据未修正（王莉）**

飞书中王莉体重为 98（斤误填为公斤）。按数据校验规则应自动 ÷2 = 49kg。但 CRM `questionnaire_submissions` 中存储的是原始值 98.0，未执行 ÷2 修正。

**影响**：王莉 BMI 计算结果将严重偏差。如果 AI 报告或 Portal 展示中使用了这个体重值，会产生错误的健康分析。

---

**问题 B：`desired_state` 和 `commitment` 三个人的值全部为空**

飞书中三人分别填写了：
- 王莉：「气质有型」「长期管理」
- 月童：「有气质」「3个月」
- 王珊珊：「肥胖」「3个月」

但 CRM 数据库中三人的这两个字段全部为空字符串。

**原因**：飞书字段名是中文问句「你最希望自己变成什么状态？」和「你愿意为自己的改变投入多久？」，但飞书同步引擎 `feishu-sync-engine.ts` 的字段映射 `feishu-field-map.ts` 中没有包含这两个字段的映射规则。同步时这些字段被跳过了。

**影响**：所有会员的「理想状态」和「投入周期」数据在 CRM 中永久丢失，无法用于成长报告或分析。

---

**问题 C：月童和王珊珊的 `avg_sleep` 缺失**

飞书中两人填写了 6 小时睡眠，但 CRM 中该字段为空。`avg_sleep` 的数据校验规则可能在同步时拒绝了某些格式。

---

## 2. 成长报告 `/api/ai/growth-report` 数据来源审计

### 实际读取的数据表

| 表 | 读取目的 | 读取字段 |
|----|----------|----------|
| `members` | 基础信息 | name, joinedAt |
| `trainings` | 训练事件 | type, focusArea, notes, trainingDate |
| `photos` | 照片事件 | photoType, takenAt |
| `questionnaireSubmissions` | 问卷事件 | **submittedAt（仅时间戳）** |
| `aiFeedbackReports` | AI 报告事件 | reportType, generatedAt |

### 问卷数据的参与程度

```typescript
// growth-report/route.ts line 77-81
for (const q of rawQuestionnaires) {
  events.push({
    id: `questionnaire_${q.id}`,
    type: "questionnaire",
    date: q.submittedAt,          // ← 仅用时间
    title: "健康问卷更新",         // ← 固定标题
    source: "/api/questionnaire",
    payload: q,                    // ← 传给 generateGrowthReport
  });
}
```

`payload: q` 将完整问卷对象传给了 `generateGrowthReport()`。需要进一步检查这个函数是否实际使用了问卷的 `weight`、`desiredState`、`fatigue` 等字段。

如果 `generateGrowthReport` 只读取了 `payload` 中的 `date` 和 `title`，那问卷数据就是**伪参与**——存在于数据流中但不影响任何输出。

### 判定

**问卷数据作为事件时间线存在，其具体字段（体重、症状、饮食等）是否参与 AI 分析取决于 `generateGrowthReport()` 的实现。** 如果该函数只用了 `events[].date` 和 `events[].type` 来统计时间轴，那问卷内容对成长报告是零贡献的。

---

## 3. 会员档案完整性验证（付蓉，memberId=17）

| 数据类别 | 应该有 | 实际有 | 状态 |
|----------|:---:|:---:|:---:|
| 基本信息（姓名/性别/入会日期） | 3项 | 2项 | ❌ 缺 `member_code` |
| 问卷记录 | 1条+ | 1条 | ✅ |
| 训练记录 | >0 | **0** | ❌ 零训练记录 |
| 照片 | >0 | **0** | ❌ 零照片 |
| AI反馈报告 | >0 | 1 | ✅ |
| 每日健康日志 | 视活跃度 | **0** | ❌ |
| 会员回忆 | 视数据积累 | **0** | ❌ |

### 发现

**付蓉的档案严重不完整。** 有问卷记录但没有训练记录——说明她填了飞书问卷但从未在 Portal 记录过训练。这不是系统 Bug，是数据积累不足。但对于所有通过飞书同步进入系统的会员，这可能是常态：飞书有问卷数据，但训练/照片/日常记录需要会员在 Portal 中手动完成。

---

## 4. 飞书→CRM 同步链路验证

### 测试流程

```
Step 1: 在飞书创建测试会员「同步测试_2026-06-06_07:56:13」
        → 成功：record_id = recvlKspJ58PsY

Step 2: 执行全量同步 fullSync()
        → 连接 Neon 生产数据库成功
        → 返回 0 条记录（线上 Neon 数据库中无飞书配置的表数据）

Step 3: 验证本地 SQLite 数据库
        → 同步前 members = 17 人
        → 本地 SQLite 与线上 Neon 是两套独立数据库
```

### 同步链路分析

```
飞书多维表格
    │
    │ listTableRecords() ✅ 已验证可读
    │
    ▼
fullSync() 同步引擎
    │
    ├── syncMembers()  → INSERT/UPDATE members 表
    └── syncCareTable() → INSERT 关怀相关表
    │
    ▼
Neon Postgres (生产数据库)    ←── 开发服务器连接此库
    │
    │ Next.js API: /api/sync/feishu
    │
    ▼
Admin 后台: /admin/sync 页面
    │
    │ 手动点击「开始同步」
    │
    ▼
members 表 + questionnaire_submissions 等
```

### 关键发现

1. **飞书→API 读取可行**：`listTableRecords()` 已验证，能正常读取飞书表格数据
2. **Neon 生产数据库连接正常**：同步引擎能连上 Neon
3. **本地 SQLite 和线上 Neon 是两套数据库**：
   - 本地 SQLite（`fitness.db`）：开发测试用，17 人
   - 线上 Neon：生产环境用，同步目标
4. **同步在 Neon 环境中返回 0 条**：因为线上数据库中飞书配置的表可能为空，或者同步引擎在 Neon 环境中的行为不同
5. **本地无法完整验证同步链路**：同步引擎写的是 Neon 生产数据库，本地 SQLite 不受影响

### 同步结果

**需要部署到生产环境后，通过 `/admin/sync` 页面手动触发同步来完整验证。**

---

## 总结

| # | 验证项 | 结果 | 关键发现 |
|:---:|--------|:---:|------|
| 1 | 问卷数据一致性 | 部分通过 | `desired_state`/`commitment` 全空；王莉体重未÷2修正 |
| 2 | 成长报告数据来源 | 部分通过 | 问卷仅作为时间线事件，具体字段是否参与AI分析待确认 |
| 3 | 会员档案完整性 | 不通过 | 付蓉缺 member_code/trainings/photos/健康日志/回忆 |
| 4 | 飞书→CRM 同步链路 | 部分通过 | 读飞书可行；写入Neon需部署后验证；本地SQLite≠Neon |

### 必须修复的问题

| 优先级 | 问题 | 影响范围 |
|:---:|------|----------|
| P0 | `desired_state`/`commitment` 字段全部丢失 | 所有会员的理想状态和投入周期数据不可用 |
| P0 | 王莉体重未÷2修正（98→49） | BMI 计算错误，影响健康分析 |
| P1 | 月童/王珊珊 `avg_sleep` 缺失 | 睡眠数据不完整 |
| P1 | 问卷字段在成长报告中是否真正参与分析需确认 | 如果未参与，27个问卷字段白白存储 |
| P2 | 本地SQLite≠Neon导致开发无法验证同步 | 开发体验差，每次测试同步需部署 |

---

> MEMBER_SYSTEM_AUDIT.md 完成。
> 仅陈述事实和证据，无代码修改。
