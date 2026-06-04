# TYPOGRAPHY_V2.md — Sprint 40B 字体系统规范

## 字体策略

**全站无衬线。不对标传统中文排版（宋体/衬线），对标 Apple 产品页。**

| 角色 | 字体栈 | 优先级 |
|------|--------|:---:|
| 正文 | PingFang SC > SF Pro Display > Inter > system-ui | 全站默认 |
| 数字 | Inter > Helvetica Neue > SF Pro Display | `var(--font-number)` |
| 标题 | 与正文相同（无衬线统一） | 全站默认 |

**已移除**：STSong / Songti SC / Noto Serif CJK SC / Source Han Serif SC（宋体栈）

---

## 字重策略

| 元素 | 字重 | Tailwind |
|------|------|---------|
| 一级标题（Hero h1） | 600 | `font-semibold` |
| 板块标题（h2） | 600 | `font-semibold` |
| 三级标题（h3、卡片标题） | 500 | `font-medium` |
| 正文段落 | 400 | `font-normal`（全局默认） |
| 微标/caption | 500 | `font-medium` |
| 数字展示 | 600 | `font-semibold` |

**禁止**：`font-bold`（700）、`font-extrabold`（800）、`font-black`（900）

---

## 标题规范

| 属性 | 值 |
|------|-----|
| 字重 | `font-semibold` |
| 字距 | `tracking-[-0.04em]` |
| 颜色 | `text-[#1D1D1F]` |
| 最大宽度 | `max-w-[12ch]`（板块标题）/ `max-w-[14ch]`（Hero 标题） |

**Hero 标题额外规范：**
- leading: `leading-[1.05]`（桌面）/ `leading-[1.02]`（移动端）
- multiline: 使用 `<br />` 手动断行，不超过两行
- 无衬线，不用 font-serif

---

## 正文规范

| 属性 | 值 |
|------|-----|
| 字重 | `font-normal` |
| 字距 | `tracking-normal` |
| 颜色 | `text-[#6E6E73]`（辅助文字）/ `text-[#1D1D1F]`（重点段落） |
| 行高 | `leading-[1.9]` |
| 最大宽度 | `max-w-[32em]`（标准正文）/ `max-w-[42em]`（长文） |

---

## 数字规范

| 属性 | 值 |
|------|-----|
| 字重 | `font-semibold` |
| 字距 | `tracking-[-0.02em]` |
| 字体族 | `var(--font-number)`（Inter 优先） |
| 颜色 | `text-[#1D1D1F]` |

---

## CSS 变量（globals.css）

```css
:root {
  --font-body: 'PingFang SC', 'SF Pro Display', 'Inter', system-ui, -apple-system, sans-serif;
  --font-number: 'Inter', 'Helvetica Neue', 'SF Pro Display', system-ui, -apple-system, sans-serif;
}
@theme inline {
  --font-heading: var(--font-body);  /* 标题与正文统一无衬线 */
  --font-sans: var(--font-body);
}
```

---

> V2 核心：全站无衬线，对标 Apple/Google 产品页阅读质感。
