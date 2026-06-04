# HOME_AUDIT_V3.md — Sprint 38A 首页审核

## 当前首页板块状态

| # | 板块 | 组件 | 图片 | 标题字重 | 间距 | 状态 |
|---|------|------|:---:|---------|------|------|
| 1 | Hero | HeroSection | 无 | semibold | min-h-[90vh] | OK |
| 2 | 品牌故事 | ManifestoSection | 无 | semibold | py-32 md:py-40 | OK |
| 3 | 数据见证 | EvidenceSection | 无 | semibold | py-32 md:py-40 | OK（含 countUp 动画已标记已存在，不删除） |
| 4 | 训练记录 | ActivityFeedSection | 无 | semibold | py-32 md:py-40 | OK |
| 5 | 成长旅程 | JourneySection | 无 | semibold | — | OK |
| 6 | 成长档案 | CasesSection | 无 | semibold | py-32 md:py-40 | **已重写**（杂志式） |
| 7 | 会员故事 | StoriesTeaserSection | 无 | semibold | py-32 md:py-40 | OK（标题已改） |
| 8 | 训练空间 | StudioSection | 无（已删SVG） | semibold | py-32 md:py-40 | **已重写**（纯文字三栏） |
| 9 | 品牌影片 | BrandFilmSection | 无 | semibold | py-32 md:py-40 | OK |
| 10 | 成长生态 | EcosystemSection | 无（已删截图） | semibold | py-32 md:py-40 | **已重写**（纯文字） |
| 11 | 成长记录 | AIReportSection | 无 | semibold | py-32 md:py-40 | OK（标题已改） |
| 12 | 使用流程 | HowItWorksSection | 无 | semibold | py-32 md:py-40 | OK |
| 13 | 合作伙伴 | PartnerSection | 无 | semibold | py-32 md:py-40 | OK |
| 14 | 体验 | TrySection | 无 | semibold | py-32 md:py-40 | OK |
| 15 | 联系 | ContactSection | 无 | semibold | py-32 md:py-40 | OK |
| 16 | 预约演示 | DemoSection | 无 | semibold | py-32 md:py-40 | OK |
| — | Footer | page.tsx 内联 | 无 | — | py-12 | OK |

## 审核结论

- **图片引用**：首页零图片，全部文字驱动
- **标题字重**：全站统一 font-semibold，无 font-black/extrabold
- **字距**：全站板块标题统一 tracking-[-0.03em]
- **间距**：全站板块统一 py-32 md:py-40
- **正文**：统一 leading-[1.9]
- **禁止词**：蜕变→长期成长、打卡→记录
- **Build**：通过，TS 零错误
