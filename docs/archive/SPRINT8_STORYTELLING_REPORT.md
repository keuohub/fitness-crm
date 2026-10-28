# SPRINT 8 — HOMEPAGE STORYTELLING 1.0 REPORT

## 目标
首页从品牌官网升级为 Apple / DeepMind 风格叙事官网。

## 修改文件清单

| 文件 | 类型 | 改动 |
|------|------|------|
| `src/components/brand/HeroSection.tsx` | 修改 | 叙事化：Zhongxiang Laiwu/见证每一次蜕变/说明文字/视差 |
| `src/components/brand/HeroParallax.tsx` | 新增 | 滚动视差 wrapper |
| `src/components/brand/NumbersSection.tsx` | 新增 | CountUp 数字滚动 (1000+/100+/95%/365) |
| `src/components/brand/GrowthStorySection.tsx` | 新增 | DAY1-365 纵向时间轴 |
| `src/components/brand/ProductSection.tsx` | 修改 | 交错布局 + 占位截图 (CRM/AI/Portal) |
| `src/components/brand/CasesSection.tsx` | 修改 | 杂志式案例 (Before/After/Quote) |
| `src/app/page.tsx` | 修改 | Section 排序调整 |
| `public/mock/` | 新增 | 占位图目录 |

## 首页叙事流

Hero (视觉冲击) → Numbers (信任建立) → Growth Story (情感共鸣) → Product (能力展示) → Cases (社会证明) → CTA (行动转化)

## 视觉变化

| 维度 | 变化前 | 变化后 |
|------|--------|--------|
| Hero 标题 | "帮助女性建立..." | "见证每一次 蜕变" (96px) |
| Hero 氛围 | 静态光晕 | 呼吸动画 + 滚动视差 |
| 产品展示 | 纯文字三卡片 | 左右交错布局 + 窗口预览占位 |
| 案例 | 简单卡片 | 杂志式 Before/After/Quote |
| 新增 Numbers | 无 | CountUp 数字滚动 |
| 新增 Story | 无 | DAY1-365 纵向时间轴 |
| Section 间距 | 80px | 112-144px (py-28~36) |

## 验证结果

- TypeScript: 0 业务错误
- npm run build: 通过
- 无新增依赖

## 风险分析

| 风险 | 等级 | 说明 |
|------|------|------|
| 产品截图为占位 Mock | 低 | `PreviewCard` 组件用 CSS 渲染窗口模拟图 |
| CountUp inView 触发依赖 framer-motion viewport | 低 | 已在 staggered 容器中同步触发 |
| 页面滚动性能 | 低 | 视差使用 passive scroll + transform，不触发重排 |
