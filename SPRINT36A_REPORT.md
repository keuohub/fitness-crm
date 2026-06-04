# SPRINT 36A — NEXT MILESTONE ENGINE 报告

## 状态：已完成

---

## 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/next-milestone.ts` | 已存在 | 下一步目标计算引擎 |
| `src/app/portal/page.tsx` | 已引用 | 首页集成 NextMilestone 模块 |

---

## 算法说明

### computeNextMilestone 优先级

1. **训练次数目标** — 1 / 10 / 25 / 50 / 100 / 200 次
2. **坚持时间目标** — 30 / 90 / 180 / 365 天
3. **体态记录提醒** — 超过 30 天未上传照片

### 展示逻辑

- 首页 Hero 下方 "下一步" 区域
- 独立 GlassCard，显示当前最重要的一个目标
- 进度条可视化
- 零 AI 术语，纯成长语言

---

## TypeScript 状态

零错误。

## Build 状态

通过。 Compiled successfully。

---

## 风险评估

| 风险项 | 等级 | 说明 |
|--------|------|------|
| 数据库变更 | 无 | 不涉及数据库 |
| API 变更 | 无 | 不涉及 API |
| 认证变更 | 无 | 不涉及认证 |
| 前端计算 | 低 | 纯客户端计算，不阻塞渲染 |

---

## 未修改的文件（保护确认）

- `src/lib/auth/*`  未修改
- `src/context/*`  未修改
- `src/app/api/*`  未修改
- `fitness.db`  未修改
