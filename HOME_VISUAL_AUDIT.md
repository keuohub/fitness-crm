# HOME_VISUAL_AUDIT.md — Sprint 39A

## 首页 Section 审计（17 个板块）

| # | 组件 | 行数 | 标题（h2） | 间距 | 问题 |
|---|------|------|-----------|------|------|
| 1 | HeroSection | 67 | (无) | min-h-[90vh] | OK |
| 2 | BeliefSection | 39 | (无) | py-32 md:py-40 | OK — 短小精悍 |
| 3 | ManifestoSection | 45 | (无) | py-32 | **缺少 md:py-40** |
| 4 | EvidenceSection | 77 | "成长应该被量化" | py-32 md:py-40 | OK |
| 5 | ActivityFeedSection | 108 | (无) | py-32 混乱 | **py-32 出现两次 + py-3 碎片** |
| 6 | JourneySection | 98 | (无) | — | **缺少统一 py** |
| 7 | CasesSection | 99 | (无) | py-32 md:py-40 + py-12 | OK |
| 8 | StoriesTeaserSection | 134 | (无) | py-32 + py-3 | **多余 py-3** |
| 9 | StudioSection | 66 | (无) | py-32 md:py-40 | OK |
| 10 | BrandFilmSection | 44 | (无) | py-32 | **缺少 md:py-40** |
| 11 | EcosystemSection | 62 | "一个完整的成长生态" | py-32 md:py-40 | OK |
| 12 | AIReportSection | 226 | (无) | py-8 + py-32 + py-1×3 | **py 极其混乱，最长组件** |
| 13 | HowItWorksSection | 109 | "使用流程" | py-2 + py-32 | **py-2 极小** |
| 14 | PartnerSection | 36 | "谁适合使用徕舞" | py-32 | **缺少 md:py-40** |
| 15 | TrySection | 40 | "亲自体验" | py-32 | **缺少 md:py-40** |
| 16 | ContactSection | 42 | (无) | py-32 | **缺少 md:py-40** |
| 17 | DemoSection | 87 | "预约演示" | py-32 + py-12 | OK |

---

## 问题汇总

### 太长的 Section
- **AIReportSection**（226 行）：包含 FlowDiagram + 报告样本卡片 + 两套备用内容，信息过载
- **StoriesTeaserSection**（134 行）：3 个成员卡片结构重复
- **ActivityFeedSection**（108 行）：含 loading 态 + 空态 + 正常态三套逻辑

### 信息重复的 Section
- **JourneySection** 和 **GrowthStorySection**（死亡代码）：同样讲"5个成长阶段"（第一次训练→建立习惯→身体变化→长期成长→新的自己）
- **ProductSection**（死亡代码）和 **EcosystemSection**：同样讲"三套系统"
- **ManifestoSection** 和 **BeliefSection**：都讲品牌理念，有重叠

### 缺乏层级的 Section
- **ActivityFeedSection**：h2 标题用了 font-serif text-3xl（非统一字号）
- **AIReportSection**：标题层级混乱，h2+h3+FlowDiagram+报告卡片
- **JourneySection**：无 h2 标题，直接进入 5 步时间轴

### 留白不足的 Section
- **HowItWorksSection**：py-2（仅 8px），板块被挤压
- **AIReportSection**：py-8（32px）远小于标准的 py-32
- **ManifestoSection / BrandFilmSection / PartnerSection / TrySection / ContactSection**：缺少 md:py-40，桌面端留白偏紧

---

## 建议（本阶段不执行重写，仅做统一）

- P0：统一所有板块 py-32 md:py-40
- P0：删除多余的 py-3 / py-8 / py-2 碎片
- P1：AIReportSection 未来考虑精简
- P2：JourneySection 加 h2 标题

---

> 审计完成。禁止修改代码阶段。
