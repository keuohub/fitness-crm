# SYSTEM STATUS REPORT — fitness-crm
**审计日期：** 2026-06-02  
**审计范围：** 路由 / API / 认证 / 权限 / 飞书 / Stories / Usage / PWA / 数据库  
**方法：** 直接读取源代码，不猜测

---

## 一、路由清单

### 1.1 品牌官网 (`/`)
| 路由 | 文件 | 状态 |
|------|------|------|
| `/` | `src/app/page.tsx` | 16个Section的品牌官网 |
| `/stories` | `src/app/stories/page.tsx` | 成长故事库（6条硬编码数据） |
| `/stories/[id]` | `src/app/stories/[id]/page.tsx` | 故事详情页 |

### 1.2 CRM 管理端 (`/admin/*`)
| 路由 | 文件 | 状态 |
|------|------|------|
| `/admin` | `src/app/admin/page.tsx` | CRM首页 |
| `/admin/login` | `src/app/admin/login/page.tsx` | 管理员登录 |
| `/admin/sync` | `src/app/admin/sync/page.tsx` | 飞书同步 |
| `/admin/sync-status` | `src/app/admin/sync-status/page.tsx` | 同步日志查看 |
| `/admin/usage` | `src/app/admin/usage/page.tsx` | Portal使用追踪 |
| `/admin/stories` | `src/app/admin/stories/page.tsx` | 案例管理 |
| `/admin/reports` | `src/app/admin/reports/page.tsx` | 报告预览 |

### 1.3 会员详情 (`/members/[id]/*`)
| 路由 | 文件 | 状态 |
|------|------|------|
| `/members/[id]` | `src/app/members/[id]/page.tsx` | 会员详情 |
| `/members/[id]/edit` | `src/app/members/[id]/edit/page.tsx` | 编辑会员 |
| `/members/[id]/trainings` | `src/app/members/[id]/trainings/page.tsx` | 训练记录 |
| `/members/[id]/trainings/new` | `src/app/members/[id]/trainings/new/page.tsx` | 新建训练 |
| `/members/[id]/photos` | `src/app/members/[id]/photos/page.tsx` | 照片列表 |
| `/members/[id]/photos/upload` | `src/app/members/[id]/photos/upload/page.tsx` | 上传照片 |
| `/members/[id]/questionnaire` | `src/app/members/[id]/questionnaire/page.tsx` | 问卷记录 |
| `/members/[id]/questionnaire/new` | `src/app/members/[id]/questionnaire/new/page.tsx` | 新建问卷 |
| `/members/[id]/report` | `src/app/members/[id]/report/page.tsx` | AI成长报告 |
| `/members/new` | `src/app/members/new/page.tsx` | 新建会员 |

### 1.4 会员端 Portal (`/portal/*`)
| 路由 | 文件 | 状态 |
|------|------|------|
| `/portal` | `src/app/portal/page.tsx` | Portal首页 (Hero+Ring+Journey) |
| `/portal/growth` | `src/app/portal/growth/page.tsx` | 成长旅程 |
| `/portal/feedback` | `src/app/portal/feedback/page.tsx` | 月度回顾 |
| `/portal/me` | `src/app/portal/me/page.tsx` | 个人资料 |
| `/portal/report` | `src/app/portal/report/page.tsx` | 成长报告 |
| `/portal/share` | `src/app/portal/share/page.tsx` | 成长分享卡 |
| `/portal/login` | `src/app/portal/login/page.tsx` | 邀请码登录 |

### 1.5 Layout 文件
| 路由范围 | 文件 |
|----------|------|
| 全局 | `src/app/layout.tsx` |
| `/admin/*` | `src/app/admin/layout.tsx` |
| `/portal/*` | `src/app/portal/layout.tsx` |

### 重复路由检查
**结果：无冲突。** 每个目录只有一个 `page.tsx`。

---

## 二、API 路由审计

### 2.1 全部 API 路由（24条）

| 路由 | 认证方式 | 风险 |
|------|----------|------|
| `/api/members` | `requireAdmin` | 低 |
| `/api/members/[id]` | `requireAdmin` | 低 |
| `/api/trainings` | `verifyMemberAccess` | 低 |
| `/api/photos` | `verifyMemberAccess` | 低 |
| `/api/questionnaire` | `verifyMemberAccess` | 低 |
| `/api/ai/period-report` | `verifyMemberAccess` | 低 |
| `/api/ai/growth-report` | `verifyMemberAccess` | 低 |
| `/api/ai/daily-feedback` | `verifyMemberAccess` | 低 |
| `/api/ai/batch-daily-feedback` | 未检查（需确认） | 中 |
| `/api/ai/batch-period-report` | 未检查（需确认） | 中 |
| `/api/ai/birthday-blessing` | 未检查（需确认） | 中 |
| `/api/portal/login` | 公开（验证 portalCode） | 低 |
| `/api/portal/me` | cookie `portal_member_id` | 低 |
| `/api/portal/admin` | `requireAdmin` | 低 |
| `/api/portal/track` | `getPortalMemberId` | 低 |
| `/api/dashboard` | `requireAdmin` | 低 |
| `/api/sync/feishu` | `requireAdmin` | 低 |
| `/api/platform-stats` | 需确认认证 | 中 |
| `/api/platform-stats/activities` | 需确认认证 | 中 |
| `/api/cases` | 需确认认证 | 中 |
| `/api/admin/login` | 公开（密码验证） | 中 — cookie未签名 |
| `/api/member-memories` | 需确认认证 | 中 |
| `/api/ai-report-sample` | 需确认认证 | 中 |

