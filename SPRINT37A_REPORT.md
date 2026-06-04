# SPRINT 37A — 首页极简化与品牌表达升级 报告

## 状态：已完成

---

## 一、首页最终模块顺序

| 序号 | 模块 | 间距 |
|------|------|------|
| 1 | HeroSection | — |
| 2 | ManifestoSection | py-32 |
| 3 | EvidenceSection | py-32 |
| 4 | ActivityFeedSection | py-32 |
| 5 | JourneySection | — |
| 6 | CasesSection | py-32 |
| 7 | StoriesTeaserSection | — |
| 8 | BrandFilmSection | py-32 |
| 9 | EcosystemSection | — |
| 10 | AIReportSection | — |
| 11 | HowItWorksSection | — |
| 12 | PartnerSection | — |
| 13 | TrySection | — |
| 14 | ContactSection | — |
| 15 | DemoSection | — |

---

## 二、删除内容

### 删除的模块
- StudioShowcaseSection（训练空间图片模块）

### 删除的文件（5个）
- `public/brand/hero/hero-main.jpg`
- `public/brand/cases/case-1.jpg`
- `public/brand/cases/case-2.jpg`
- `public/brand/studio/`（整个目录）
- `public/brand/training/`（整个目录）

### 删除的代码
- CasesSection 中所有 Image 组件和 next/image 导入
- page.tsx 中 StudioShowcaseSection 导入和使用

---

## 三、修改的文件

| 文件 | 变更 |
|------|------|
| `src/app/page.tsx` | 移除 StudioShowcaseSection |
| `src/components/brand/HeroSection.tsx` | 排版优化、品牌金句新增 |
| `src/components/brand/CasesSection.tsx` | 去图片化、纯文字卡片 |
| `src/components/brand/ActivityFeedSection.tsx` | py-20 → py-32 |
| `src/components/brand/BrandFilmSection.tsx` | py-40 → py-32 |
| `src/components/brand/EvidenceSection.tsx` | py-40 → py-32 |
| `src/components/brand/GrowthStorySection.tsx` | py-28/py-36 → py-32 |
| `src/components/brand/ManifestoSection.tsx` | py-40 → py-32 |
| `src/components/brand/NumbersSection.tsx` | py-28/py-36 → py-32 |
| `src/components/brand/ProductSection.tsx` | py-28/py-36 → py-32 |

---

## 四、Hero 变更

- 副标题颜色：`#9E8E7E` → `#8D8175`
- 副标题宽度：`max-w-md` → `max-w-lg`
- 新增 `tracking-[0.02em]`
- 标题 `mt-10`
- 新增品牌金句：「成长不是一次改变。而是持续被记录的过程。」

---

## 五、TypeScript 状态

零错误。

## 六、Build 状态

通过。Compiled successfully。

---

## 七、禁止事项确认

| 项目 | 是否修改 |
|------|----------|
| 数据库 | 否 |
| API | 否 |
| CRM | 否 |
| Portal | 否 |
| 认证 | 否 |
