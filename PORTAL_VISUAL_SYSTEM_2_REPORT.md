# PORTAL VISUAL SYSTEM 2.0 REPORT

## 修改文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/lib/design/motion.ts` | 新增 | 统一 Motion 系统：fadeUp / fadeIn / staggerContainer / staggerItem / MOTION_DURATIONS |
| `src/components/portal/ui/GlassCard.tsx` | 新增 | 统一卡片组件：渐变背景 + 柔和阴影 + hover 浮起 + backdrop-blur |
| `src/components/portal/PortalNav.tsx` | 修改 | Emoji 替换为 Lucide Icons (Home/Sprout/MessageCircle/User) + 当前路由高亮 |
| `src/app/portal/page.tsx` | 修改 | GlassCard 替换硬编码卡片 + DESIGN_TOKEN 引用 + Motion 系统统一 |
| `src/app/portal/growth/page.tsx` | 修改 | GlassCard 替换 + Token + Motion |
| `src/app/portal/feedback/page.tsx` | 修改 | GlassCard 替换 + Token + Motion |
| `src/app/portal/me/page.tsx` | 修改 | GlassCard 替换 + Token + Motion |

## 新增组件清单

| 组件 | 路径 | 用途 |
|------|------|------|
| GlassCard | `src/components/portal/ui/GlassCard.tsx` | Portal 页面统一卡片，支持 sm/md/lg padding、hover 上浮、onClick |
| Motion Presets | `src/lib/design/motion.ts` | fadeUp / fadeIn / staggerContainer / staggerItem + MOTION_DURATIONS |

## 视觉升级说明

1. **Emoji 全清**：Portal 四个页面 + PortalNav 零表情符号
2. **Lucide Icons**：PortalNav 底部导航使用 Lucide React 图标 (Home/Sprout/MessageCircle/User)
3. **GlassCard**：所有页面卡片统一为渐变背景 + 柔和阴影 + backdrop-blur，不再硬编码 shadow
4. **Design Token 引用**：所有页面 import COLORS/SHADOWS 统一使用 `src/lib/design/DESIGN_TOKEN.ts`
5. **Motion 统一**：所有页面使用 `src/lib/design/motion.ts` 的 fadeUp 等预设，时长统一为 MOTION_DURATIONS
6. **Hero 保留**：70vh 杂志封面、三环 ActivityRing、Question Quote 排版不变

## TypeScript 状态

零错误（排除已知 schema.ts / daily-feedback-cron 的预存错误）

## Build 状态

`npm run build` 通过，所有 Portal 页面正常 prerender

## 风险说明

- Portal 仍使用 DEMO_MEMBER_ID=18 硬编码，尚未接真实认证
- PortalNav 高亮判断使用 pathname === href，子路由（如 /portal/growth/xxx）不会高亮父级
- GlassCard 目前不支持自定义 style 透传，如需特殊背景需用 className 覆盖
