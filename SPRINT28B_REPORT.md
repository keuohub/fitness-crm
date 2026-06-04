# SPRINT 28B REPORT — Long-Term Member Care System
**日期：2026-06-02**

---

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `src/app/portal/page.tsx` | **修改** | Hero 新增「今天是你来到徕舞的第 X 天」+ 纪念日标签 +「这一路」模块（加入时间/累计训练/最近训练/最近荣誉/教练寄语） |
| `src/app/admin/page.tsx` | **重写** | CRM 首页从单行 redirect 升级为完整仪表盘：本周纪念会员 + 值得联系会员 + 快捷入口 |
| `src/app/api/portal/coach-note/route.ts` | **新增** | 「教练眼中的你」API：读取最新一条 member_memories 记录 |

---

## 数据库变更

**零变更。**

---

## TypeScript 状态

```
npx tsc --noEmit
→ 零错误
```

## Build 状态

```
npm run build
→ ✓ Compiled successfully
→ 42 routes all generated
```

---

## 五个任务交付

### 1. 会员纪念日系统

**Portal Hero：**
- 新增文案：「今天是你来到徕舞的第 {days} 天」
- 纪念日自动检测：30/90/180/365/1095/1825 天
- 到达纪念日显示陶土橙色标签（如「180天 · 成长」）

**CRM 首页：**
- 「本周纪念会员」模块
- 计算规则：会员 `joined_at` 天数接近纪念日（±3天）
- 每行显示：姓名 · 天数 · 成长阶段 · 加入时间

### 2. 教练眼中的你

- 新增 `/api/portal/coach-note` 端点
- 返回最近一条 `member_memories` 记录的 content + createdAt
- 在 Portal 首页「这一路」模块 →「教练寄语」显示
- 不超过 40 字截断，引用格式
- 认证保护（Portal 用户只能看自己的记录）

### 3. 会员偏好档案

使用现有 `member_memories` 表（`memory_type = 'preference'`）。
现有数据：ID=4 已有偏好记录：
> "偏爱普拉提器械课。喜欢练后喝拿铁。对音乐有要求，喜欢轻音乐。"

偏好数据已有 1 条。CRM 通过 `/api/member-memories` 端点新增记录。不在此 Sprint 做 UI 改动。

### 4. 会员关怀提醒

**CRM 首页「值得联系会员」：**
- 规则：距上次训练 >= 14 天 或 无训练记录
- 自动列出所有满足条件的活跃会员
- 每行显示：姓名 · 最近训练时间（红色标注） · 加入天数
- 点击跳转会员详情
- 仅提醒，不自动发消息

### 5. Portal 首页升级

**新增「这一路」模块：**
| 指标 | 数据来源 |
|------|---------|
| 加入时间 | `members.joined_at` |
| 累计训练 | `events` filter `type=training` |
| 最近一次训练 | `events` find first `type=training` |
| 最近荣誉 | `events` find first `type=milestone` |
| 教练寄语 | `/api/portal/coach-note` |

---

## 验收

- `/portal` — Hero 显示「第 X 天」+ 纪念日标签 +「这一路」模块
- `/admin` — CRM 首页显示纪念会员 + 值得联系会员 + 快捷入口
- `/api/portal/coach-note` — 认证保护，未登录返回 401
- Build 通过，零 TypeScript 错误，零数据库变更
