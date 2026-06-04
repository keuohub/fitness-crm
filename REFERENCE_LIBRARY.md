# REFERENCE_LIBRARY.md

> 徕舞成长平台 · 唯一参考库
> 整合时间：2026-06-04
> 包含：REFERENCE_BRAND_ANALYSIS.md + READING_SYSTEM_ANALYSIS.md + REFERENCE_PRIORITY.md + IMAGE_REVIEW_FRAMEWORK.md
> 定位：后续所有设计和排版决策的第一参考文件（仅次于 PROJECT_BRAIN.md）

---

## 一、对标品牌速查表

| 品牌 | 优先级 | 适合参考 | 不适合参考 |
|------|--------|----------|------------|
| Aesop | P0 | 品牌气质、留白、CTA克制、文案风格 | 产品图片策略、英文字体 |
| Linear | P1 | 字体层级、信息密度、动效克制 | 深色主题、蓝色系、工具型文案 |
| NYT 中文 | P1 | 中文长文排版、行高设置 | 新闻紧迫感、高信息密度 |
| Apple | P2 | 大留白极致、标题大小对比 | 大量产品图、科技感 |
| Notion | P2 | 黑白灰层次、简洁CTA、短文案节奏 | 手绘风格、极端黑白 |
| Medium | P3 | 可读性标准、纯文字排版 | — |

---

## 二、品牌设计原则（来自对标分析）

### 2.1 留白

```
板块间距 ≥ py-32 (128px)
标题与正文间距 ≥ mt-12 (48px)
正文栏宽 ≤ 34em (~544px)
```

### 2.2 字体

```
标题: font-semibold, tracking-[-0.03em]
正文: font-normal, leading-[1.9]
数字: Inter / SF Pro Display
禁止: font-serif, font-bold, font-extrabold
```

### 2.3 色彩

```
标题: #1D1D1F
正文: #6E6E73
强调: #8B5E3C
背景: #FFFFFF / #FAF7F2
```

### 2.4 CTA

```
一屏不超过 2 个 CTA
不制造紧迫感
文字链接优先于大色块按钮
```

---

## 三、徕舞首页阅读节奏模板

### 3.1 当前问题

- 19 个板块过多
- Stories 与 Cases 重复
- 后半段 7 个板块连续功能说明
- BrandFilm 为空占位

### 3.2 理想节奏（仅供参考，不在本 Sprint 执行）

```
Hero (最强)         ████████
Belief (强)         ██████
FounderLetter (强)  ██████
MonthlyJournal (中) ████
Manifesto (中)      ████
Evidence (强)       ██████
ActivityFeed (弱)   ██
Journey (强)        ██████
[过渡留白]          ·
Cases (合并后)      ████
Studio (中)         ████
Ecosystem (整合)    ████
Contact (弱)        ██
Demo (中)           ████
```

目标：14 个板块，从 19 个减少 5 个，节奏从单调变有呼吸。

---

## 四、截图分析流程

后续每次 /view_image 截图分析，严格按照以下步骤：

1. **字体检查** — IMAGE_REVIEW_FRAMEWORK.md 第 1 节
2. **标题检查** — 第 2 节
3. **留白检查** — 第 3 节
4. **组件检查** — 第 4 节
5. **视觉层级检查** — 第 5 节
6. **AI 味检测** — 第 6 节

逐项标记：通过 / P0 / P1 / P2

---

## 五、禁止参考列表

以下类型网站未来禁止作为参考：

- 运动品牌（Nike、Under Armour 等）
- 医美平台
- 知识付费平台
- SaaS 模板展示站
- 电商促销页
- 小红书/社交媒体风格
- 任何「蜕变」「逆袭」叙事的品牌

---

## 六、文件索引

| 文件 | 用途 |
|------|------|
| `PROJECT_BRAIN.md` | 项目认知基石（最高优先级） |
| `PROJECT_STATE_S42.md` | 当前版本快照 |
| `CURRENT_PROJECT_CONTEXT.md` | 当前项目上下文 |
| `REFERENCE_LIBRARY.md` | 本文档，唯一参考库 |
| `REFERENCE_BRAND_ANALYSIS.md` | 一级对标详细分析 |
| `READING_SYSTEM_ANALYSIS.md` | 阅读体验分析 |
| `REFERENCE_PRIORITY.md` | 对标优先级排序 |
| `IMAGE_REVIEW_FRAMEWORK.md` | 截图分析检查清单 |

---

*此文件基于 Sprint 42 稳定版生成。后续任何设计决策必须先查阅此文件。*