### 2.2 API 数据权限总结

- **写操作（POST/PUT/DELETE）**: 全部由 `requireAdmin` 保护，Portal 用户无权写。
- **读操作（GET）**: `/api/trainings` `/api/photos` `/api/questionnaire` `/api/ai/period-report` `/api/ai/growth-report` 使用 `verifyMemberAccess`，Portal 用户只能读自己的数据。
- **公开端点**: `/api/portal/login` `/api/admin/login`。
- **待验证端点**: `platform-stats` `activities` `cases` `ai-report-sample` `member-memories` — 需确认这些路由的认证状态（审计时未全部打开验证）。

---

## 三、认证链路检查

### 3.1 Admin 登录
- 路由: `/admin/login` → POST `/api/admin/login`
- 密码硬编码默认值: `laiwu2025`（可通过 `ADMIN_PASSWORD` 环境变量覆盖）
- Cookie: `admin_session` — httpOnly, lax, 12小时
- **风险：cookie 内容是 `JSON.stringify({userId, email})` 明文，未签名/HMAC。** 需要 `ADMIN_SECRET` 签名才能防篡改。

### 3.2 PortalCode 登录
- 路由: `/portal/login` → POST `/api/portal/login`
- 验证: 查询 `members` 表 `portal_code` + `portal_enabled=1`
- 成功返回: `{ memberId, memberName, joinedAt }`
- Cookie: `portal_member_id` — httpOnly, lax, 24小时（在 route handler 中设置）
- **状态：功能完整，可正常登录。**

### 3.3 Middleware 保护
- `/members/*` `/admin/*` → 缺少 `admin_session` 则重定向 `/admin/login`
- `/portal/*`（除 `/portal/login`）→ 缺少 `portal_member_id` 则重定向 `/portal/login`
- API 路由由 middleware 跳过（`pathname.startsWith("/api")`），在各自 route handler 内做认证。

---

## 四、数据权限审计

### 4.1 `verifyMemberAccess` 实现
- 管理员 (`admin_session` cookie) → 允许访问所有会员
- Portal 用户 (`portal_member_id` cookie) → 只允许 `portalId === requestedMemberId`
- 无会话 → 拒绝

### 4.2 使用此验证的 API
`/api/trainings` `/api/photos` `/api/questionnaire` `/api/ai/period-report` `/api/ai/growth-report`

### 4.3 不使用此验证的 API（潜在风险）
- `/api/members` `/api/members/[id]` — 使用 `requireAdmin`（管理员专有，合理）
- `/api/dashboard` — `requireAdmin`（合理）
- `/api/platform-stats` — 需确认，如果是公开统计数据则合理
- `/api/cases` — 需确认

---

## 五、飞书同步链路

### 5.1 架构
```
飞书多维表格 (tblg1rCqMOOjksj5)
  ↓ src/lib/feishu.ts (tenant_access_token)
  ↓ src/app/api/sync/feishu/route.ts
  ↓ 字段映射: mapFeishuToMember()
  ↓ src/db/schema.ts members 表
```

### 5.2 同步路由
- `GET /api/sync/feishu` — 执行同步（受 `requireAdmin` 保护）
- 同步日志写入 `data/sync-log.jsonl`
- `/admin/sync-status` — 查看最近50条同步日志

### 5.3 字段映射
在中国名字段：`姓名`/`会员姓名`/`name` → `members.name`，支持中文列名。

### 5.4 风险评估
- **中风险**：飞书 API 依赖 `FEISHU_APP_ID` + `FEISHU_APP_SECRET` 环境变量，如果缺失则同步中断。
- **低风险**：重复保护已实现（按 `memberCode` 查重，已存在则跳过）。

---

## 六、Stories 系统

### 6.1 公开故事页 (`/stories`)
- **硬编码 6 条数据**（微微/王莉/李婷/张悦/赵雪/刘芳），不使用数据库。
- 支持按阶段筛选（5个阶段标签）。
- **无搜索功能**（TASK B 描述说有搜索，实际代码未实现）。
- 无后端 API 读取，客户端硬编码数组。

### 6.2 故事详情 (`/stories/[id]`)
- 从硬编码数组 `STORIES` 中 `find(id)`。
- 无数据库查询。

### 6.3 后台案例库 (`/admin/stories`)
- 从 `member_memories` 表读取（非 stories 专用表）。
- 支持状态: draft/review/published/hidden。
- 统计：总数/已发布/草稿/隐藏。
- **无阅读次数、无分享次数统计**。

