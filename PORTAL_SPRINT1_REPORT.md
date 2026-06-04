# PORTAL_SPRINT1_REPORT.md

## Sprint 1 — 会员端闭环 · 完成报告

---

## 新增文件（4 个）

| 文件 | 行数 | 内容 |
|------|------|------|
| `src/app/portal/growth/page.tsx` | 167 | 等级卡片 + 数据摘要 + 勋章 + 时间轴（复用 useGrowthEvents / getGrowthStats / getMemberLevel / generateBadges / BadgeCard） |
| `src/app/portal/feedback/page.tsx` | 112 | 反馈报告列表 + 展开收起（调用 /api/ai/period-report） |
| `src/app/portal/me/page.tsx` | 115 | 头像 + 基础资料 + 目标信息 + 等级进度（复用 member-level.ts） |
| `src/app/portal/login/page.tsx` | 93 | 邀请码登录 Mock 版（演示码：LAIWU0010） |

## 修改文件（2 个）

| 文件 | 改动 |
|------|------|
| `src/db/schema.ts` | 新增 portalCode / portalEnabled / portalActivatedAt 字段（Phase 1 已做） |
| `src/components/portal/PortalNav.tsx` | 无需修改（4 个链接在新建页面后全部生效） |

## 未修改文件

- `src/app/page.tsx` — CRM 首页
- `src/components/dashboard/*` — CRM 组件
- `src/app/api/*` — 所有 API
- `src/hooks/useGrowthEvents.ts` — 数据 Hook
- 所有 `_components/*` — 会员详情组件

## TypeScript 状态

零错误。

## npm run build 状态

通过。29 条路由全部编译成功：

```
/portal            — Portal 首页
/portal/growth     — 成长页
/portal/feedback   — 反馈页
/portal/me         — 我的页
/portal/login      — 登录页
```

## 路由列表

| 路由 | 页面 | 组件/数据来源 |
|------|------|-------------|
| `/portal` | 首页 | useGrowthEvents + getGrowthStats + 今日关怀 |
| `/portal/growth` | 成长 | useGrowthEvents + BadgeCard + getMemberLevel |
| `/portal/feedback` | 反馈 | fetch(/api/ai/period-report) |
| `/portal/me` | 我的 | getMemberLevel + daysSince |
| `/portal/login` | 登录 | Mock 邀请码 LAIWU0010 |

## CRM 管理端：零影响

`/` `/members/*` `/admin/*` 全部保持不变。

## 风险点

- **低**：Portal 子页面仍硬编码 memberId=18，后续接认证后替换。
- **低**：feedback 页和 CRM FeedbackTimeline 各自独立调用同一 API，未共享缓存（数据量小时无影响）。
- **低**：login 页为 Mock 版，邀请码硬编码 LAIWU0010。

## 下一阶段建议

1. 实现真实登录（验证 portalCode → 查询会员 → 设置 session）
2. PortalHeader 从 session 读取 memberName/joinedAt
3. 所有子页面改为读取 session memberId 而非硬编码
4. 新增 goals、badges 详情页
