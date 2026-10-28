# SPRINT 29 REPORT — Brand Experience Unification (Phase 1)
**日期：2026-06-02**

---

## 审计结果

### 全项目关键词扫描

| 关键词 | 品牌官网 (`/`) | Portal (`/portal/*`) | CRM (`/admin/*/members/*`) |
|--------|:-------------:|:-------------------:|:-------------------------:|
| 飞书 | **0** | **0** | CRM Navbar 保留 |
| 同步 | **0** | **0** | CRM Navbar 保留 |
| 导入 | **0** | **0** | 0 |
| CRM | **0** (原本有) | **0** | CRM Navbar 保留 |
| 管理后台 | **0** | **0** | 0 |
| Dashboard | **0** | **0** | 0 |

**审计结论：品牌官网和 Portal 原本就没有飞书/同步/导入等运营词汇。唯一的问题是 Navbar 上有一个公开可见的「CRM」按钮。**

---

## 修改内容

### 唯一修改：`src/components/layout/Navbar.tsx`

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 品牌官网导航右侧 | 「会员入口」+「CRM」按钮（陶土橙色） | 仅「会员入口」（文字链接） |
| 品牌官网导航项 | 「客户案例」 | 「会员故事」 |
| 品牌官网导航项 | 「预约演示」 | 「预约体验」 |
| 品牌官网导航项 | 「产品矩阵」 | 「产品」 |
| CRM 导航 | 「工作台」「会员管理(/ )」「飞书同步」「周期报告」 | 「首页」「会员管理(/members)」「飞书同步」「运营数据」 |
| CRM 导航 (mobile) | 同上旧文案 | 同上新文案 |

### 未修改的内容

- 飞书同步逻辑 (`/api/sync/feishu`, `src/lib/feishu.ts`) — 保持不变
- CRM 后台的「飞书同步」导航链接 — 保留（仅管理员可见）
- 认证系统 — 不变
- 数据库结构 — 不变
- Portal 底部导航 — 已经无运营词汇：首页/我的旅程/本月回顾/我的

---

## 删除的入口

| 入口 | 位置 | 谁不再看到 |
|------|------|-----------|
| 「CRM」按钮 | 品牌官网 Navbar | 所有访客 |
| 「预约演示」 | 品牌官网 Navbar | 改为「预约体验」 |
| 「客户案例」 | 品牌官网 Navbar | 改为「会员故事」 |

## 保留在后台的功能

| 功能 | 访问方式 | 保护 |
|------|---------|------|
| 飞书同步 | `/admin/sync` | `requireAdmin` |
| 同步状态 | `/admin/sync-status` | `requireAdmin` |
| 邀请码生成 | `/api/portal/admin` | `requireAdmin` |
| 批量 AI 报告 | `/api/ai/batch-*` | `requireAdmin` |
| 生日祝福 | `/api/ai/birthday-blessing` | `requireAdmin` |
| 会员管理 | `/members/*` | middleware + `requireAdmin` |
| 运营数据 | `/admin/usage` | `requireAdmin` |

---

## 受影响的页面

| 页面 | 变化 |
|------|------|
| 品牌官网 `/` | Navbar「CRM」按钮消失，导航文案品牌化 |
| Portal `/portal/*` | 无变化（本身就没有运营词汇） |
| CRM `/admin/*` | Navbar 导航链接修正（`/` → `/members`），新增「运营数据」入口 |

---

## TypeScript & Build

- `npx tsc --noEmit` → **零错误**
- `npm run build` → **通过，42 routes**
- 修改文件数：**1**（`Navbar.tsx`）
- 数据库变更：**0**
- 认证变更：**0**
- 同步逻辑变更：**0**
