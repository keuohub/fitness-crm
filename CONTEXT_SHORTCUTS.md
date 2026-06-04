# 徕舞 Fitness CRM · 快捷上下文

> 新对话第一句说「读快捷指令」，即可跳过项目扫描。

## 基础信息
- 项目路径：`/Users/qiao/Documents/徕舞工作/fitness-crm`
- 框架：Next.js 16 + Turbopack
- 端口：**3001**（3000 是 Codex 专用，禁止占用）
- 数据库：SQLite（better-sqlite3），文件 `fitness.db`
- 样式：Tailwind CSS + Framer Motion
- AI：DeepSeek API Key 在 `.env.local`

## 页面路由
| 路由 | 用途 |
|------|------|
| `/` | 品牌官网首页 |
| `/portal` | 会员端（需登录） |
| `/portal/login` | 会员登录（手机号+验证码123456） |
| `/portal/growth` | 会员成长旅程 |
| `/portal/feedback` | 本月回顾 |
| `/portal/me` | 我的页面 |
| `/admin/login` | 管理员登录 |
| `/members` | CRM 会员管理 |
| `/members/[id]` | 会员详情 |
| `/stories` | 成长故事中心 |

## 关键目录
- `src/components/brand/` — 官网品牌组件
- `src/app/portal/` — 会员端页面
- `src/app/api/` — API 路由
- `src/lib/` — 工具库（auth、design、growth-message-library 等）
- `src/db/` — 数据库层（schema.ts、index.ts）
- `public/brand/` — 官网品牌图片

## 设计系统
- 主色：`#C27B57`（暖棕）
- 背景：`#F5F0EB`（米白）/ `#FFFFFF`（纯白）
- 文字：`#3E2723`（深棕）、`#9E8E7E`（浅棕灰）
- 设计 Token：`src/lib/design/DESIGN_TOKEN.ts`
- Motion 预设：`src/lib/design/motion-presets.ts`
- 脱敏库：`src/lib/display-name.ts`

## 禁止事项
- 不得修改数据库结构（schema.ts）
- 不得修改认证系统（src/lib/auth/）
- 不得修改 Portal API（src/app/api/portal/）
- 不得修改飞书同步逻辑
- 不得硬编码密码
- 不得占用 3000 端口

## 常用命令
```bash
cd /Users/qiao/Documents/徕舞工作/fitness-crm
npm run dev          # 启动开发服务器（3001端口）
npx tsc --noEmit     # TypeScript 检查
npm run build        # 构建验证
```

## 项目关键决策记录

### Sprint 36 系列（官网品牌升级）
- 36B：官网 KPI 模块改用品牌展示常量，不再从数据库实时读
- 36C：全局姓名脱敏（真实姓名→女士称谓），删 AI 文案
- 36D：图片从 SVG 占位替换为 Unsplash 真实照片，统一 next/image
- 36E：脱敏改为共享库 display-name.ts，职业身份优先，新增训练空间模块

### Sprint 33-35（Portal 重构）
- 33：删除 Lv 等级中心化展示、AI 年度总结文案
- 34A：手机号登录（开发环境验证码 123456），member_sessions 表
- 34C：修复 Portal 首页白屏（AuthGuard 逻辑问题）
- 35A：E2E 验收通过
- 35B：Growth Milestone Engine（前端计算里程碑事件）
- 35C：Portal 体验优化，去 AI 化文案

### 已知问题
- better-sqlite3 需 `npm rebuild` 适配当前 Node 版本
- 开发环境固定验证码 123456，生产需接入真实短信
- 部分图片使用 Unsplash 免费图库，非真实会员照片

### 当前状态（2026-06-03）
- 官网：品牌展示层完成，姓名已脱敏，图片已替换
- Portal：手机号登录可用，成长旅程/回顾/我的页面正常
- CRM：管理员登录可用，会员管理功能正常
- Build：通过，TypeScript 零错误
