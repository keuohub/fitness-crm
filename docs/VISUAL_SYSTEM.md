# Portal Visual System 1.0

参考：Apple Fitness · Apple Health · The Pilates Class · Levels Health · Linear

---

## 设计关键词

Luxury · Calm · Feminine · Editorial · Premium

---

## 颜色（仅 5 个）

| Token | 值 | 用途 |
|-------|----|------|
| primary | #C27B57 | 按钮、高亮、等级标签 |
| secondary | #3E2723 | 标题、正文 |
| bg | #FAF7F2 | 页面底色 |
| surface | #FFFFFF | 卡片表面 |
| border | #E8E0D5 | 极少量边框、分隔 |

---

## 阴影

| Token | 值 | 用途 |
|-------|----|------|
| shadow-soft | 0 2px 12px rgba(62,39,35,0.05) | 默认卡片 |
| shadow-card | 0 4px 20px rgba(62,39,35,0.06) | 重点卡片 |
| shadow-floating | 0 8px 30px rgba(62,39,35,0.08) | Hero、浮动层 |

---

## 圆角

- 全部卡片：rounded-3xl
- 按钮：rounded-2xl
- 输入框：rounded-2xl
- 胶囊标签：rounded-full

---

## 间距

- 段落间距：space-y-8 ~ space-y-10
- 卡片 padding：p-6 ~ p-8

---

## 字体

| 层级 | 样式 | 用途 |
|------|------|------|
| Hero | font-serif text-3xl font-bold | 页面主标题 |
| Section | font-serif text-sm font-bold | 段落标题 |
| Body | text-sm leading-relaxed | 正文 |
| Caption | text-xs | 辅助说明 |
| Micro | text-[10px] uppercase tracking-wider | 标签、徽章 |

---

## 禁止出现的视觉元素

- border 密集的卡片（改用阴影 + 背景色差）
- DataTable / 表格样式
- 高饱和彩色
- SaaS 风格左侧导航
- 直角/小圆角混用
