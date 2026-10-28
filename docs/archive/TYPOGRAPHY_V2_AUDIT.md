# TYPOGRAPHY_V2_AUDIT.md — Sprint 40B

## 当前字体使用统计（src/components/brand/）

| 字体类 | 出现次数 | 说明 |
|--------|---------|------|
| `font-serif` | 51 | 所有板块标题 + 部分装饰文字，全部需改 |
| `font-sans` | 0 | 未被直接引用（依赖全局 CSS 变量） |
| `font-semibold` | 57 | 已在 38A 统一，符合字号层级 |
| `font-bold` | 0 | 已在 38A 清除 |
| `font-medium` | 48 | 微标/caption 使用，不需要改 |
| `font-normal` | 0 | 正文依赖全局 CSS 默认值 |

## font-serif 在各组件的分布

所有组件均有 font-serif 出现，共 51 处。主要集中在板块 h2 标题（如 "font-serif text-4xl sm:text-5xl font-semibold"）。

## 当前字体栈（globals.css）

```
--font-serif: 'STSong', 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', serif;
--font-body: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', ...;
```

## 所需改动

- 51 处 `font-serif` → 移除（全局 body 默认即为 PingFang/无衬线）
- 57 处 `font-semibold` → 不变（已达标）
- 正文 tracking 统一为 `tracking-normal`（当前混用 tracking-[0.02em] 等）
- 标题 tracking 统一为 `tracking-[-0.04em]`（当前混用 tracking-[-0.03em]）

---

> 审计完成。51 处 font-serif 待去除。
