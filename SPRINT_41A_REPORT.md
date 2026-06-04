# SPRINT_41A_REPORT.md — Typography System V3 + 品牌语气升级

**日期**：2026-06-04
**项目**：fitness-crm
**Build**：通过

---

## 一、标题层级系统

| 层级 | 字重 | 字距 | 行高 | 颜色 |
|------|------|------|------|------|
| Hero H1 | font-semibold | tracking-[-0.05em] | leading-[1.05] | #1D1D1F |
| Section H2 | font-semibold | tracking-[-0.03em] | leading-[1.15] | #1D1D1F |
| Card Title | font-medium | tracking-[-0.02em] | — | #1D1D1F |
| 数字 | font-semibold | tracking-[-0.02em] | — | #1D1D1F |

## 二、正文阅读系统

| 类型 | 最大宽度 | 行高 |
|------|---------|------|
| 标准正文 | max-w-[34em] | leading-[1.9] |
| 长文 | max-w-[42em] | leading-[2] |
| FounderLetter | max-w-[38em] | leading-[2] |
| MonthlyJournal | max-w-[38em] | — |

## 三、品牌语气

| 禁止词 | 替换 | 位置 |
|--------|------|------|
| "身体的改变" | "身体的变化" | ManifestoSection |
| "突破" | "达到" | MonthlyJournalSection |
| "每一次突破" | "每一次积累" | StudioSection |
| "专业普拉提器械" | "普拉提器械" | StudioSection |

## 四、英文标签（全部中文化）

| 原 | 新 | 组件 |
|----|----|------|
| Product | 产品 | EcosystemSection |
| How It Works | 使用流程 | HowItWorksSection |
| Partners | 合作伙伴 | PartnerSection |
| Try It | 体验 | TrySection |
| Demo | 预约 | DemoSection |
| WeChat | 微信 | ContactSection |
| Contact | 联系 | ContactSection |
| Live Activity | 训练动态 | ActivityFeedSection |

## 五、修改文件

| 文件 | 改动 |
|------|------|
| `HeroSection.tsx` | h1 tracking -0.04em→-0.05em, 副标题 max-w 统一 |
| 所有活跃品牌组件 | h2 tracking -0.04em→-0.03em + leading-[1.15] |
| 11 个组件 | max-w 统一为 [34em]/[42em]/[38em] |
| ManifestoSection.tsx | "改变"→"变化" |
| StudioSection.tsx | "突破"→"积累", "专业普拉提器械"→"普拉提器械" |
| MonthlyJournalSection.tsx | "突破"→"达到" |
| 7 个组件 | 英文标签→中文 |

## Build

```
npm run build → 通过
TypeScript: 零错误
```

---

> Sprint 41A 完成。
