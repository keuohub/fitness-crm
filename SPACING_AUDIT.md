# SPACING_AUDIT.md — Sprint 37D

## 当前间距统计

| 组件 | py（板块上下） | px（左右内边距） | 板块标题 mb | 风险 |
|------|-------------|----------------|-----------|------|
| AIReportSection | py-8（32px） | px-6 | mb-16 | **低** — py-8 远小于其他板块，视觉挤压 |
| AboutSection | py-32（128px） | px-6 | mb-20 | 低 |
| ActivityFeedSection | py-32 | px-6 | mb-12 | 低 |
| BeliefSection | py-32 | px-6 | mb-8 | 低 |
| BrandFilmSection | py-32 | px-6 | mb-16 | 低 |
| CTASection | py-32 | px-6 | — | 低 |
| CasesSection | py-32 | px-6 | mb-20 | 低 |
| ContactSection | py-32 | px-6 | mb-8 | 低 |
| DemoSection | py-32 | px-6 | mb-16 | 低 |
| EcosystemSection | py-32 | px-6 | mb-24 | 低 |
| EvidenceSection | py-32 | px-6 | mb-20 | 低 |
| GrowthStorySection | py-32 | px-6 | mb-20 | 低（死亡代码） |
| HeroParallax | — | — | — | 低（死亡代码） |
| HeroSection | （min-h-[90vh]） | px-6 | — | 低 |
| HowItWorksSection | py-2（8px） | px-4 | mb-16 | **中** — py-2 极小，板块间无呼吸感 |
| JourneySection | — | px-4 | mb-3 | **中** — 无 py，靠子元素 margin 撑 |
| ManifestoSection | py-32 | px-6 | mb-10 | 低 |
| MethodSection | py-24（96px） | px-6 | mb-1 | **低** — py-24 与 py-32 不统一 |
| MissionSection | py-24 | px-6 | mb-16 | **低** — 同上 |
| NumbersSection | py-32 | px-6 | mb-16 | 低 |
| PartnerSection | py-32 | px-6 | mb-16 | 低 |
| ProductSection | py-32 | px-4 | mb-20 | 低（死亡代码） |
| StoriesTeaserSection | py-32 | px-6 | mb-16 | 低 |
| StudioGallerySection | py-32 | px-6 | mb-16 | 低 |
| StudioSection | py-32 | px-6 | mb-16 | 低（死亡代码） |
| StudioShowcaseSection | py-32 | px-6 | mb-16 | 低 |
| TrySection | py-32 | px-6 | mb-16 | 低 |
| WheelSection | py-32 | px-6 | mb-16 | 低（死亡代码） |

## 发现

1. **py 值不统一**：py-32（128px）是主流，但 AIReportSection 用 py-8（32px）、MethodSection/MissionSection 用 py-24（96px）、JourneySection 无 py、HowItWorksSection 用 py-2（8px）
2. **px 值基本统一**：大多数用 px-6（24px），少数用 px-4
3. **板块标题的 margin-bottom 跨度大**：1～24 个单位不等
4. **移动端策略**：所有 px-6 → 移动端 24px，没有响应式差异化

## 建议间距（P2 — 本阶段不执行）

| 元素 | 当前 | 建议 | 理由 |
|------|------|------|------|
| 板块间距 | py-8/24/32 混用 | 统一 py-32 md:py-40 | 对标 160px+ 国际品牌 |
| 移动端 padding | px-6 | px-5 sm:px-8 md:px-12 | Apple 式渐进留白 |
| 标题底间距 | mb-1~24 | 统一 mb-12 md:mb-16 | 扫除不一致 |
| Hero 与第一个板块间距 | 无明确定义 | 增加 24px gap | 让 Hero 呼吸 |

## 风险等级

- **高风险**（修改可能破坏布局）：AIReportSection py-8 → 改为 py-32 可能影响其内部 `mt-16` 的相对关系
- **中风险**：HowItWorksSection py-2、JourneySection 无 py — 改为 py-32 需检查内部 element margin 是否叠加
- **低风险**：px-4 统一为 px-6、mb 值统一

---

> 本阶段不执行修改。SPACING_AUDIT 仅做记录。
