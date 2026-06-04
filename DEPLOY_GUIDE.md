# DEPLOY_GUIDE.md

> Sprint 43 · Vercel 免费版部署方案

---

## 一、前置准备

### 1.1 清理 dev 专属配置

```bash
# next.config.ts — 删除/注释 dev only
# allowedDevOrigins: ["192.168.10.4"],

# 将所有 .md 报告文件（项目文档，非源码）加入 .gitignore
# PROJECT_*.md, *_AUDIT*.md, SPRINT_*.md 等
```

### 1.2 创建 .env.production

```
DEEPSEEK_API_KEY=sk-xxx（从 .env.local 复制）
DATABASE_PATH=/tmp/fitness.db（SQLite 需要持久化目录，Vercel 用 /tmp）
FEISHU_APP_ID=xxx
FEISHU_APP_SECRET=xxx
```

⚠️ Vercel 无持久化文件系统。SQLite 在每次冷启动时会重置。生产环境建议迁移到 Turso（SQLite 兼容）或使用 Vercel KV/Postgres。Sprint 43 先用 SQLite 试运营，Sprint 44 迁移数据库。

### 1.3 关联 GitHub

```bash
cd "/Users/qiao/Documents/徕舞工作/fitness-crm"
git remote add origin https://github.com/YOUR_USERNAME/laiwu-fitness.git
git push -u origin release-preparation
```

---

## 二、Vercel 部署

### 2.1 项目创建

1. 访问 https://vercel.com
2. 「New Project」→ 导入 GitHub 仓库
3. 选择 `release-preparation` 分支
4. Framework Preset: Next.js
5. Root Directory: `.`（或 `fitness-crm` 如果在 monorepo 中）

### 2.2 环境变量

| Key | Value | 来源 |
|-----|-------|------|
| DEEPSEEK_API_KEY | sk-xxx | .env.local |
| FEISHU_APP_ID | cli_xxx | .env.local |
| FEISHU_APP_SECRET | xxx | .env.local |

### 2.3 Build Settings

- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 2.4 Domain

- 默认：`laiwu-fitness.vercel.app`
- 自定义：`laiwu.fitness`（需在 Vercel Domains 中添加，DNS 指向 Vercel）

---

## 三、部署后验证

```bash
# 检查首页
curl -I https://laiwu-fitness.vercel.app

# 检查 API
curl https://laiwu-fitness.vercel.app/api/platform-stats/activities

# 检查 Portal
curl https://laiwu-fitness.vercel.app/portal/login
```

---

## 四、生产注意事项

1. **SQLite 限制**：Vercel Serverless 无持久化文件系统。Sprint 43 试运营用内存数据 + 种子数据先跑，Sprint 44 必须迁移数据库。
2. **DeepSeek API 调用**：每次生成报告会调用 API，注意用量和成本。
3. **Admin 后台**：`/admin` 需要密码，确保 ADMIN_PASSWORD 环境变量已设置。
4. **速率限制**：Vercel 免费版有 100GB 带宽/月、6000 分钟构建/月。
