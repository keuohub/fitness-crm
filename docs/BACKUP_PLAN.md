# BACKUP PLAN — 徕舞成长系统

## 数据存储位置

```
项目根目录/fitness.db   ← SQLite 数据库文件
项目根目录/data/         ← 同步日志 (sync-log.jsonl)
```

备份目标目录：
```
~/backups/laiwu/
```

---

## 方案一：脚本自动备份（推荐）

创建 `scripts/backup.sh`：

```bash
#!/bin/bash
# 每日备份脚本 — 配合 cron 使用

DB="/Users/qiao/Documents/徕舞工作/fitness-crm/fitness.db"
DATA_DIR="/Users/qiao/Documents/徕舞工作/fitness-crm/data"
BACKUP_DIR="$HOME/backups/laiwu"
DATE=$(date +%Y-%m-%d)
WEEK=$(date +%Y-W%U)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# 每日备份（保留最近 14 天）
sqlite3 "$DB" ".backup '$BACKUP_DIR/daily/fitness-$DATE.db'"
cp -r "$DATA_DIR" "$BACKUP_DIR/daily/data-$DATE"

# 删除 14 天前的每日备份
find "$BACKUP_DIR/daily" -name "fitness-*.db" -mtime +14 -delete

# 每周日做周备份（保留 12 周）
if [ "$(date +%u)" = "7" ]; then
  cp "$BACKUP_DIR/daily/fitness-$DATE.db" "$BACKUP_DIR/weekly/fitness-$WEEK.db"
  find "$BACKUP_DIR/weekly" -name "fitness-*.db" -mtime +84 -delete
fi

echo "[$(date)] Backup complete: fitness-$DATE.db"
```

### macOS 配置 cron

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2:00 执行备份
0 2 * * * /bin/bash /Users/qiao/Documents/徕舞工作/fitness-crm/scripts/backup.sh >> /Users/qiao/backups/laiwu/backup.log 2>&1
```

---

## 方案二：Vercel 环境（无本地文件系统）

Vercel 部署时 SQLite 不可用（无持久磁盘）。需要迁移到：

| 选项 | 成本 | 说明 |
|------|------|------|
| Turso (SQLite 边缘) | 免费 9GB | Drizzle 原生支持，`libsql/client` 替换 `better-sqlite3` |
| Neon (PostgreSQL) | 免费 0.5GB | Drizzle 原生支持 |
| Vercel Postgres | $0 起 | 与 Vercel 深度集成 |

备份策略改为数据库服务商自动备份。

---

## 恢复流程

### 本地恢复

```bash
# 1. 停止应用
# （如果正在运行）

# 2. 备份当前损坏的数据库（如果存在）
mv fitness-crm/fitness.db fitness-crm/fitness.db.broken

# 3. 从备份恢复
cp ~/backups/laiwu/daily/fitness-2026-06-02.db fitness-crm/fitness.db

# 4. 重启应用
cd fitness-crm && npm run dev
```

### 验证恢复

```bash
sqlite3 fitness.db "SELECT COUNT(*) FROM members;"
sqlite3 fitness.db "SELECT COUNT(*) FROM trainings;"
```

---

## 检查清单

- [ ] 创建 `~/backups/laiwu/` 目录
- [ ] 执行一次手动备份验证脚本可用
- [ ] 配置 crontab 自动备份
- [ ] 执行一次恢复演练（恢复后检查数据完整性）
- [ ] 记录备份脚本路径到运维文档
