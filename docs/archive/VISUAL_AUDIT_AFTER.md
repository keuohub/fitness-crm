# VISUAL_AUDIT_AFTER.md — Sprint 41E.2

## 修改内容

| 项目 | 修改前 | 修改后 |
|------|--------|--------|
| Hero h1 tracking | -0.05em | -0.03em |
| Hero h1 leading | 1.05 | 1.15 |
| 副标题 leading | 2.2 | 1.9 |
| 副标题 mt | mt-20 (80px) | mt-16 (64px) |
| 品牌名字号 | text-[11px] | text-base md:text-lg |
| 品牌名 tracking | [0.5em] | [0.15em] |
| 字体栈 | Noto Sans SC 优先 | PingFang SC 优先 |
| 品牌名文案 | ZHONGXIANG LAIWU | 钟祥 · 徕舞 |

## 前后对比

### Hero 标题
- **Before**: 字距过紧（-0.05em），9xl 字号下字符粘连，像公告栏
- **After**: 字距适中（-0.03em），留出呼吸空间，每个字独立可读

### 副标题
- **Before**: leading-[2.2] 太松散，三行悬浮感强
- **After**: leading-[1.9] 紧凑但不拥挤，与标题距离 mt-16 自然衔接

### 品牌名
- **Before**: text-[11px] 几乎不可见，tracking-[0.5em] 过度拉宽
- **After**: text-base（约 16px）在首屏清晰可见，tracking-[0.15em] 精致

### 字体
- **Before**: Noto Sans SC 优先（回退到 PingFang）
- **After**: PingFang SC 优先，macOS 原生字体渲染更锐利

## 评估

| 维度 | 评分 | 说明 |
|------|:---:|------|
| 可读性 | 提升 | 字距放宽后 h1 更清晰 |
| 品牌名可见度 | 显著提升 | 从几乎不可见到清晰可辨 |
| 视觉重心 | 改善 | 副标题不再飘逸 |
| 公文感 | 无 | 继续保持 |
| SaaS 模板感 | 降低 | 品牌名中文化 + 字号提升 |
