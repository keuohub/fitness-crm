---
version: alpha
name: 徕舞成长系统
description: 高端温暖普拉提品牌，米白+深棕衬线风格，面向女性成长管理
sources:
  - http://localhost:3001
  - src/app/globals.css
notes:
  - 基于 Tailwind CSS v4 + shadcn/ui + Next.js
  - 颜色从 globals.css CSS 变量提取
  - 字体使用 Next.js font 加载
---

## 品牌概述

徕舞成长系统是徕舞普拉提（钟祥徕舞女子塑形）的数字化平台。品牌调性：高端、温暖、专业、女性向。视觉语言追求"呼吸感"——大量留白、柔和渐变、细腻阴影。

## 颜色

| Token | 色值 | 用途 |
|-------|------|------|
| `primary` | `#3E2723` | 主文字色、品牌深棕 |
| `background` | `#FAF7F2` | 全局底色、暖米白 |
| `surface` | `#FFFFFF` | 卡片、区域底色 |
| `accent` | `#C27B57` | 按钮、链接、强调色（暖铜） |
| `border` | `#E8E0D5` | 边框、分割线 |
| `muted` | `#9E8E7E` | 次要文字、灰色 placeholder |
| `danger` | `#D4736A` | 错误、删除、警告 |

**暗色模式：**

| Token | 色值 |
|-------|------|
| `background` | `#1C1410` |
| `surface` | `#2A1F1A` |
| `border` | `rgba(232, 224, 213, 0.15)` |

**使用规则：**
- `primary` (#3E2723) 只用于正文文字，不做大面积背景
- `accent` (#C27B57) 用于所有交互元素（按钮、链接、选中态）
- `background` (#FAF7F2) 是页面的"底色呼吸"，不要用纯白替代
- `border` (#E8E0D5) 极淡，几乎融入背景，只做结构性分割
- 所有颜色必须有暖色调，禁止冷色调（蓝、紫、纯灰）

## 字体

| 用途 | 字体 |
|------|------|
| 标题/品牌 | `font-serif`（Georgia, "Times New Roman", Times, serif） |
| 正文/UI | `font-sans`（Next.js font 加载，可变字体） |
| 代码 | `font-mono`（系统等宽） |

**使用规则：**
- 品牌名"徕舞成长"必须用 `font-serif` + `font-bold`
- 页面标题用 serif，正文用 sans
- 字号用 Tailwind 默认比例，不自定义

## 圆角

| 级别 | 值 |
|------|-----|
| `sm` | `calc(0.75rem * 0.6)` ≈ 7px |
| `md` | `calc(0.75rem * 0.8)` ≈ 10px |
| `lg` | `0.75rem` = 12px |
| `xl` | `calc(0.75rem * 1.4)` ≈ 17px |

**使用规则：**
- 卡片用 `lg`（12px）
- 按钮用 `md`（10px）
- 输入框用 `md`

## 间距

使用 Tailwind 默认间距体系（基于 `0.25rem`）。推荐：
- 区块间距：`py-16` 或 `py-20`（64-80px）
- 卡片内边距：`p-6`（24px）
- 文字段落间距：`space-y-4`

## 阴影

极轻，营造"浮在米白色上的白卡片"效果：

```css
box-shadow: 0 1px 8px rgba(62, 39, 35, 0.06);
```

## 导航栏

```css
/* 毛玻璃导航 */
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(24px);
box-shadow: 0 1px 8px rgba(62, 39, 35, 0.06);
```

- 高度 `h-14`（56px）
- 品牌名左侧，serif bold
- 导航项用 `muted` 色（#9E8E7E），hover 变 `primary`
- 会员入口在右侧

## 按钮

| 类型 | 背景 | 文字 | 圆角 |
|------|------|------|------|
| 主要 | `accent` (#C27B57) | `white` | `rounded-full` |
| 次要 | `white` | `accent` | `rounded-full`，边框 `border` |
| 文字 | 透明 | `accent` | 无 |

按钮一律 `rounded-full`（胶囊形）。

## 卡片

```css
background: white;
border: 1px solid #E8E0D5;
border-radius: 12px; /* --radius-lg */
```

hover 时轻微上浮 + 加深阴影。

## 装饰元素

- 背景用径向渐变营造光晕：`radial-gradient(ellipse, rgba(194,123,87,0.06) 0%, transparent 70%)`
- 呼吸动画 `@keyframes breath`：缩放 1 → 1.08，透明度 0.3 → 0.5
- 页面滚动 `scroll-behavior: smooth`

## 品牌图片风格

- 暖色调、自然光、女性气质
- 图片用 `rounded-lg` 或 `rounded-2xl`
- 不要用冷色调滤镜

## Logo 与使用边界

- 品牌名"徕舞成长"始终用 `font-serif` + `font-bold`
- 不可修改 Logo 字体的字间距（`tracking-wide`）
- 不可将品牌名用于非品牌色背景

## 禁止事项

- 禁止使用蓝色、紫色、纯灰色
- 禁止使用正方形按钮（必须胶囊形）
- 禁止大面积纯白背景（必须 #FAF7F2 或白色卡片浮于其上）
- 禁止使用无衬线体做品牌标题
- 禁止 box-shadow 过重（最大透明度不超过 0.1）
- 禁止使用 Material Design 风格的夸张阴影和动画
