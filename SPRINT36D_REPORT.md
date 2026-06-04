# SPRINT 36D — 官网真实图片替换 报告

## 状态：已完成

---

## 一、修改文件列表

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/brand/HeroSection.tsx` | 修改 | 新增 Hero 主图（桌面端右图左文，移动端隐藏图片） |
| `src/components/brand/CasesSection.tsx` | 修改 | SVG → JPG 真实图片 + next/image + 自动脱敏 displayName |
| `src/components/brand/StoriesTeaserSection.tsx` | 修改 | 删除 NAME_MAP，统一用 displayName 自动取姓氏 |
| `src/components/brand/ActivityFeedSection.tsx` | 修改 | 删除 NAME_MAP，统一用 displayName 自动取姓氏 |
| `src/components/brand/AIReportSection.tsx` | 修改 | 删除 NAME_MAP，统一用 displayName 自动取姓氏 |

---

## 二、新增图片列表

| 文件 | 大小 | 来源 | 用途 |
|------|------|------|------|
| `public/brand/hero/hero-main.jpg` | 143K | Unsplash | Hero 半身主图 |
| `public/brand/cases/case-1.jpg` | 69K | Unsplash | 案例照片 1 |
| `public/brand/cases/case-2.jpg` | 113K | Unsplash | 案例照片 2 |
| `public/brand/story/story-1.jpg` | 79K | Unsplash | 成长故事 1 |
| `public/brand/story/story-2.jpg` | 77K | Unsplash | 成长故事 2 |
| `public/brand/story/story-3.jpg` | 113K | Unsplash | 成长故事 3 |

---

## 三、图片技术规格

- 全部使用 `next/image` 的 `<Image>` 组件
- 全部配置 `placeholder="blur"` + `blurDataURL`（base64 1px blur 占位）
- 全部配置 `alt` 属性
- Hero 图配置 `priority` 预加载
- 案例图配置 `loading="lazy"` 懒加载
- 全部配置 `sizes` 响应式属性

---

## 四、姓名脱敏优化

旧方案（硬编码 NAME_MAP）：
```
NAME_MAP = { "王莉": "王女士", "微微": "微女士", ... }
```

新方案（自动规则）：
```
displayName(name) → 取第一个汉字 + "女士"
"陈知意" → "陈女士"
"王莉" → "王女士"
"赵雪" → "赵女士"
```

优势：任何新会员姓名自动脱敏，无需手动维护映射表。

---

## 五、删除文件

| 文件 | 原因 |
|------|------|
| `public/brand/hero/hero-main.svg` | 已被 JPG 真实图片替换 |
| `public/brand/cases/case-1.svg` | 已被 JPG 真实图片替换 |
| `public/brand/cases/case-2.svg` | 已被 JPG 真实图片替换 |

---

## 六、TypeScript 状态

零错误。

## 七、Build 状态

通过。Compiled successfully。

---

## 八、风险评估

| 风险项 | 等级 | 说明 |
|--------|------|------|
| 图片来源 | 低 | Unsplash 免费图库，风格符合要求 |
| 移动端 Hero | 低 | 移动端隐藏图片（hidden sm:block），纯文字展示 |
| 脱敏规则 | 低 | 自动取姓氏，误判可能性低 |
| Build 回归 | 无 | 通过 |
