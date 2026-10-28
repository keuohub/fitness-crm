# BRAND_AUDIT.md — Sprint 37D 品牌文案审计

## 一、所有英文文案（需替换）

| 英文 | 所在组件 | 替换建议 | 标记 |
|------|---------|---------|------|
| "Zhongxiang Laiwu" | HeroSection | "钟祥 · 徕舞女子塑形" | AI感过强 |
| "Our Belief" | ManifestoSection | "关于小桥" | 模板感过强 |
| "Growth Wheel" | WheelSection | "成长路径" | AI感过强 |
| "Our Space" | StudioGallerySection | "训练空间"（已存在中文副标题） | AI感过强 |
| "How It Works" | HowItWorksSection | "如何开始" | 电商感过强 |
| "Product" | EcosystemSection, ProductSection | "产品" | 电商感过强 |
| "Partners" | PartnerSection | "合作伙伴" | 电商感过强 |
| "Try It" | TrySection | "体验" | 电商感过强 |
| "Numbers" | NumbersSection | "数据" | 模板感过强 |
| "About" | AboutSection | "关于" | 模板感过强 |
| "Demo" | DemoSection | "体验" | 电商感过强 |
| "WeChat" / "Contact" | ContactSection | "微信" / "联系" | 模板感过强 |
| "Growth Story" | GrowthStorySection | "成长故事" | 模板感过强 |
| "Studio" | StudioSection | "工作室" | 模板感过强 |

## 二、所有标题

| 标题 | 所在组件 | 标记 |
|------|---------|------|
| "让成长被记录 / 让坚持被看见" | HeroSection | AI感过强（"让XX被XX"句式） |
| "成长不是一次改变。而是持续被记录的过程。" | HeroSection | 模板感过强 |
| "从第一次训练到第一百次突破，徕舞帮助女性建立长期运动能力。" | HeroSection | 电商感过强（像产品说明） |
| "实时成长动态" | ActivityFeedSection | 电商感过强 |
| "她们正在改变" | StoriesTeaserSection | 电商感过强 |
| "会员洞察系统" | AIReportSection, EcosystemSection | 电商感过强（像SaaS产品） |
| "会员管理中心" | EcosystemSection, ProductSection | 电商感过强 |
| "洞察引擎" | EcosystemSection, ProductSection | SaaS模板感 |
| "会员成长空间" | EcosystemSection, ProductSection | 模板感过强 |

## 三、所有副标题

| 副标题 | 所在组件 | 标记 |
|--------|---------|------|
| "这些记录，来自真实训练与长期坚持。" | StoriesTeaserSection（当前无此副标题，需检查） | — |
| "训练、问卷与照片形成长期档案。" | 成员文案中 | 模板感过强 |
| "训练数据 + 体态照片 + 健康问卷 = 个性化成长报告" | 隐含在AIReportSection | SaaS模板感 |

## 四、所有 CTA

| CTA | 所在组件 | 标记 |
|-----|---------|------|
| "查看成长档案样例" | TrySection | 电商感过强 |
| "体验会员成长时间轴" | TrySection | 电商感过强 |
| "查看 阶段回顾样例" | TrySection | 电商感过强 |
| "阅读真实的阶段回顾" | TrySection | 电商感过强 |
| "查看 Portal 样例" | TrySection | 电商感过强 |
| "打开会员成长空间" | TrySection | 电商感过强 |
| "向下探索" | HeroSection（scroll hint） | 模板感过强 |

## 五、已确认需修改的（来自 STEP 4-7）

| 原文案 | 新文案 | 组件 |
|--------|--------|------|
| "让成长被记录 / 让坚持被看见" | "让身体记住时间 / 让成长自然发生" | HeroSection |
| "从第一次训练到第一百次突破，徕舞帮助女性建立长期运动能力。" | "从第一次训练开始，记录每一次坚持留下的痕迹。" | HeroSection |
| "她们正在改变" | "时间会留下答案" | StoriesTeaserSection |
| —（如有副标题） | "这些记录，来自真实训练与长期坚持。" | StoriesTeaserSection |
| "实时成长动态" | "今天的训练记录" | ActivityFeedSection |
| "会员洞察系统" | "成长记录" | AIReportSection |
| "训练、问卷与照片形成长期档案。"（隐含） | "训练、问卷与照片形成长期档案。" | AIReportSection |

## 六、其他高风险文案

| 文案 | 原因 | 所在组件 |
|------|------|---------|
| "累计陪伴超过20,000名女性改善体态" | SaaS Landing Page 常用句式 | ManifestoSection |
| "从业16年，开馆14年" | 好数字但放在段落中显得像简历 | ManifestoSection |
| "训练不是惩罚自己的身体，而是学会与它相处" | 会员引语——这段反而是最有真实感的文字 | StoriesTeaserSection |
| "十一年伏案工作留下的肩颈问题，终于在这里找到了答案。" | 同上，很真实 | StoriesTeaserSection |

---

> 审计完成。覆盖 src/components/brand 全部 27 个组件。
