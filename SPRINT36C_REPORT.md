# SPRINT 36C — 官网真实性优化 报告

## 状态：已完成

---

## 一、修改文件列表

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/brand/CasesSection.tsx` | 修改 | 姓名脱敏 + 图片路径指向 brand 目录 |
| `src/components/brand/StoriesTeaserSection.tsx` | 修改 | 三组姓名脱敏（微微/王莉/赵雪） |
| `src/components/brand/ActivityFeedSection.tsx` | 修改 | API 返回数据展示层脱敏映射 |
| `src/components/brand/AIReportSection.tsx` | 修改 | 去 AI 化文案 + 报告样本姓名脱敏 |

---

## 二、新增文件列表

| 文件 | 用途 |
|------|------|
| `public/brand/` | 品牌图片统一目录 |
| `public/brand/hero/hero-main.svg` | Hero 区域主图占位 |
| `public/brand/cases/case-1.svg` | 案例照片 1 占位 |
| `public/brand/cases/case-2.svg` | 案例照片 2 占位 |
| `public/brand/members/` | 会员照片目录（待填入） |
| `public/brand/story/` | 故事图片目录（待填入） |

---

## 三、姓名脱敏对照表

| 原始姓名 | 官网展示 |
|----------|----------|
| 王莉 | 王女士 |
| 微微 | 微女士 |
| 赵雪 | 赵女士 |
| 陈知意 | 陈女士 |
| 李晓晴 | 李女士 |
| 张婷 | 张女士 |
| 李婷 | 李女士 |

> 所有映射均仅作用于官网展示层，数据库真实姓名不受影响。

---

## 四、文案变更

| 位置 | 旧文案 | 新文案 |
|------|--------|--------|
| AIReportSection.heading | "AI报告展示" | "会员洞察系统" |
| AIReportSection.reportType | "年度总结" | "年度回顾" |
| AIReportSection.reportType | "阶段报告" | "阶段回顾" |
| AIReportSection.badge | "AI报告" | "真实回顾" |
| AIReportSection.sectionId | "ai-report" | "insight" |

---

## 五、图片规范

- 统一存放：`public/brand/`
- Hero：`/brand/hero/`
- 案例：`/brand/cases/`
- 会员：`/brand/members/`
- 故事：`/brand/story/`
- 风格要求：精品普拉提、东方女性、自然光、高级感
- 禁止：外国模特、欧美健身房、正面全脸特写

---

## 六、TypeScript 状态

零错误。

## 七、Build 状态

通过。Compiled successfully。

---

## 八、未修改模块（保护确认）

| 模块 | 状态 |
|------|------|
| 数据库 | 未修改 |
| API | 未修改 |
| Portal | 未修改 |
| CRM | 未修改 |
| 认证系统 | 未修改 |
| 会员真实数据 | 未修改 |
| schema.ts | 未修改 |

---

## 九、风险评估

| 风险项 | 等级 | 说明 |
|--------|------|------|
| 姓名脱敏 | 低 | 仅展示层映射，不影响数据层 |
| 图片占位 | 低 | SVG 占位图，后续可替换真实照片 |
| 文案变更 | 低 | 仅修改展示文案，不影响功能逻辑 |
| Build 回归 | 无 | 通过 |
