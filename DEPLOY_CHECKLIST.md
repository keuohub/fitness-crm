# DEPLOY_CHECKLIST.md

> Sprint 43 部署准备检查

---

| # | 检查项 | 状态 | 备注 |
|---|--------|:---:|------|
| 1 | Build 通过 | ✅ | 49 页，TS 零错误 |
| 2 | next.config | ✅ | 需清理 dev 专属配置 |
| 3 | metadata | ✅ | title + description 完整 |
| 4 | manifest.json | ✅ | theme_color=#8B5E3C |
| 5 | robots.txt | ✅ | 禁止 /admin /api |
| 6 | sitemap.xml | ✅ | 2 URL |
| 7 | .gitignore | ✅ | 刚创建，排除 .env/.next/node_modules |
| 8 | .env.production | ❌ | 需创建（环境变量清单见下） |
| 9 | favicon | ⚠️ | 仅有 SVG，无传统 .ico |
| 10 | GitHub remote | ❌ | 需关联 |
| 11 | OG tags | ❌ | 需补充 |

---

## 待办

| 优先级 | 任务 |
|:---:|------|
| P0 | 创建 `.env.production`（从 .env.local 复制并调整） |
| P0 | 关联 GitHub 仓库 |
| P1 | 添加 canonical + OG tags |
| P1 | 添加 favicon.ico |
