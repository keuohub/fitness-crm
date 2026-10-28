# SPRINT 36B — 官网品牌展示数据重构 报告

## 状态：已完成

---

## 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/brand/EvidenceSection.tsx` | 修改 | 数据源从 API 切换为品牌展示常量 |

---

## 修改原因

官网「成长应该被量化」模块原先通过 `/api/platform-stats` 从数据库实时读取统计数字。本 Sprint 要求使用品牌展示数据，保持官网视觉效果稳定，不受数据库实时波动影响。

---

## 改动内容

### 旧逻辑
```
fetch("/api/platform-stats") → 数据库查询 → 动态数字
```

### 新逻辑
```
SHOWCASE_STATS 常量 → 静态展示数字
```

数值：
- 532 在籍会员
- 18,460 训练记录
- 7,280 成长事件
- 93.6% 会员留存率

### 未来切换
代码顶部 `SHOWCASE_STATS` 注释明确说明：切换回数据库时，只需替换为 `fetch("/api/platform-stats")` 即可。

---

## 未修改的文件（保护确认）

| 模块 | 状态 |
|------|------|
| Portal | 未修改 |
| CRM | 未修改 |
| API | 未修改（platform-stats API 保留不动） |
| 数据库 | 未修改 |
| Auth | 未修改 |
| Session | 未修改 |
| Schema | 未修改 |

---

## TypeScript 状态

零错误。

## Build 状态

通过。 Compiled successfully。
