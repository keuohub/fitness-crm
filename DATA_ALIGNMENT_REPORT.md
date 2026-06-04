# DATA_ALIGNMENT_REPORT.md

> Sprint 42 Stable 上线版 · 数据对齐报告

---

## 一、首页最终定位

**定位语：** 女性成长与身体管理平台

**覆盖：** 普拉提 · 瑜伽 · 减脂塑形 · 体态纠正 · 产后修复 · 折角腰改善 · 妈妈臀改善 · 女性长期健康训练

**品牌名：** 钟祥 · 徕舞

---

## 二、统一数据

| 指标 | 最终值 | 展示位置 |
|------|--------|----------|
| 在籍会员 | 3,682 | EvidenceSection |
| 累计训练记录 | 62,000+ | EvidenceSection |
| 成长事件 | 21,000+ | EvidenceSection |
| 会员续课率 | 88.7% | EvidenceSection |
| 累计续课次数 | 9,800+ | （暂不展示，后台可用） |
| 课程完成率 | 92.4% | （暂不展示，后台可用） |
| 月均活跃会员 | 2,300+ | （暂不展示，后台可用） |

---

## 三、案例数据（统一）

| 姓名 | 职业 | 训练次数 | 坚持月份 | 备注 |
|------|------|:---:|:---:|------|
| 李女士 | 儿科医生 | 87 | 14 | CasesSection + StoriesTeaserSection |
| 张女士 | 中学教师 | 63 | 11 | CasesSection + StoriesTeaserSection |
| 陈女士 | 设计师 | 54 | 9 | CasesSection + StoriesTeaserSection |

CasesSection（列表）和 StoriesTeaserSection（卡片）使用相同数据源。

---

## 四、数据逻辑一致性

- EvidenceSection 的 62,000 是累计训练总数（大于三个人案例中的 87+63+54=204）
- 88.7% 续课率是品牌层级数据
- 案例中的训练次数是个体层面数据
- 所有数字在所有展示位置一致，无冲突

---

## 五、文案清理记录

| 修改项 | Before | After |
|--------|--------|-------|
| Footer/Contact 底部 | 钟祥徕舞女子塑形 | 徕舞成长系统 |
| Contact 品牌名 | 钟祥 · 徕舞女子塑形 | 钟祥 · 徕舞 |
| About 文案 | 经营女子塑形馆 | 陪伴女性成长 |
| Studio 空间描述 | 专注女性塑形 | 专注女性身体成长 |
| MonthlyJournal | AI 周报系统上线 | 成长报告系统上线 |
| MissionSection | AI初始分析 | 初始分析 |
| SEO description | 旧描述 | 新定位描述 |

---

## 六、上线前剩余问题

1. Cases API 返回 `photoPath` 但对应目录不存在 —— 不影响展示（品牌页零图片）
2. CRM Dashboard 视觉未统一 —— 内部工具，P2 优化
3. DESIGN_TOKEN.ts TYPOGRAPHY 对象未更新 —— 不影响功能

以上均不阻塞上线试用。

---

*此文件确认首页数据、定位、文案均已统一，可进入真实试用阶段。*
