# BRAND WEBSITE REPORT — Sprint 7

## 路由变化

| 路由 | 变化前 | 变化后 |
|------|--------|--------|
| `/` | CRM 首页 (StatsCards + MemberList + SidePanel) | 品牌官网 (Hero/Mission/Method/Product/Cases/CTA) |
| `/admin` | 不存在 | CRM 管理入口 (重定向到 /) |
| `/admin/reports` | 周期报告 | 不变 |
| `/admin/sync` | 飞书同步 | 不变 |
| `/members/*` | CRM 会员管理 | 不变 |
| `/portal/*` | 会员端 | 不变 |

## 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/brand/HeroSection.tsx` | 全屏品牌 Hero (heroReveal 动画) |
| `src/components/brand/MissionSection.tsx` | 三列布局：评估/训练/成长 |
| `src/components/brand/MethodSection.tsx` | 成长飞轮 SVG 环形图 |
| `src/components/brand/ProductSection.tsx` | 三套系统卡片：CRM/AI/Portal |
| `src/components/brand/CasesSection.tsx` | 案例展示 (王莉/微微/月童) |
| `src/components/brand/CTASection.tsx` | CTA 卡片 (预约演示/联系徕舞) |
| `src/app/admin/page.tsx` | CRM 管理入口 |
| `src/app/admin/layout.tsx` | Admin 布局 |

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | 从 CRM 首页重写为品牌官网 (6 Section) |
| `src/app/layout.tsx` | metadata 更新为"徕舞成长系统" |
| `src/components/layout/Navbar.tsx` | 双模式：品牌导航(/) + CRM 导航 |
| `src/app/globals.css` | 新增 `html { scroll-behavior: smooth; }` |

## 品牌导航

- 顶部 Navbar 在 `/` 下显示品牌导航 (成长模型/产品/案例/联系 + 会员入口 + CRM 按钮)
- CRM 路由 (`/members/*`, `/admin/*`) 下保持原有管理导航

## 验证结果

- TypeScript: 0 业务错误 (仅 .next/dev 预存类型警告)
- npm run build: 通过
- 品牌首页作为静态页面预渲染

## 风险分析

| 风险 | 等级 | 说明 |
|------|------|------|
| CRM 用户访问 `/` 不再看到工作台 | 低 | 可通过 `/admin` 或直接访问 `/members` |
| Navbar 判断逻辑随路由增多需维护 | 低 | isCRMPage 函数集中管理 |
