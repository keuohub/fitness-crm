# SPRINT 28A REPORT — Long-Term Member Experience Foundation
**日期：2026-06-02**

---

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `src/lib/member-archive.ts` | **新增** | 坚持档案计算引擎（累计训练/天数/月份/记录数） |
| `src/app/api/portal/archive/route.ts` | **新增** | Portal 坚持档案 API（认证保护） |
| `src/app/portal/me/page.tsx` | **修改** | 新增「坚持档案」模块（5项指标网格） |
| `src/app/members/page.tsx` | **修改** | 新增活跃度标签列（近30天训练次数 + 4级分类） |
| `src/lib/auth/admin-session.ts` | **修改** | 修复 TypeScript 类型守卫（MINOR） |

---

## 数据库变更

**零变更。** 0 个新表，0 个新字段，0 处 schema.ts 修改。

所有计算基于现有字段：`trainings.training_date`、`members.joined_at`。

---

## TypeScript 状态

```
npx tsc --noEmit
→ 零错误
```

## Build 状态

```
npm run build
→ ✓ Compiled successfully
→ ✓ Finished TypeScript
→ ✓ Generating static pages (42/42)
→ 42 条路由全部生成成功
```

---

## 新增功能详情

### 1. Portal 会员旅程 Timeline

`useGrowthEvents` hook 本身已支持 joinedAt 事件（第 0 号事件）和里程碑检测（第10次训练、连续7天等），无需修改。

Portal「成长」页已有 `JourneyProgress` 进度条 + `computeMilestones` 里程碑展示 + `BadgeCard` 勋章。本次 Sprint 无需修改此页。

### 2. Portal 坚持档案

新增 `/api/portal/archive` + 前端展示模块。

计算维度：
- 累计训练次数（`trainings` COUNT）
- 累计训练天数（`trainings` COUNT DISTINCT date）
- 连续训练月份（按月聚合，取最长连续）
- 成长记录数量（4表总和）
- 陪伴天数（`joined_at` 至今）

前端通过 fetch 调用 API，避免客户端打包 better-sqlite3。

### 3. CRM 活跃度标签

会员列表新增列：`{N}次/30天` + 活跃度标签。

| 近30天训练 | 标签 | 颜色 |
|:----------:|------|:----:|
| >= 8 次 | 高活跃 | 绿色 |
| 4-7 次 | 稳定 | 蓝色 |
| 1-3 次 | 值得关注 | 橙色 |
| 0 次 | 长期未见 | 红色 |
| freeze_status=frozen | 已冻结 | 灰色 |

---

## 暂缓项

| 项目 | 原因 |
|------|------|
| 荣誉体系扩展（8新勋章） | 下一 Sprint |
| 90天阶段回顾 | 下一 Sprint |
| 会员年鉴 | 需积累更多数据 |

---

## 验收

- `/portal/me` — 可看到「坚持档案」模块（需先登录）
- `/members` — 可看到每位会员的活跃度标签和近30天训练次数
- `/api/portal/archive` — 认证保护，未登录返回 401
- Build 通过，零 TypeScript 错误，零数据库变更
