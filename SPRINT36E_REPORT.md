# SPRINT 36E — 官网品牌真实感升级 报告

## 状态：已完成

---

## 一、修改文件列表

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/display-name.ts` | 新增 | 共享脱敏库（职业身份 > 姓氏女士） |
| `src/components/brand/HeroSection.tsx` | 修改 | 移动端也显示主图，flex-col 布局 |
| `src/components/brand/CasesSection.tsx` | 修改 | 真实化数据 + 职业身份 + 月份展示 |
| `src/components/brand/StoriesTeaserSection.tsx` | 修改 | 职业身份 + 月份展示 + 新故事内容 |
| `src/components/brand/ActivityFeedSection.tsx` | 修改 | 使用共享 sanitizeName |
| `src/components/brand/AIReportSection.tsx` | 修改 | 使用共享 sanitizeName |
| `src/components/brand/StudioShowcaseSection.tsx` | 新增 | 训练空间三栏图片展示 |
| `src/app/page.tsx` | 修改 | 注册 StudioShowcaseSection |

---

## 二、新增图片列表

| 文件 | 大小 | 用途 |
|------|------|------|
| `public/brand/hero/hero-main.jpg` | 305K | Hero 主图（已替换更高质量） |
| `public/brand/studio/studio-1.jpg` | 85K | 场馆环境 |
| `public/brand/studio/studio-2.jpg` | 111K | 场馆环境 2 |
| `public/brand/studio/reformer-1.jpg` | 94K | Reformer 器械 |
| `public/brand/studio/reformer-2.jpg` | 108K | Reformer 器械 2 |
| `public/brand/training/detail-1.jpg` | 173K | 训练细节 |
| `public/brand/members/member-1.jpg` | 43K | 会员照片（备用） |

---

## 三、脱敏规则升级

### 旧规则（Sprint 36C/D）
- 硬编码 NAME_MAP
- "微微" → "微女士"（不合理）

### 新规则
1. **职业身份优先** — 有 role 则直接使用（如"儿科医生"、"中学教师"）
2. **姓氏+女士** — 标准中文姓名取首字
3. **兜底** — 非标准姓名统一"会员"

### 共享库
- `src/lib/display-name.ts` — `displayName()` + `sanitizeName()`
- 所有品牌组件统一引用此库

---

## 四、案例数据真实化

| 项目 | 旧数据 | 新数据 |
|------|--------|--------|
| 案例A姓名 | 王女士 | 李女士 |
| 案例A身份 | 在职妈妈 | 儿科医生 |
| 案例A训练 | 52次 | 87次 |
| 案例A时长 | 365天 | 14个月 |
| 案例B姓名 | 微女士 | 张女士 |
| 案例B身份 | 办公室白领 | 中学教师 |
| 案例B训练 | 48次 | 63次 |
| 案例B时长 | 366天 | 11个月 |

---

## 五、Hero 布局变更

| 场景 | 旧布局 | 新布局 |
|------|--------|--------|
| 桌面端 | 左文右图 | 左文右图（不变） |
| 移动端 | 纯文字（hidden sm:block） | 上文字下图片（flex-col） |
| 图片高度 | 无限制 | max-h: 450px |

---

## 六、新增模块：训练空间

位置：ManifestoSection 之后，EvidenceSection 之前。

内容：
- 训练空间环境照
- Reformer 器械细节
- 训练动作细节

三栏图片布局，悬停缩放，底部渐变标签。

---

## 七、TypeScript 状态

零错误。

## 八、Build 状态

通过。Compiled successfully。

---

## 九、未修改模块（保护确认）

| 模块 | 状态 |
|------|------|
| 数据库 | 未修改 |
| API | 未修改 |
| Portal | 未修改 |
| CRM | 未修改 |
| 认证系统 | 未修改 |
| 会员真实数据 | 未修改 |
