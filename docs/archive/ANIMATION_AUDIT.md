# ANIMATION_AUDIT.md — Sprint 39A

## 动画统计

| 动画类型 | 出现次数 | 说明 |
|---------|---------|------|
| `motion.*initial` | 62 | 入场动画起点 |
| `motion.*animate` | 9 | 主动画声明 |
| `whileInView` | 54 | 滚入视口触发 |
| `staggerChildren/staggerContainer/staggerItem` | 24 | 逐个子元素延迟出现 |
| `MICRO.scrollReveal` | 39 | 统一的滚动揭示预设 |
| `hover 动效` | 12 | whileHover / hover: 类 |
| `react-countup` | 2 | EvidenceSection（数字滚动）+ NumbersSection（死亡代码） |

## 各组件动画密度

| 组件 | 动画引用数 | 是否活跃 | 判定 |
|------|----------|:---:|------|
| HeroSection | 21 | 是 | KEEP — Hero 是品牌第一印象，动画合理 |
| HowItWorksSection | 16 | 是 | SIMPLIFY — 16 处太多了，5 个步骤每个都有 stagger |
| AIReportSection | 10 | 是 | SIMPLIFY — FlowDiagram 每个 block 都有 hover，冗余 |
| StoriesTeaserSection | 10 | 是 | KEEP — 3 卡片 stagger 合理 |
| WheelSection | 11 | 否（死亡代码） | — |
| StudioGallerySection | 11 | 否（死亡代码） | — |
| StudioShowcaseSection | 10 | 否（死亡代码） | — |
| ProductSection | 10 | 否（死亡代码） | — |
| EvidenceSection | 5 | 是 | KEEP — 仅板块标题 + countUp |
| BeliefSection | 5 | 是 | KEEP — 简洁 |
| Others | 4-9 | 部分活跃 | KEEP — 合理范围 |

## 判定的动画

### KEEP（保留）
- Hero 的 21 处：Hero 是品牌封面，5 个子元素 stagger 入场 + scroll hint，节奏合理
- EvidenceSection 的 countUp：数据展示的标准做法
- 大部分板块的 scrollReveal：一个 fadeUp 入视口，不过度

### SIMPLIFY（未来精简）
- **HowItWorksSection（16 处）**：每个步骤都用了独立的 scrollReveal + stagger，考虑合并为一个容器动画
- **AIReportSection（10 处）**：FlowDiagram 5 个 block 各带 hover，考虑去掉 hover scale

### REMOVE（未来删除）
- 无。所有动画目前都有存在理由，不删除。

---

> 本阶段仅审计，不删除动画。
