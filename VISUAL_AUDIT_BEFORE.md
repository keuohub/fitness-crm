# VISUAL_AUDIT_BEFORE.md — Sprint 41E.2

## 截图来源
- Desktop: 1440x900
- Mobile: 390x844
- URL: http://localhost:3001

---

## 1. Hero 标题问题

**当前效果**："成长值得被记录" "坚持值得被看见"

- 字号偏大、字距偏紧（tracking-[-0.05em] 在 1440px 上 9xl 字号下显得拥挤）
- 两行之间 leading-[1.05] 偏紧，没有呼吸感
- 在大屏幕上缺乏层次——每个字的"重量"一样，没有节奏
- 排版上像公告栏标题，而不是品牌宣言

## 2. Hero 副标题问题

- leading-[2.2] 太松散，3 行文字像飘在空中
- mt-20（80px）与标题间距偏大，视觉上断裂
- "不是一次训练改变了身体" 这行和下面"一次次记录"之间的逻辑断句在视觉上断开太远

## 3. 品牌名问题

- "ZHONGXIANG LAIWU" → 已改为"钟祥 · 徕舞"
- 当前字号 text-[11px] 太小，在第一屏几乎看不到
- uppercase + tracking-[0.5em] → 拉得太开，辨识度低
- 距离 h1 的 mt-10 合理

## 4. 字体问题

- CSS 字体栈已从 serif 切换为 PingFang SC
- 但 Hero h1 在截图上看不出 PingFang 的精致感——因为字距和字重搭配需要调整
- 副标题用的 text-sm/sm:text-base + font-normal — 正确

## 5. 间距问题

- Hero 板块：min-h-[90vh] — 首屏占满，OK
- h1 到副标题：mt-20（80px）— 偏大
- 副标题行距：leading-[2.2] — 偏松
- Scroll Hint：bottom-8 — OK

## 6. 视觉重心问题

- Hero 文案处于垂直居中位置——正确
- 但标题 + 副标题整体偏"重"：大的大、小的散
- 视觉重心不够集中——用户的视线在 "大字" 和 "松散小字" 之间跳跃

## 7. 公文感

- 无。没有宋体、没有行间距过紧的公文格式。
- 但 9xl 大字 + 极紧 leading 给了"海报"感而非"杂志"感

## 8. SaaS 模板感

- Scroll Hint（向下探索 + 渐变竖线）——典型的 SaaS Landing Page 模式
- "ZHONGXIANG LAIWU" 英文大写装饰——之前已改但未在截图中反映（服务器缓存问题）
- 剩余："Our Belief"、"Growth Stories" 等在页面下方，不在首屏截图中
- 首屏整体是干净的，SaaS 味主要集中在 Scroll Hint 和英文标签

---

## 修改建议

1. **Hero h1**：leading 从 1.05 放宽到 1.15，tracking 从 -0.05em 放宽到 -0.03em
2. **副标题**：leading 从 2.2 收紧到 1.8，mt 从 20 降到 16
3. **品牌名**：字号从 text-[11px] 提升到 text-base md:text-lg，tracking 从 [0.5em] 收紧到 [0.15em]
4. **Scroll Hint**：保留（不删除动画），但文字改为更自然的表达
