# SPRINT 12 — BRAND WEBSITE REPORT

## 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/brand/AboutSection.tsx` | Apple 风格双栏长文案：为什么创立徕舞 / 为什么成长应该被记录 |
| `src/components/brand/DemoSection.tsx` | 预约演示表单（姓名/手机/工作室，Mock Submit） |
| `src/components/brand/PartnerSection.tsx` | 目标客户三列（普拉提馆/瑜伽馆/女性成长机构） |

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/layout/Navbar.tsx` | 品牌导航：品牌故事/成长体系/产品矩阵/客户案例/合作伙伴/预约演示 |
| `src/components/brand/EcosystemSection.tsx` | 三段全屏叙事（截图占位+价值描述+核心能力+用户收益） |
| `src/components/brand/CasesSection.tsx` | Apple 风格大案例（照片+姓名+职业+故事+AI评价） |
| `src/app/page.tsx` | 完整 13 模块叙事流 |

## 首页叙事流

Hero → About → Belief → Wheel → Journey → Cases → Numbers → Ecosystem → Studio → Film → Partner → Demo → CTA

## 验证

- TypeScript: 0 错误
- npm run build: 通过

## 风险

- Demo 表单为 Mock Submit（不接数据库/不发送请求）
- 截图仍为 CSS 占位，需后续替换真实素材
