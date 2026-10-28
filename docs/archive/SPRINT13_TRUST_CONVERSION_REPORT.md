# SPRINT 13 — TRUST & CONVERSION REPORT

## 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/brand/AIReportSection.tsx` | AI 报告展示 + 五步流程图 |
| `src/components/brand/HowItWorksSection.tsx` | 使用流程 5 步 + Lightbox 截图放大 |
| `src/components/brand/ContactSection.tsx` | 微信咨询区 + 联系方式 |
| `src/components/brand/TrySection.tsx` | 体验专区（链接到 Portal 页面） |
| `public/screenshots/` | 截图目录 |
| `public/cases/` | 案例图片目录 |

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/brand/EcosystemSection.tsx` | next/image 结构（blur placeholder + lazy loading） |
| `src/components/brand/CasesSection.tsx` | Before/After 对比图 + next/image |
| `src/components/brand/DemoSection.tsx` | 表单升级：增加城市、会员规模字段 |
| `src/app/page.tsx` | 17 模块组装 |

## 17 模块叙事流

Hero → About → Belief → Wheel → Journey → Cases → Numbers → Ecosystem → AIReport → HowItWorks → Studio → Film → Partner → Try → Contact → Demo → CTA

## 信任建立体系

- **真实产品**：Ecosystem + next/image 截图位
- **真实案例**：Before/After 对比图 + AI 评价
- **AI 信任**：报告样例 + 五步流程图
- **CRM 信任**：How It Works 流程 + Lightbox 截图放大
- **成交系统**：Demo 表单（5 字段）+ Contact 微信区
- **体验路径**：Try 专区链接到 Portal 页面

## 验证

- TypeScript: 0 错误
- npm run build: 通过
