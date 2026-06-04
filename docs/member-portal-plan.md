# Member Portal IA

会员端产品架构文档

---

## Sitemap（页面结构）

```
Member Portal
├── Dashboard         我的首页
├── Growth            我的成长
├── Training          我的训练
├── Photos            我的照片
├── Reports           AI成长报告
├── Goals             本月目标
└── Badges            成长勋章
```

---

## 组件树

### Growth Page（我的成长）

```
Growth Page
├── GrowthSummaryCard      # 加入天数 + 成长阶段 + 进度条 + 四列数据
├── GrowthTimeline         # 全类型事件时间轴
├── MilestoneCards         # 里程碑卡片墙
└── ProgressChart          # 体重/训练次数趋势图
```

### Dashboard（我的首页）

```
Dashboard
├── TodayQuoteCard         # 今日寄语
├── NextTrainingCard       # 下次训练提醒
├── WeeklySummary          # 本周训练摘要
└── RecentPhotosStrip      # 最近照片横滑
```

### Training Page（我的训练）

```
Training Page
├── TrainingCalendar       # 月历视图
├── TrainingTimeline       # 时间轴 + 训练详情
├── TrainingStats          # 训练统计（总次数/类型分布/时长）
└── AddTrainingButton      # 快速记录
```

### Photos Page（我的照片）

```
Photos Page
├── PhotoGrid             # 网格 + 筛选
├── BeforeAfterSlider     # 对比滑动条
├── PhotoDetail           # 单张查看 + 笔记
└── ProgressTimeline      # 照片时间轴
```

### Reports Page（AI成长报告）

```
Reports Page
├── ReportList            # 报告列表（筛选：每日/每周/每月/季度/年度）
├── ReportDetail          # 报告全文 + 关键数据高亮
└── GenerateButton        # 申请生成新报告
```

### Goals Page（本月目标）

```
Goals Page
├── GoalCard              # 目标卡片（训练次数/体重/体脂率）
├── GoalProgress          # 进度环形图
└── GoalHistory           # 历史目标完成情况
```

### Badges Page（成长勋章）

```
Badges Page
├── BadgeGrid             # 勋章网格（已获得/未获得）
├── BadgeDetail           # 勋章详情 + 获得条件
└── NextBadgePreview      # 下一个即将获得的勋章
```

---

## 会员价值说明

### 参与感

每天打开系统，看到自己的头像、名字、专属数据。不是被管理，是自己是主角。从「教练记录我」变成「我记录自己」。

### 记录感

每一次训练、每一张照片、每一份问卷，都被系统自动收集并整理成时间轴。不是零散的记忆碎片，而是完整的成长故事线。

### 反馈感

AI 每日关怀、周报、月报、季度总结——不是冰冷的数字汇报，而是有温度的陪伴式反馈。用教练的口吻、会员的名字、具体的数据，告诉会员「你做得很好」。

### 陪伴感

时间轴从「加入第一天」开始，跨度可以是一年、两年。每一次打开都看到自己的成长轨迹在延续。不是单次服务，是长期陪伴。

### 成就感

里程碑勋章把抽象的努力变成可见的奖励。「第10次训练」「连续7天」「体重下降2kg」——每一条都是一个值得骄傲的节点。会员不是被要求训练，是被激励继续。

---

## 与当前 CRM 的关系

- 当前系统是**教练端 CRM**（管理工具）
- Member Portal 是**会员端**（展示 + 参与工具）
- 两者共享同一数据库、同一 API，但 UI 和权限隔离
- 路由建议：`/portal/*` 作为会员端入口

---

## 下一阶段建议

1. 为会员端创建独立 layout（无管理类导航）
2. 实现 `/portal` 入口页
3. 逐步将 GrowthTimeline、训练记录、照片对比迁移为会员端组件
4. 新增勋章引擎（复用里程碑检测逻辑）
