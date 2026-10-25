// scripts/backup-card-config.mjs
//
// 只读脚本（不写数据库）。
// 目的：验收（改卡种/课种/开卡/排课/预约）之前，把「卡与课程配置相关」的 6 张表
// 全量导出成 JSON，供验收后 scripts/rollback-card-config.mjs 回滚。
//
// 导出表（顺序 = 父表在前）：
//   card_types、card_type_courses、course_categories、member_cards、class_sessions、bookings
// 额外记录（只记行数/max id，不导出数据）：
//   members、attendance、card_transactions —— 用于回滚后的行数断言与残留排查
//
// 每行用 `to_json(t)::text` 导出，得到的是数据库里的原始值（时间戳为不带时区的 ISO 字符串），
// 回滚时可以直接原样写回，不经过 JS Date 转换，避免时区偏移。
//
// 用法：
//   node scripts/backup-card-config.mjs                  # 从 .env.local 读 DATABASE_URL
//   DATABASE_URL=... node scripts/backup-card-config.mjs # 或直接给环境变量
//
// 输出：backups/card-config-<ISO 时间戳>.json
// 全程只有 SELECT，没有任何写操作，不需要 _db-write-guard。

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

// 顺序很重要：父表在前，便于人工阅读；回滚脚本有自己的顺序表。
const EXPORT_TABLES = [
  "course_categories",
  "card_types",
  "card_type_courses",
  "member_cards",
  "class_sessions",
  "bookings",
];

// 只记录行数与 max id，供回滚断言使用（不导出内容）
const META_TABLES = ["members", "attendance", "card_transactions"];

// 2026-10-25 生产基线，用于在备份时提示「是不是已经晚了」
const EXPECTED_BASELINE = {
  members: 274,
  member_cards: 5,
  bookings: 0,
  class_sessions: 5,
  card_types: 11,
  course_categories: 5,
};

function fail(msg) {
  console.error("[backup] " + msg);
  process.exit(1);
}

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) fail(`找不到 ${envPath}，也没有 DATABASE_URL 环境变量`);
  const text = fs.readFileSync(envPath, "utf8");
  const m = text.match(/^DATABASE_URL=(.*)$/m);
  if (!m || !m[1].trim()) fail(".env.local 里没有 DATABASE_URL");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

async function dumpTable(sql, table) {
  // to_json(t)::text：拿到数据库原始值（时间戳是数据库格式字符串），可直接回写。
  const rows = await sql.query(`SELECT to_json(t)::text AS j FROM ${table} t ORDER BY id`);
  const parsed = rows.map((r) => JSON.parse(r.j));
  const ids = parsed.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
  return {
    count: parsed.length,
    minId: ids.length ? Math.min(...ids) : 0,
    maxId: ids.length ? Math.max(...ids) : 0,
    rows: parsed,
  };
}

async function tableStats(sql, table) {
  const [r] = await sql.query(
    `SELECT count(*)::int AS count, COALESCE(max(id), 0)::int AS max_id, COALESCE(min(id), 0)::int AS min_id FROM ${table}`
  );
  return { count: r.count, maxId: r.max_id, minId: r.min_id };
}

async function main() {
  const url = readDatabaseUrl();
  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    fail("DATABASE_URL 不是合法的连接串");
  }
  const sql = neon(url);

  console.log("=== 备份卡与课程配置（只读）===");
  console.log("数据库主机:", host);
  console.log("");

  // 先确认库是通的、表都在
  const tables = await sql.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = (SELECT current_schema())
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [[...EXPORT_TABLES, ...META_TABLES]]
  );
  const found = new Set(tables.map((t) => t.table_name));
  const missing = [...EXPORT_TABLES, ...META_TABLES].filter((t) => !found.has(t));
  if (missing.length) fail("数据库缺少表：" + missing.join(", "));

  const tablesOut = {};
  console.log("表                      行数    minId  maxId");
  console.log("-".repeat(52));
  for (const table of EXPORT_TABLES) {
    const data = await dumpTable(sql, table);
    tablesOut[table] = data;
    console.log(
      table.padEnd(22) +
        String(data.count).padStart(6) +
        String(data.minId).padStart(7) +
        String(data.maxId).padStart(7)
    );
  }

  const metaOut = {};
  console.log("");
  console.log("参考表（只记录行数/max id/min id，不导出内容）");
  console.log("表                      行数   maxId  minId");
  console.log("-".repeat(52));
  for (const table of META_TABLES) {
    const stats = await tableStats(sql, table);
    metaOut[table] = stats;
    console.log(
      table.padEnd(22) +
        String(stats.count).padStart(6) +
        String(stats.maxId).padStart(7) +
        String(stats.minId).padStart(7)
    );
  }

  const warnings = [];
  for (const [table, expected] of Object.entries(EXPECTED_BASELINE)) {
    const actual =
      table in tablesOut ? tablesOut[table].count : metaOut[table] ? metaOut[table].count : null;
    if (actual !== null && actual !== expected) {
      warnings.push(
        `${table} 行数 ${actual} ≠ 基线 ${expected}` +
          (table === "members" || table === "member_cards" || table === "bookings"
            ? "（回滚后的 274/5/0 断言会失败）"
            : "")
      );
    }
  }

  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").replace("Z", "");
  const backup = {
    kind: "card-config-backup",
    version: 1,
    createdAt: now.toISOString(),
    database: { host },
    note: "由 scripts/backup-card-config.mjs 生成；每行是 to_json(t) 的原始值，供 rollback-card-config.mjs 回滚。",
    baselineExpected: EXPECTED_BASELINE,
    tables: tablesOut,
    meta: metaOut,
  };

  const outDir = path.join(REPO_ROOT, "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `card-config-${ts}.json`);
  fs.writeFileSync(outFile, JSON.stringify(backup, null, 2) + "\n", "utf8");

  console.log("");
  if (warnings.length) {
    console.log("!! 注意：备份时数据已经不是 2026-10-25 基线");
    warnings.forEach((w) => console.log("   - " + w));
    console.log("   如果验收已经开始，这份备份会把测试数据当成基线，不能用于回滚恢复。");
  } else {
    console.log("基线核对：会员 274 / 会员卡 5 / 预约 0 / 课次 5 / 卡种 11 / 课种 5（一致）");
  }
  console.log("备份文件:", path.relative(process.cwd(), outFile) || outFile);
  console.log("文件大小:", fs.statSync(outFile).size, "bytes");
  console.log("提示：本脚本只读，没有写数据库；回滚见 scripts/rollback-card-config.mjs");
}

main().catch((e) => {
  console.error("[backup] 失败:", e);
  process.exit(1);
});
