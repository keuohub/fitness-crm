---
version: 2.1
name: 徕舞成长系统 · 品牌设计 V2.1
description: 对标 Apple/Google 色彩哲学，在不删除任何现有代码的前提下，新增一套品牌视觉系统。
strategy: 仅新增（additive only），不删除、不重构。
sources:
  - Apple Human Interface Guidelines — 色彩哲学
  - Google Material Design 3 — 色彩体系
  - 徕舞项目记忆文件
  - 全站源码扫描（2026-06-04）
---

# DESIGN_V2.md — 品牌视觉升级方案

---

## 一、Apple/Google 色彩哲学分析

### Apple 的色彩哲学
- **核心原则**：少即是多。色板极简，最多 3-4 个主色，其余用黑白灰完成。
- **关键特征**：
  - 大量使用纯白 `#FFFFFF` 和近黑 `#1D1D1F` 作为基底
  - 唯一彩色用于强调——且只用一种（如 iPhone 15 Pro 页面只用蓝色）
  - 灰色调系统极其精细：`#F5F5F7`（冷灰底）、`#86868B`（中灰文字）、`#6E6E73`（深灰文字）
  - 大面积留白，靠内容本身的重量说话
- **给徕舞的启发**：苹果不做"温暖感"，苹果做"清晰感"。徕舞需要的不是颜色多暖，是信息层次足够清晰。

### Google Material Design 3 的色彩哲学
- **核心原则**：动态色彩（Dynamic Color），从单一源色（Source Color）自动生成完整色调色板。
- **关键特征**：
  - Primary / Secondary / Tertiary / Neutral / Neutral Variant 五组色调
  - 每组包含 0-100 的色调阶梯
  - 强调可访问性——对比度必须达标
  - 中性色板冷色调 `#F8F9FA` → `#202124`
- **给徕舞的启发**：用单一源色推导全站色板，确保所有颜色在数学上和谐。

---

## 二、徕舞 V2 色彩方案：The Lotus Palette（莲花色板）

### 设计理念
徕舞不是展示"温暖"，是展示"清澈的专注力"。

对标 Apple 的黑白基底 + 一个克制的主色，对标 Google 的源色推导系统性。

### 源色选择
**#8B5E3C** — 不是"陶土橙"，是"时间的颜色"。
一个经过漂白的深棕，像被河水冲刷过的木头，像旧书的纸页边缘。
既有棕色系的稳定感，又去掉了传统棕色的沉闷。

### 完整色板

```
┌─────────────────────────────────────────────────────────┐
│  Role              │  Color      │  用途                  │
├────────────────────┼─────────────┼────────────────────────┤
│  surface-primary   │  #FFFFFF    │  主表面（对标 Apple 白） │
│  surface-secondary │  #F5F5F7    │  次表面（对标 Apple 灰） │
│  surface-tertiary  │  #EBEBED    │  三级表面               │
│  text-primary      │  #1D1D1F    │  主文字（对标 Apple 黑） │
│  text-secondary    │  #86868B    │  辅助文字（Apple 中灰）  │
│  text-tertiary     │  #AEAEB2    │  三级文字               │
│  accent            │  #8B5E3C    │  强调色（Lotus）        │
│  accent-hover      │  #7A5233    │  强调色悬停态           │
│  accent-subtle     │  #F3EEE8    │  强调色浅底             │
│  border            │  #D2D2D7    │  边框                   │
│  divider           │  #E5E5EA    │  分割线                 │
│  danger            │  #DC4A3D    │  错误/警告              │
│  success           │  #2F9E69    │  成功                   │
└─────────────────────────────────────────────────────────┘
```

### 与现有色板对比

| 现在 | V2 | 变化 |
|------|----|------|
| 米白 #FAF7F2 做底 | 纯白 #FFFFFF / 冷灰 #F5F5F7 | 去掉暖色调底色，画面更干净 |
| 深棕 #3E2723 做主文字 | 近黑 #1D1D1F | 更清晰，更有权威感 |
| 陶土橙 #C27B57 做强调 | 莲花棕 #8B5E3C | 更克制、更耐看、更不像模板 |
| 浅米 #E8E0D5 做边框 | 冷灰 #D2D2D7 | 消除暖色调杂质 |
| 浅棕灰 #9E8E7E 做辅助 | 中灰 #86868B | 纯中性灰，信息层级更清晰 |

