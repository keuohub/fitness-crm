// scripts/rollback-card-config.mjs
//
// 写库脚本（默认只 dry-run，不写任何数据）。
// 目的：验收结束后，按 scripts/backup-card-config.mjs 生成的备份，把「卡与课程配置」
// 恢复到备份时的状态。
//
// 用法：
//   # 1) 默认 = dry-run：只读，打印将删除/恢复/改回多少行，不写库
//   node --env-file=.env.local scripts/rollback-card-config.mjs backups/card-config-<ts>.json
//
//   # 2) 真正执行（先过 _db-write-guard：默认拒绝，必须显式放行）
//   ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 \
//     node --env-file=.env.local scripts/rollback-card-config.mjs backups/card-config-<ts>.json --yes
//
// 可选参数：
//   --include-log-tables  额外清理备份之后新增的 attendance / card_transactions 行
//                         （预约/扣卡验收会产生这类流水；默认不动这两张表）
//   --force               备份文件记录的数据库 host 与当前 DATABASE_URL 不一致时仍执行
//
// 回滚语义（只处理备份里那 6 张表，其它表不动）：
//   1) 删除备份之后新产生的行：id > 备份中该表 max(id)
//      删除顺序：bookings → class_sessions → member_cards → card_type_courses
//                → card_types → course_categories
//      （这 6 张表在当前库里没有外键约束，顺序只是保持逻辑上的子表优先）
//   2) 恢复"备份里有、现在没了"的行：按备份原始 id 与全部字段 INSERT 回去
//   3) 改回"备份里有、现在被改了"的行：只 UPDATE 有差异的字段，值取备份原值
//   4) 回滚后核对：6 张表行数 = 备份行数；并断言 会员 274、会员卡 5、预约 0，
//      不一致会打印明显告警并以退出码 1 结束
//   5) 顺序字段（serial sequence）落后于 max(id) 时用 setval 补齐，避免下次插入主键冲突
//
// 幂等性：重复执行第二次不会有任何写操作（已删的没有、已恢复的一致），可安全重跑。
//
// 安全边界：
//   - 不带 --yes 时绝不写库（连 write-guard 都不会触发，因为不需要授权）
//   - 带 --yes 时 _db-write-guard 默认拒绝执行，必须 ALLOW_DB_WRITE=1（远程库再加
//     ALLOW_REMOTE_DB_WRITE=1）才放行
//   - 只删 id 大于备份 max id 的行；id 落在备份区间内、但备份里没有的行不会被删，
//     只会作为"未知残留"告警，交给人工判断
//   - 所有写操作在同一个 Neon HTTP 事务里提交，中途失败整体回滚

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

const CORE_TABLES = [
  "course_categories",
  "card_types",
  "card_type_courses",
  "member_cards",
  "class_sessions",
  "bookings",
];

// 删除顺序（子表优先）——任务约定的顺序
const DELETE_ORDER = [
  "bookings",
  "class_sessions",
  "member_cards",
  "card_type_courses",
  "card_types",
  "course_categories",
];

// 恢复/改回顺序（父表优先，插入时先有卡种/课种）
const RESTORE_ORDER = CORE_TABLES;

// 可选清理的流水表（默认不动）
const LOG_TABLES = ["attendance", "card_transactions"];

// 回滚后的硬性断言（2026-10-25 生产基线）
const EXPECT = { members: 274, member_cards: 5, bookings: 0 };

const MAX_LIST = 12; // 列表里最多打印多少个 id
const MAX_DETAIL = 40; // 最多打印多少条字段级差异

