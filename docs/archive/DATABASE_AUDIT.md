# DATABASE_AUDIT.md — 徕舞数据库审计

生成时间：2026-06-04

---

## 当前数据库

| 项目 | 值 |
|------|-----|
| 数据库类型 | SQLite (better-sqlite3) |
| 文件路径 | `fitness.db` |
| 文件大小 | 172KB |
| ORM | Drizzle ORM v0.41.0 |
| Schema 定义 | `src/db/schema.ts` |
| 连接文件 | `src/db/index.ts` |
| 引用 `@/db` 的文件数 | 待统计 |

---

## 所有表

| 表名 | 行数 | 说明 |
|------|------|------|
| tenants | 1 | 租户 |
| users | 1 | 管理员/教练 |
| members | 17 | 会员 |
| member_memories | - | 会员记忆 |
| daily_health_logs | - | 每日健康日志 |
| trainings | 50 | 训练记录 |
| ai_feedback_reports | - | AI 反馈报告 |
| photos | - | 照片 |
| questionnaire_submissions | - | 问卷提交 |
| member_sessions | - | 会员 Session |
| admin_sessions | - | 管理员 Session |
| portal_usage_logs | - | Portal 使用追踪 |
| sms_codes | - | 短信验证码 |
| __drizzle_migrations | - | Drizzle 迁移记录 |
| __new_members | - | 备份/迁移中间表 |

---

## 当前连接方式

```ts
// src/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("fitness.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
export const db = drizzle(sqlite, { schema });
```

---

## SQLite → Postgres 类型映射

| SQLite | Postgres |
|--------|----------|
| integer | integer |
| real | real / double precision |
| text | text |
| blob | bytea |
| datetime('now','localtime') | now() |
| AUTOINCREMENT | SERIAL / GENERATED ALWAYS AS IDENTITY |

---

## 关键风险

1. `better-sqlite3` 是 C++ 绑定，Vercel Serverless 不支持
2. `datetime('now','localtime')` 语法是 SQLite 特有
3. `WAL journal_mode` 是 SQLite 特有
4. `foreign_keys = ON` pragma 是 SQLite 特有

---
