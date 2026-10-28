# LAUNCH_ASSET_REPORT.md

> 上线资产检查

---

## 检查结果

| 资产 | 状态 | 备注 |
|------|:---:|------|
| robots.txt | ✅ | 已配置，禁止 /admin /api |
| sitemap.xml | ✅ | 首页 + /stories |
| favicon | ⚠️ | 使用 SVG icon-192，无传统 .ico |
| manifest.json | ⚠️ | theme_color 是旧色 #C27B57，应改为 #8B5E3C |
| PWA icons | ✅ | 192+512 SVG |
| 自定义 404 | ❌ | 使用 Next.js 默认 404 |
| canonical | ❌ | 未设置 |
| OG tags | ❌ | 未设置 |

## 建议修复

| 优先级 | 修复项 |
|:---:|------|
| P0 | manifest.json theme_color 改为 #8B5E3C |
| P1 | layout.tsx 添加 canonical + OG tags |
| P2 | 添加 favicon.ico |
| P2 | 自定义 404 页面 |