function usage() {
  console.log(`
用法：
  node --env-file=.env.local scripts/rollback-card-config.mjs <backup.json> [--yes] [--include-log-tables] [--force]

  <backup.json>            scripts/backup-card-config.mjs 生成的备份文件
  --yes                    真正执行写库（不加就是只读 dry-run）
  --include-log-tables     额外删除备份后新增的 attendance / card_transactions 行
  --force                  忽略"备份文件 host ≠ 当前 DATABASE_URL host"的拦截

示例：
  # dry-run（只读，先看清楚会删/改什么）
  node --env-file=.env.local scripts/rollback-card-config.mjs backups/card-config-2026-10-25T15-20-07-855.json

  # 真执行（write-guard 必须显式放行）
  ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 \\
    node --env-file=.env.local scripts/rollback-card-config.mjs backups/card-config-2026-10-25T15-20-07-855.json --yes
`);
}

function fail(msg) {
  console.error("\n[rollback] 失败：" + msg);
  process.exit(1);
}

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) fail(`找不到 ${envPath}，也没有 DATABASE_URL 环境变量`);
  const m = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.*)$/m);
  if (!m || !m[1].trim()) fail(".env.local 里没有 DATABASE_URL");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function parseArgs(argv) {
  const args = { backupPath: "", yes: false, includeLogTables: false, force: false };
  for (const a of argv) {
    if (a === "--yes") args.yes = true;
    else if (a === "--include-log-tables") args.includeLogTables = true;
    else if (a === "--force") args.force = true;
    else if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    } else if (a.startsWith("-")) fail(`未知参数：${a}（--help 看用法）`);
    else if (!args.backupPath) args.backupPath = a;
    else fail(`多余的参数：${a}`);
  }
  return args;
}

function validateBackup(backup, file) {
  if (!backup || typeof backup !== "object") fail(`备份文件不是合法 JSON 对象：${file}`);
  if (backup.kind !== "card-config-backup") {
    fail(`备份文件 kind=${JSON.stringify(backup.kind)}，不是 card-config-backup（拒绝执行，避免误用到别的备份上）`);
  }
  if (!backup.tables || typeof backup.tables !== "object") fail("备份文件缺少 tables");
  for (const table of CORE_TABLES) {
    const t = backup.tables[table];
    if (!t || !Array.isArray(t.rows)) fail(`备份文件缺少表 ${table} 的 rows`);
    if (typeof t.maxId !== "number") fail(`备份文件缺少表 ${table} 的 maxId`);
    for (const row of t.rows) {
      if (!Number.isFinite(Number(row.id))) fail(`表 ${table} 有 row 缺少 id`);
    }
  }
}

// 规范化比较：忽略 key 顺序
const canon = (row) =>
  JSON.stringify(
    Object.keys(row)
      .sort()
      .map((k) => [k, row[k]])
  );

const shorter = (list) =>
  list.length <= MAX_LIST ? list.join(",") : `${list.slice(0, MAX_LIST).join(",")}…（共 ${list.length} 个）`;

async function fetchRows(sql, table) {
  const rows = await sql.query(`SELECT to_json(t)::text AS j FROM ${table} t ORDER BY id`);
  return rows.map((r) => JSON.parse(r.j));
}

