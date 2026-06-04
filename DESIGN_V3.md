# DESIGN_V3.md — Sprint 38A 品牌去AI化设计规范

## 设计哲学

**网站不是健身房官网，是一本关于女性成长与长期主义的数字杂志。**

---

## 一、字体系统

| 角色 | 字体 | 字重 | 字距 |
|------|------|------|------|
| 一级标题（板块 H2） | font-serif（宋体） | font-semibold | tracking-[-0.03em] |
| 二级标题（卡片/列表） | font-serif | font-medium | tracking-[-0.03em] |
| 正文 | Noto Sans SC 字体栈 | font-normal | — |
| 数字 | Inter 字体栈 | font-medium | — |
| Caption | Noto Sans SC | font-normal | — |

**禁止**：font-black、font-extrabold

---

## 二、间距系统

| 元素 | 值 |
|------|-----|
| 板块上下间距 | py-32 md:py-40（128px → 160px） |
| 标题与正文间距 | mt-12（48px） |
| 正文最大宽度 | max-w-[520px] |
| 正文行高 | leading-[1.9] |

---

## 三、颜色系统

| Token | 值 | 用途 |
|-------|-----|------|
| primary | #8B5E3C（莲花棕） | 微标、强调色、按钮 |
| secondary | #3E2723（深棕） | 标题、正文 |
| muted | #9E8E7E | 辅助文字 |
| bg | #FAF7F2 | 页面底色 |
| surface | #FFFFFF | 卡片 |
| border | #E8E0D5 | 分隔线 |

---

## 四、图片策略

**首页零图片。** 所有品牌展示通过文字完成。

- EcosystemSection：删除 3 张产品截图 → 改为纯文字三栏
- StudioShowcaseSection：死亡代码，图片引用不影响首页
- StudioSection：删 SVG 占位图 → 改为训练空间理念三栏文字

---

## 五、品牌文案红线

**禁止出现**：蜕变、逆袭、改变人生、惊艳、打卡、塑形神器、完美身材

**统一使用**：成长、记录、时间、习惯、长期主义、专注、陪伴

---

## 六、板块结构

首页板块顺序（16 个板块，去AI化后）：

1. Hero — 品牌宣言
2. Manifesto — 关于小桥
3. Evidence — 数据见证
4. ActivityFeed — 今天的训练记录
5. Journey — 成长旅程
6. Cases — 成长档案（杂志式）
7. Stories — 时间会留下答案
8. Studio — 训练空间理念（新增）
9. BrandFilm — 品牌影片
10. Ecosystem — 成长生态
11. AIReport — 成长记录
12. HowItWorks — 使用流程
13. Partner — 合作伙伴
14. Try — 体验
15. Contact — 联系
16. Demo — 预约演示

---

> V3 核心：文字驱动、杂志质感、长期主义品牌语言。
