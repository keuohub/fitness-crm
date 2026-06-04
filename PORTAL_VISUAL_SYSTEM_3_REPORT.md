# PORTAL VISUAL SYSTEM 3 REPORT

## 执行摘要

将 Portal 从 CRM/SaaS 风格升级为 Luxury Wellness 品牌化会员产品。

---

## 修改文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/app/portal/page.tsx` | 重写 | Hero 3.0：品牌化排版、Apple Ring 三环发光升级、删除 SaaS 统计模块 |
| `src/app/portal/growth/page.tsx` | 重写 | 里程碑时间轴引擎（1/10/30/50次训练）+ 全部记录时间轴 |
| `src/app/portal/feedback/page.tsx` | 重写 | 杂志式排版（Editorial）、阅读模式、展开动画 |
| `src/app/portal/login/page.tsx` | 重写 | GlassCard + Token + Motion 统一 |
| `src/app/portal/me/page.tsx` | 无需改动 | V2 已达标 |

---

## 新增组件清单

无新增独立组件。里程碑引擎（`computeMilestones`）内联在 growth/page.tsx 中，轻量无依赖。

---

## 视觉升级说明

### Hero 3.0
- 全屏 70vh 杂志封面排版
- 多层径向光晕（柔光深度感）
- 姓名：`font-serif text-7xl~9xl` 超大字重
- 天数 + 等级描述垂直线性排版
- 底部向下滑动指示器（竖线动效）

### Activity Ring
- 尺寸从 220px 增至 240px
- 三层环增加 SVG glow filter（发光柔化）
- 动画曲线改为 `cubic-bezier(0.25, 0.1, 0.25, 1.0)`（Apple 风格缓出）

### Growth 里程碑时间轴
- 自动计算：初次启程(1) / 训练新星(10) / 自律养成(30) / 身体蜕变(50)
- 已达成：发光节点 + 高亮卡片
- 未达成：灰色节点 + 半透明卡片
- 使用 staggerContainer + staggerItem 入场

### Feedback 阅读模式
- Editorial 排版 Header："Letters / 来自小桥的成长报告"
- 展开动画 `opacity 0->1 + height auto`
- 收起按钮不冒泡
- 类型标签颜色区分

### Login
- GlassCard 包裹表单
- COLORS Token 统一
- Motion fadeUp 入场

---

## TypeScript 状态

零错误（排除已知 schema.ts / daily-feedback-cron 预存错误）

## Build 状态

`npm run build` 通过，全部 Portal 页面正常 prerender

---

## 设计规范遵守情况

| 规范 | 状态 |
|------|------|
| 无 Emoji | 通过 |
| 无 border 装饰 | 通过（时间轴竖线为视觉元素，非卡片边框） |
| DESIGN_TOKEN 引用 | 通过 |
| Motion 系统统一 | 通过 |
| GlassCard 使用 | 通过 |
| 字体层级统一 | 通过 |

---

## 风险点

- 里程碑仅在客户端计算（`useMemo`），不会影响 SSR
- Growth 全部记录截断为最近 30 条（避免超长列表）
- DEMO_MEMBER_ID=18 仍未接真实认证
