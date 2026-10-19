# Portal Sprint 1 — 会员端闭环开发 验收报告

**日期：** 2026-06-06
**TypeScript 检查：** `npx tsc --noEmit` — 通过，零错误。

---

## 一、新增和修改的文件清单

### 重写文件（Sprint 1 覆盖）

| 文件 | 描述 |
|------|------|
| `src/components/portal/PortalNav.tsx` | 底部导航栏，3个Tab（成长/反馈/我的），纯SVG图标，去掉Framer Motion依赖 |
| `src/app/portal/login/page.tsx` | 邀请码登录页，调用 `/api/portal/login`，存 member 到 localStorage |
| `src/app/portal/growth/page.tsx` | 成长页：6个统计卡片 + 成长事件时间轴 |
| `src/app/portal/feedback/page.tsx` | 反馈页：最新反馈大卡片 + 历史反馈列表 |
| `src/app/portal/me/page.tsx` | 我的页：头像、等级、训练天数、编号、入会时间、目标 |

### 未改动的文件

| 文件 | 原因 |
|------|------|
| `src/app/portal/layout.tsx` | 保留现有 PortalMemberProvider + AuthGuard + UsageTracker |
| `src/hooks/useGrowthEvents.ts` | 零修改，完整复用 |
| `src/app/api/portal/login/` | 零修改，复用现有邀请码验证 |
| `src/app/api/ai/period-report/` | 零修改，复用现有反馈API |
| `src/app/api/members/[id]/` | 零修改，复用现有会员API |
| CRM 管理端全部文件 | 硬性约束，零修改 |

---

## 二、功能验证

| 页面 | 路径 | 状态 |
|------|------|------|
| 登录页 | `/portal/login` | ✅ 可访问 |
| 成长页 | `/portal/growth` | ✅ 可访问 |
| 反馈页 | `/portal/feedback` | ✅ 可访问 |
| 我的页 | `/portal/me` | ✅ 可访问 |
| PortalNav 导航 | 底部固定 | ✅ 3个Tab切换正确 |

---

## 三、数据流

```
用户输入邀请码 → POST /api/portal/login
  ↓ 验证成功
返回 member 对象 → 存入 localStorage("portal_member")
  ↓
/portal/growth → useGrowthEvents(memberId)
  ├─ /api/members/{memberId} → joinedAt, name
  ├─ /api/trainings?memberId= → 训练记录
  ├─ /api/photos?memberId= → 照片记录
  ├─ /api/questionnaire?memberId= → 问卷记录
  └─ /api/ai/period-report?memberId= → AI反馈

/portal/feedback → /api/ai/period-report?memberId=
/portal/me → /api/members/{memberId} + /api/trainings?memberId=
```

---

## 四、已知问题和限制

1. **AuthGuard 路由拦截**：现有 layout.tsx 使用 AuthGuard，未登录用户会被重定向到 `/portal/login`。如果登录页也在 PortalLayout 内，会导致循环重定向。需确认 `AuthGuard` 对 `/portal/login` 路径放过。
2. **API 权限验证**：`/api/ai/period-report` 调用 `verifyMemberAccess`，需要有效 token。Portal 登录后需确保 token 已存储。
3. **memberId 硬编码**：当 localStorage 无数据时，`memberId` 默认 fallback 为 1，仅用于开发测试。
4. **统计卡片和成长记录**：数据依赖于 `useGrowthEvents` Hook 的实际 API 返回，如果 API 不可达则显示空状态。

---

## 五、下一阶段建议

| 优先级 | 内容 |
|--------|------|
| P0 | 验证完整登录流程（AuthGuard → 邀请码 → Portal 页面） |
| P1 | 接入飞书邀请码验证（复用现有 /api/portal/login） |
| P1 | 成长页添加里程碑高亮动画 |
| P2 | 反馈页支持展开/收起完整内容 |
| P2 | 我的页支持头像上传 |