function describeCell(v) {
  if (v === null) return "null";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.backupPath) {
    usage();
    fail("缺少备份文件参数");
  }
  const backupPath = path.isAbsolute(args.backupPath)
    ? args.backupPath
    : path.resolve(process.cwd(), args.backupPath);
  if (!fs.existsSync(backupPath)) fail(`备份文件不存在：${backupPath}`);

  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  } catch (e) {
    fail(`备份文件不是合法 JSON：${e.message}`);
  }
  validateBackup(backup, backupPath);

  const url = readDatabaseUrl();
  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    fail("DATABASE_URL 不是合法的连接串");
  }

  const backupHost = backup.database?.host || "unknown";
  if (backupHost !== host && !args.force) {
    fail(
      `备份文件的数据库 host（${backupHost}）≠ 当前 DATABASE_URL host（${host}）。\n` +
        `  拒绝把 A 库的备份回滚到 B 库。确认无误可加 --force。`
    );
  }

  const sql = neon(url);

  console.log("=== 卡与课程配置回滚 ===");
  console.log("备份文件:", path.relative(process.cwd(), backupPath) || backupPath);
  console.log("备份时间:", backup.createdAt || "(未知)");
  console.log("备份 host:", backupHost, "| 当前 host:", host);
  console.log("模式:", args.yes ? "执行（--yes）" : "dry-run（只读，不写库）");
  console.log("");

  // ── 读取现状 ────────────────────────────────────────────────
  const current = new Map(); // table -> rows
  for (const table of [...CORE_TABLES, ...LOG_TABLES]) {
    current.set(table, await fetchRows(sql, table));
  }

  // ── 计算计划 ────────────────────────────────────────────────
  const del = new Map(); // table -> rows
  const restore = new Map(); // table -> rows
  const update = new Map(); // table -> [{ row, changed }]
  const unknown = new Map(); // table -> rows

  for (const table of DELETE_ORDER) {
    const t = backup.tables[table];
    const maxId = Number(t.maxId);
    del.set(
      table,
      (current.get(table) || []).filter((r) => Number(r.id) > maxId)
    );
  }

  for (const table of LOG_TABLES) {
    const stats = backup.meta?.[table];
    if (!stats || typeof stats.maxId !== "number") continue;
    del.set(
      table,
      (current.get(table) || []).filter((r) => Number(r.id) > Number(stats.maxId))
    );
  }

  for (const table of RESTORE_ORDER) {
    const t = backup.tables[table];
    const backupRows = t.rows;
    const currentById = new Map((current.get(table) || []).map((r) => [Number(r.id), r]));
    const backupIds = new Set(backupRows.map((r) => Number(r.id)));
    const restoreRows = [];
    const changedRows = [];
    for (const row of backupRows) {
      const cur = currentById.get(Number(row.id));
      if (!cur) {
        restoreRows.push(row);
        continue;
      }
      if (canon(cur) === canon(row)) continue;
      const changed = {};
      for (const key of Object.keys(row)) {
        if (key === "id") continue;
        if (cur[key] !== row[key]) changed[key] = [cur[key], row[key]];
      }
      if (Object.keys(changed).length) changedRows.push({ row, changed });
    }
    restore.set(table, restoreRows);
    update.set(table, changedRows);
    unknown.set(
      table,
      (current.get(table) || []).filter(
        (r) => Number(r.id) <= Number(t.maxId) && !backupIds.has(Number(r.id))
      )
    );
  }

  // ── 打印计划 ────────────────────────────────────────────────
  console.log("表                      将删除  将恢复  将改回");
  console.log("-".repeat(56));
  for (const table of DELETE_ORDER) {
    const d = del.get(table)?.length || 0;
    const r = restore.get(table)?.length || 0;
    const u = update.get(table)?.length || 0;
    console.log(
      table.padEnd(22) + String(d).padStart(5) + String(r).padStart(7) + String(u).padStart(7)
    );
  }
  const logDeleted = LOG_TABLES.map((table) => del.get(table)?.length || 0);
  console.log("");
  console.log(
    `参考表删除（${args.includeLogTables ? "已启用 --include-log-tables" : "默认不处理"}）：` +
      LOG_TABLES.map((t, i) => `${t}=${logDeleted[i]}`).join("  ")
  );

  const detail = [];
  for (const table of DELETE_ORDER) {
    const rows = del.get(table) || [];
    if (!rows.length) continue;
    detail.push(`删除 ${table}（id > 备份 max ${backup.tables[table].maxId}）：id ${shorter(rows.map((r) => r.id))}`);
    for (const r of rows) {
      if (table === "member_cards") {
        detail.push(
          `  - member_cards#${r.id} member_id=${r.member_id} card_type_id=${r.card_type_id} status=${r.status}`
        );
      } else if (table === "class_sessions") {
        detail.push(
          `  - class_sessions#${r.id} ${r.session_date} ${r.start_time} category=${r.course_category_id} title=${describeCell(r.title)}`
        );
      } else if (table === "bookings") {
        detail.push(
          `  - bookings#${r.id} session_id=${r.session_id} member_id=${r.member_id} status=${r.status}`
        );
      } else if (table === "card_types") {
        detail.push(`  - card_types#${r.id} name=${describeCell(r.name)} is_active=${r.is_active}`);
      } else if (table === "course_categories") {
        detail.push(`  - course_categories#${r.id} key=${r.key} name=${describeCell(r.name)}`);
      } else if (table === "card_type_courses") {
        detail.push(`  - card_type_courses#${r.id} card_type_id=${r.card_type_id} course_category_id=${r.course_category_id}`);
      } else if (table === "attendance") {
        detail.push(`  - attendance#${r.id} session_id=${r.session_id} member_id=${r.member_id}`);
      } else if (table === "card_transactions") {
        detail.push(`  - card_transactions#${r.id} member_card_id=${r.member_card_id} type=${r.type} amount=${r.amount}`);
      }
    }
  }
  for (const table of RESTORE_ORDER) {
    const rows = restore.get(table) || [];
    if (rows.length) {
      detail.push(`恢复 ${table}（备份里有、现在缺失，按原 id INSERT）：id ${shorter(rows.map((r) => r.id))}`);
    }
  }
  for (const table of RESTORE_ORDER) {
    const rows = update.get(table) || [];
    for (const { row, changed } of rows) {
      const cols = Object.entries(changed)
        .map(([k, [oldV, newV]]) => `${k}: ${describeCell(oldV)} → ${describeCell(newV)}`)
        .join("，");
      detail.push(`改回 ${table}#${row.id}：${cols}`);
    }
  }
  if (detail.length) {
    console.log("");
    console.log("明细（最多显示 " + MAX_DETAIL + " 条）：");
    detail.slice(0, MAX_DETAIL).forEach((line) => console.log("  " + line));
    if (detail.length > MAX_DETAIL) console.log(`  …（还有 ${detail.length - MAX_DETAIL} 条）`);
  }

  const totalDeletes = [...DELETE_ORDER, ...(args.includeLogTables ? LOG_TABLES : [])].reduce(
    (n, table) => n + (del.get(table)?.length || 0),
    0
  );
  const totalRestores = RESTORE_ORDER.reduce((n, table) => n + (restore.get(table)?.length || 0), 0);
  const totalUpdates = RESTORE_ORDER.reduce((n, table) => n + (update.get(table)?.length || 0), 0);

  console.log("");
  console.log(
    `合计：删除 ${totalDeletes} 行，恢复 ${totalRestores} 行，改回 ${totalUpdates} 行` +
      `（共 ${totalDeletes + totalRestores + totalUpdates} 条写操作）`
  );

  const unknownRows = [...unknown.entries()].flatMap(([table, rows]) => rows.map((r) => ({ table, r })));
  if (unknownRows.length) {
    console.log("");
    console.log("!! 未知残留（id 在备份区间内、但备份里没有这些行；脚本不会删除它们）：");
    unknownRows.slice(0, MAX_DETAIL).forEach(({ table, r }) =>
      console.log(`   - ${table}#${r.id} ${table === "card_types" ? describeCell(r.name) : ""}`)
    );
    if (unknownRows.length > MAX_DETAIL) console.log(`   …（还有 ${unknownRows.length} 行）`);
    console.log("   这些行请人工确认后处理，或改备份重跑。");
  }

  // 备份本身不是基线时提醒
  const exp = backup.baselineExpected || {};
  const backupWrong =
    (exp.members !== undefined && backup.meta?.members?.count !== undefined && backup.meta.members.count !== exp.members) ||
    (exp.member_cards !== undefined && backup.tables.member_cards.count !== undefined && backup.tables.member_cards.count !== exp.member_cards) ||
    (exp.bookings !== undefined && backup.tables.bookings.count !== undefined && backup.tables.bookings.count !== exp.bookings);
  if (backupWrong) {
    console.log("");
    console.log("!! 警告：这份备份本身就不是 2026-10-25 基线（备份时可能已经含测试数据）。");
    console.log("   按它回滚会把那些「测试数据」当成基线，回滚后的 274/5/0 断言也会失败。");
  }

  if (!args.yes) {
    console.log("");
    console.log("dry-run 结束：没有执行任何写操作。");
    console.log("确认无误后，加 --yes 执行（会先经过 _db-write-guard）：");
    console.log(
      "  ALLOW_DB_WRITE=1" +
        (host === "localhost" || host === "127.0.0.1" ? "" : " ALLOW_REMOTE_DB_WRITE=1") +
        " node --env-file=.env.local scripts/rollback-card-config.mjs " +
        (path.relative(process.cwd(), backupPath) || backupPath) +
        " --yes"
    );
    return;
  }

  const totalWrites = totalDeletes + totalRestores + totalUpdates;
  if (totalWrites === 0) {
    // 没有要写的东西：不需要写库授权，直接做只读核对（--yes 时也一样）
    console.log("");
    console.log("当前数据已经与备份一致，无需写入；跳过写库授权，直接核对现状。");
  }

  let writes = [];
  let guardPassed = false;
  if (totalWrites > 0) {
    // ── 写库闸门（默认拒绝；必须 ALLOW_DB_WRITE=1，远程库再加 ALLOW_REMOTE_DB_WRITE=1）──
    requireDbWriteGuard("rollback-card-config", url);
    guardPassed = true;

    // ── 构造写语句（同一事务）──────────────────────────────────
    const push = (text, params) => writes.push({ text, params });

    for (const table of [...DELETE_ORDER, ...(args.includeLogTables ? LOG_TABLES : [])]) {
      const rows = del.get(table) || [];
      if (!rows.length) continue;
      const ids = rows.map((r) => Number(r.id));
      push(`DELETE FROM ${table} WHERE id = ANY($1::int[])`, [ids]);
    }

    for (const table of RESTORE_ORDER) {
      for (const row of restore.get(table) || []) {
        const cols = Object.keys(row);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`, cols.map((c) => row[c]));
      }
    }

    for (const table of RESTORE_ORDER) {
      for (const { row, changed } of update.get(table) || []) {
        const cols = Object.keys(changed);
        const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
        push(
          `UPDATE ${table} SET ${sets} WHERE id = $${cols.length + 1}`,
          [...cols.map((c) => changed[c][1]), Number(row.id)]
        );
      }
    }

    console.log("");
    console.log(`开始写库：${writes.length} 条语句，单事务提交…`);
    await sql.transaction((txn) => writes.map((w) => txn.query(w.text, w.params)));
    console.log("事务已提交。");
  } else {
    console.log("");
    console.log("没有写操作，跳过事务。");
  }

  // ── 回滚后核对 ──────────────────────────────────────────────
  console.log("");
  console.log("=== 回滚后核对 ===");
  const after = {};
  for (const table of CORE_TABLES) {
    const rows = await fetchRows(sql, table);
    after[table] = rows;
    const expected = backup.tables[table].count;
    const ok = rows.length === expected;
    console.log(
      `  ${ok ? "[PASS]" : "[FAIL]"} ${table} 行数 ${rows.length}（备份 ${expected}）`
    );
  }
  const [counts] = await sql.query(
    `SELECT (SELECT count(*)::int FROM members) AS members,
            (SELECT count(*)::int FROM member_cards) AS member_cards,
            (SELECT count(*)::int FROM bookings) AS bookings`
  );
  const checks = [
    ["会员", counts.members, EXPECT.members],
    ["会员卡", counts.member_cards, EXPECT.member_cards],
    ["预约", counts.bookings, EXPECT.bookings],
  ];
  for (const [label, actual, expected] of checks) {
    const ok = actual === expected;
    console.log(`  ${ok ? "[PASS]" : "[FAIL]"} ${label} ${actual}（基线 ${expected}）`);
  }

  // 顺序字段：落后于 max(id) 时补齐，避免下次 INSERT 主键冲突
  const seqFixes = [];
  for (const table of CORE_TABLES) {
    const maxId = after[table].length ? Math.max(...after[table].map((r) => Number(r.id))) : 0;
    try {
      const [seq] = await sql.query(
        `SELECT last_value::bigint AS last_value FROM pg_sequences
         WHERE schemaname = (SELECT current_schema()) AND sequencename = $1`,
        [`${table}_id_seq`]
      );
      if (!seq || seq.last_value === null) continue;
      const last = Number(seq.last_value);
      if (maxId > 0 && last < maxId) {
        seqFixes.push({ table, last, maxId });
      }
    } catch (e) {
      console.log(`  [INFO] ${table} 序列检查跳过：${e.message}`);
    }
  }
  if (seqFixes.length) {
    console.log("");
    if (!guardPassed) {
      // setval 也是写操作：没有走写库授权就必须先过闸门
      requireDbWriteGuard("rollback-card-config", url);
      guardPassed = true;
    }
    console.log("序列落后于 max(id)，执行 setval 修正（避免下次 INSERT 主键冲突）：");
    for (const f of seqFixes) {
      await sql.query(`SELECT setval($1::regclass, $2::bigint, true)`, [
        `${f.table}_id_seq`,
        f.maxId,
      ]);
      console.log(`  [FIX] ${f.table}_id_seq: ${f.last} → ${f.maxId}`);
    }
  }

  // ── 结论 ────────────────────────────────────────────────────
  const problems = [];
  for (const table of CORE_TABLES) {
    if (after[table].length !== backup.tables[table].count) problems.push(`${table} 行数不符`);
    const unknownLeft = after[table].filter(
      (r) =>
        Number(r.id) <= Number(backup.tables[table].maxId) &&
        !backup.tables[table].rows.some((b) => Number(b.id) === Number(r.id))
    );
    if (unknownLeft.length) problems.push(`${table} 有 ${unknownLeft.length} 行未知残留`);
    const leftover = after[table].filter((r) => Number(r.id) > Number(backup.tables[table].maxId));
    if (leftover.length) problems.push(`${table} 仍有 ${leftover.length} 行 id 大于备份 max id`);
  }
  if (counts.members !== EXPECT.members) {
    problems.push(`会员数 ${counts.members} ≠ ${EXPECT.members}`);
    const extra = (await fetchRows(sql, "members"))
      .filter((r) => Number(r.id) > Number(backup.meta?.members?.maxId ?? Infinity))
      .map((r) => `${r.id}:${r.name}`);
    if (extra.length) console.log("  备份后新增的会员（不在回滚范围，需人工处理）：" + extra.join("，"));
  }
  if (counts.member_cards !== EXPECT.member_cards) problems.push(`会员卡数 ${counts.member_cards} ≠ ${EXPECT.member_cards}`);
  if (counts.bookings !== EXPECT.bookings) problems.push(`预约数 ${counts.bookings} ≠ ${EXPECT.bookings}`);

  console.log("");
  if (problems.length) {
    console.error("!!! 回滚结果与备份/基线不一致，请立即人工核对 !!!");
    problems.forEach((p) => console.error("  - " + p));
    console.error("  备份文件：" + backupPath);
    process.exit(1);
  }
  console.log("回滚完成：6 张表与备份一致，会员 274 / 会员卡 5 / 预约 0 断言通过。");
  console.log("提醒：把本次备份文件和回滚记录告诉用户存档，后续排查以备份为准。");
}

main().catch((e) => {
  console.error("\n[rollback] 执行失败：", e?.message || e);
  console.error("事务已整体回滚（如果有写操作开始过），可以修好问题后重跑；脚本是幂等的。");
  process.exit(1);
});
