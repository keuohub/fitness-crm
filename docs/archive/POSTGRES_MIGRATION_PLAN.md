# POSTGRES_MIGRATION_PLAN.md — 徕舞 SQLite → Postgres 迁移计划

生成时间：2026-06-04

---

## 当前状态

| 项目 | 值 |
|------|-----|
| 数据库 | SQLite (better-sqlite3, 172KB) |
| 引用 `@/db` 的文件 | 46 个 |
| Drizzle SQL 操作 | 96 处 |
| Schema 表 | 15 张 |
| 核心数据 | 1 tenant, 1 user, 17 members, 50 trainings |

---

## 迁移策略

### 策略选择：Drizzle ORM 适配器切换

Drizzle 已支持 `drizzle-orm/pg-core` + `drizzle-orm/node-postgres`，迁移路径：

```
drizzle-orm/better-sqlite3  →  drizzle-orm/node-postgres
drizzle-orm/sqlite-core     →  drizzle-orm/pg-core
```

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/db/schema.ts` | `sqliteTable` → `pgTable`，`integer` → `serial`/`integer`，default 语法 |
| `src/db/index.ts` | `better-sqlite3` → `pg` Pool |
| 46 个引用文件 | **无需修改**（Drizzle 查询 API 一致） |

### 关键：46 个文件无需改动

因为 Drizzle ORM 的查询语法（`db.select().from()`、`db.insert().values()`、`db.update().set()`、`db.delete().where()`）在 SQLite 和 Postgres 适配器之间是**完全一致**的。只需要改 schema 定义和连接层。

---

## Schema 改动清单

### 自动增量主键

```diff
- integer("id").primaryKey({ autoIncrement: true })
+ serial("id").primaryKey()
```

### Default 时间戳

```diff
- .default(sql`(datetime('now','localtime'))`)
+ .default(sql`now()`)
```

### 外键引用（SQLite 可选，Postgres 建议显式）

```diff
- integer("tenant_id").notNull().references(() => tenants.id)
+ integer("tenant_id").notNull().references(() => tenants.id)
# Postgres 中应添加 ON DELETE CASCADE 等
```

---

## 环境变量

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## Vercel Postgres 方案

1. 在 Vercel Dashboard → Storage → Create Database → Postgres
2. 自动注入 `POSTGRES_URL` 环境变量
3. 修改 `src/db/index.ts` 使用 `POSTGRES_URL`

---

## 回滚方案

保留 `fitness.db` 和 `src/db/index.ts` 的 SQLite 版本。通过环境变量 `DB_TYPE=sqlite|postgres` 切换。

---

## 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Schema 迁移遗漏 | 低 | Drizzle 编译期检查 |
| 数据迁移丢失 | 低 | 已导出 sqlite-dump.sql |
| 运行时不兼容 | 低 | 46 个文件无需改动 |
| WAL/foreign_keys pragma | 中 | 迁移后删除 pragma |

---
