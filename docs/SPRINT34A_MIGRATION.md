# Sprint 34A — 手机号登录 数据库迁移脚本

## 执行日期
2026-06-03

## 迁移 SQL

```sql
-- 1. members 表新增 phone_verified
ALTER TABLE members ADD COLUMN phone_verified INTEGER DEFAULT 0;

-- 2. 新建 member_sessions 表
CREATE TABLE IF NOT EXISTS member_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
```

## Drizzle Schema 变更

- `src/db/schema.ts`: members 表新增 `phoneVerified` 字段
- `src/db/schema.ts`: 新增 `memberSessions` 表定义

---

## 回滚方案

```sql
-- 方案 A：保留字段，仅隐藏手机号登录入口（前端改回仅邀请码模式）
-- 无需 SQL 操作

-- 方案 B：完全回滚
ALTER TABLE members DROP COLUMN phone_verified;
DROP TABLE IF EXISTS member_sessions;
```

---

## 影响范围

| 组件 | 改动 |
|------|------|
| `members` 表 | 新增 phone_verified 列（无破坏性） |
| `member_sessions` 表 | 新建 |
| `/api/portal/login-phone` | 新增 |
| `/api/portal/me` | 重构认证逻辑 |
| 5个 Portal API | 切换到新的 member-session 验证 |
| `/portal/login` 页面 | 新增手机号+邀请码双Tab |
| 原有 portal_code 登录 | 保留完整，作为 fallback |

## 零影响项

- member_memories
- growth-story
- 飞书同步
- Growth 页面
- Me 页面
- Feedback 页面
- Report 页面
- Share 页面