---

## 三、字体系统：Serif Editorial 方案

### 当前问题
- `font-sans` 默认无衬线 + `font-serif` 混用，两套字体打架
- 中文 serif 回退不稳定

### V2 方案

```
font-family 栈：
  标题/品牌：'STSong', 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', serif
  正文：    'STSong', 'Songti SC', serif
  数字/代码：'SF Mono', 'Menlo', monospace
```

全站统一宋体/衬线。Apple 的官网大量用 San Francisco，但 San Francisco 是为英文设计的。中文环境下，宋体对标的不是 Times New Roman，是杂志的正文质感——这恰好是你要的"品牌气质"。

### 字号阶梯

| 层级 | 当前 | V2 | 理由 |
|------|------|----|------|
| Hero | 5xl~9xl 跨度过大 | 6xl sm:7xl md:8xl | 缩小跨度，避免字重震荡 |
| 板块标题 | 3xl/4xl/5xl 三种混用 | 统一 4xl | 扫除不一致 |
| 正文 | sm/base/lg 三种混用 | 统一 base | 提高可读性 |
| 辅助 | 10px/11px/xs 三种混用 | 统一 xs | - |

### 字体粗细策略
- 中文宋体不使用 bold（700），用 600（semibold）替代——宋体 bold 在屏幕上糊成一团
- 英文/数字保留 font-bold 用于数字展示

---

## 四、留白系统

### 当前问题
- 板块间距 24/28/32 三种混用
- 移动端 padding 固定 px-6，没有响应式呼吸

### V2 方案（对标 Apple 的 8px 网格）

```
section-gap:     py-32 md:py-40           (128px / 160px)
section-gap-sm:  py-20 md:py-28           (80px / 112px)
content-max-w:   max-w-[980px]             (对标 Apple 内容区)
page-x:          px-4 sm:px-8 md:px-12    (响应式留白)
card-pad:        p-6 sm:p-8 md:p-10
```

---

## 五、落地策略（仅新增，不删除）

### 新增文件
| 文件 | 内容 |
|------|------|
| `src/lib/design/LOTUS_TOKEN.ts` | V2 色板 + 字体 + 间距 Token |
| `src/app/globals-v2.css` | V2 CSS 变量（通过 CSS 层覆盖） |
| `src/components/brand/BrandLayout.tsx` | 品牌页统一布局容器（字体 + 留白） |

### 修改文件（最小化）
| 文件 | 改动 |
|------|------|
| `src/app/layout.tsx` | 引入 globals-v2.css |
| `src/app/globals.css` | 用 V2 CSS 变量覆盖现有变量值（不删旧变量） |

### 不动
- 所有品牌组件的 JSX 结构不变
- 所有 Portal 组件不变
- 所有动画不变
- DESIGN_TOKEN.ts 保留不动（Portal 仍用它）
- motion-presets.ts / motion.ts 保留不动

---

## 六、预期效果

| 维度 | 当前 | V2 后 |
|------|------|-------|
| 底色 | 米白暖 → 画面偏黄 | 纯白冷灰 → 画面干净、通透 |
| 文字 | 深棕 → 信息层级模糊 | 近黑 → 清晰锐利，层级分明 |
| 强调 | 陶土橙 → 像电商模板 | 莲花棕 → 克制的品牌记忆点 |
| 字体 | sans+serif 混打 | 全站宋体 → 杂志质感统一 |
| 留白 | 板块挤在一起 | 160px 间距 → 呼吸感 |
| 硅谷味 | 保留毛玻璃+动画+动效 | 保留毛玻璃+动画+动效（不做减法） |
| 品牌气质 | 模板化温暖 | 冷静的专注力 |

---

> V2.1 策略：仅新增，不删除。用 Apple 的白黑灰基底 + Google 的源色推导 + 全站宋体统一，在现有代码之上叠加一层新的视觉系统。
