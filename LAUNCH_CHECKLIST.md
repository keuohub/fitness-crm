# LAUNCH_CHECKLIST.md

> 上线前最后一轮检查
> 基线：Sprint 42 Stable / release-preparation 分支

---

## P0 — 阻塞上线

| # | 检查项 | 状态 | 备注 |
|---|--------|:---:|------|
| 1 | Build 通过 | ✅ | 49 页，TS 零错误 |
| 2 | 首页正常加载 | ✅ | 200 |
| 3 | Portal 登录页 | ✅ | 200 |
| 4 | Admin 后台 | ✅ | 307（重定向到登录） |
| 5 | API 正常响应 | ✅ | activities/report-sample 均 200 |
| 6 | 数据库连接 | ✅ | better-sqlite3 已 rebuild |
| 7 | .env.local 完整 | ✅ | DeepSeek API Key 已配置 |
| 8 | 无禁止词对外展示 | ✅ | AI/蜕变/逆袭/赋能 已清理 |
| 9 | 数据一致 | ✅ | Evidence/Cases/Stories 已统一 |
| 10 | launchd 服务运行 | ✅ | com.laiwu.dev, port 3001 |

---

## P1 — 建议修复

| # | 检查项 | 状态 | 备注 |
|---|--------|:---:|------|
| 11 | robots.txt | ✅ | 已生成 |
| 12 | sitemap.xml | ✅ | 已生成 |
| 13 | SEO title | ✅ | 「徕舞成长系统」 |
| 14 | SEO description | ✅ | 新定位描述 |
| 15 | 移动端 viewport | ✅ | device-width, no user-scalable |
| 16 | PWA manifest | ✅ | manifest.json 存在 |
| 17 | 品牌定位文案 | ✅ | 「女性成长与身体管理平台」 |
| 18 | Footer 文案 | ✅ | 「徕舞成长系统」 |

---

## P2 — 上线后优化

| # | 检查项 | 状态 | 备注 |
|---|--------|:---:|------|
| 19 | Cases 图片引用为空 | ⚠️ | cases.ts 引用不存在的 /cases/case-*.webp，但品牌页零图片策略下不影响 |
| 20 | CRM Dashboard 使用旧色 #9E8E7E | ⚠️ | 内部工具，不影响用户 |
| 21 | DESIGN_TOKEN.ts TYPOGRAPHY 旧规范 | ⚠️ | 已不使用，但代码未清理 |
| 22 | Portal share 页有英文残留 | ⚠️ | "Laiwu Journey" |
| 23 | 首页板块过多（19个） | ⚠️ | 功能正常，后续 Sprint 优化 |

---

## 检查维度覆盖

- ✅ 首页
- ✅ CRM
- ✅ Portal
- ✅ 所有按钮（Framer Motion 动画正常）
- ✅ 所有路由（49 页，无 404）
- ✅ SEO（title/description/robots/sitemap）
- ✅ 移动端（viewport + PWA manifest）
- ✅ 数据一致性

---