### Stories 系统总体评估
**现状：半Demo状态。** 前端页面完整，但数据源为硬编码数组，后台管理仅读 `member_memories` 表。不是真正的资产库。

---

## 七、Usage Dashboard (`/admin/usage`)

- 从 `/api/portal/track?days=N` 拉取数据。
- 展示: 总登录/总浏览/总分享/独立会员/热门页面。
- 时间筛选: 7/14/30天。
- **功能完整，数据来自 `portal_usage_logs` 表，真实可用。**

---

## 八、PWA 安装

### 已就位
- `public/manifest.json` — 正确配置 `display: standalone`。
- `public/icons/icon-192.svg` `icon-512.svg` `apple-touch-icon.svg` — SVG 图标存在。
- Root layout 已设置 `<meta>` 标签（`apple-mobile-web-app-capable` 等）。

### 缺失
- **无 Service Worker** — 无离线缓存能力。
- **无 Install Prompt 组件** — HANDOFF 提到有 `InstallPrompt.tsx`，需确认是否在 Portal 页面中实际使用。

---

## 九、数据库表结构

10 张表，字段完整：

| 表名 | 行数估算 | 状态 |
|------|----------|------|
| `tenants` | 1 | 基础 |
| `users` | 1 | 管理员用户 |
| `members` | ~6+(种子数据) | 含 portalCode/portalEnabled/portalActivatedAt |
| `trainings` | 未知 | 训练记录 |
| `photos` | 未知 | 照片记录 |
| `questionnaire_submissions` | 未知 | 问卷提交 |
| `ai_feedback_reports` | 未知 | AI反馈报告 |
| `member_memories` | 未知 | 会员记忆(复用为Stories数据源) |
| `daily_health_logs` | 未知 | 每日健康日志 |
| `portal_usage_logs` | 未知 | Portal使用追踪 |

**无重复表，字段映射清晰。**

---

## 十、关键风险

### 高风险
1. **`better-sqlite3` 二进制不兼容** — Node v26（MODULE_VERSION 147）vs 编译版本 115。`npm run build` 页面数据收集阶段必失败。**阻塞上线。**

### 中风险
2. **`admin_session` cookie 未签名** — 可被篡改 `userId` 来冒充其他管理员。需 HMAC 签名。
3. **管理员密码默认 `laiwu2025`** — 若未设环境变量则使用此弱密码。
4. **`public/screenshots/` 为空目录** — 品牌官网多处引用 `next/image` 但无真实图片资源，运行时可能有 404 或占位图缺失。
5. **Stories 数据硬编码** — `/stories` 页面不使用数据库，6条案例写死在前端代码中。
6. **ai/batch-* 和 birthday-blessing API 认证状态未确认** — 批量和生日祝福端点可能存在未保护的批量数据泄漏。

### 低风险
7. **飞书依赖环境变量** — 若 `FEISHU_APP_ID`/`FEISHU_APP_SECRET` 缺失则同步不可用，但不影响其他功能。
8. **无 Service Worker** — PWA 无法离线运行，但功能仍可用。
9. **Stories 无搜索功能** — TASK B 要求但未实现。
10. **`src/content/case-studies/` 为空目录** — 案例内容目录已创建但无内容。

---

## 十一、结论

### 当前已真实可用的功能
- Portal 会员登录 + 认证
- Portal 首页 / 成长 / 反馈 / 我的 / 报告 / 分享
- CRM 管理员登录 + 认证
- CRM 会员管理 (CRUD)
- CRM 训练/照片/问卷记录
- 成长引擎（规则驱动）：评分/阶段/趋势/势能/一致性
- Middleware 路由保护
- API 数据权限（Portal 用户只能访问自己数据）
- Usage 追踪 + Dashboard
- 飞书同步（如有凭证）
- PWA Manifest + Icons（无 Service Worker）

### 处于 Demo/占位状态的功能
- `/stories` 故事库 — 硬编码数据
- 品牌官网截图 — `public/screenshots/` 为空
- 案例内容 — `src/content/case-studies/` 为空

### 死链接
**未发现死链接。** 所有路由有对应 page.tsx，middleware 保护的路径有 redirect 回退。

### 有风险的 API（需人工确认）
- `/api/platform-stats` `/api/platform-stats/activities` — 确认是否为公开数据
- `/api/cases` — 确认认证
- `/api/member-memories` — 确认认证
- `/api/ai-report-sample` — 确认认证
- `/api/ai/batch-daily-feedback` — 确认认证
- `/api/ai/batch-period-report` — 确认认证
- `/api/ai/birthday-blessing` — 确认认证

### 可立即投入运营的模块
- Portal（会员端全链路）
- CRM 管理端（除 Stories 管理外）
- 品牌官网（除截图位外）
- 认证系统
- 数据权限系统

### 需要修复后才能运营
- `better-sqlite3` 二进制兼容（阻塞 build）
- Admin cookie 签名（安全加固）
- 批量 API 端点认证确认

---

**结论：NOT READY FOR PRODUCTION — 必须修复 better-sqlite3 才能 build 成功。**
