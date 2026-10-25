// scripts/apply-coach-admin-20261026.mjs
//
// 本次小调整（店主确认）：
//   1) users 增加 is_coach 标记，教练身份与后台角色解耦（小桥既能进后台、又保留教练端和课表里作为教练）
//   2) 小桥账号升为后台全权限（role=owner），并设置后台/教练端登录密码
//   3) 嘉敏保持教练身份（is_coach=1）
//   4) 「年卡一卡通」卡种的每周限次清空（店主确认全年卡不限制每周上课次数）
//
// 用法：
//   node --env-file=.env.local scripts/apply-coach-admin-20261026.mjs                      # dry-run，不写库
//   ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 XIAOQIAO_ADMIN_PASSWORD='xxx' \
//     node --env-file=.env.local scripts/apply-coach-admin-20261026.mjs --yes
//
// 注意：--yes 之前不会写库；密码只在设置时读取环境变量，不会写入仓库文件。

import { neon } from "@neondatabase/serverless";
import bcryptPkg from "bcryptjs";
const { hashSync, compareSync } = bcryptPkg;
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const XIAOQIAO_EMAIL = "xiaoqiao@laiwu.com";
const JIAMIN_EMAIL = "jiamin@laiwu.com";
const YEAR_CARD_ID = 8;
const YEAR_CARD_NAME = "年卡一卡通";

function fail(msg) {
  console.error("[apply] " + msg);
  process.exit(1);
}

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) fail("找不到 .env.local，也没有 DATABASE_URL 环境变量");
  const text = fs.readFileSync(envPath, "utf8");
  const m = text.match(/^DATABASE_URL=(.*)$/m);
  if (!m || !m[1].trim()) fail(".env.local 里没有 DATABASE_URL");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

async function snapshot(sql) {
  const users = await sql`
    SELECT id, name, email, role, is_coach, status,
           (password_hash LIKE '$2%') AS has_bcrypt
    FROM users ORDER BY id`;
  const [card] = await sql`SELECT id, name, weekly_limit FROM card_types WHERE id = ${YEAR_CARD_ID}`;
  return { users, card };
}

function printState(label, s) {
  console.log(`\n${label}`);
  console.log("  users:");
  for (const u of s.users) {
    console.log(
      `    #${u.id} ${u.name} ${u.email} role=${u.role} is_coach=${u.is_coach} status=${u.status} bcrypt=${u.has_bcrypt}`
    );
  }
  console.log(
    `  卡种 #${YEAR_CARD_ID}: ${s.card ? `${s.card.name} weekly_limit=${s.card.weekly_limit}` : "不存在"}`
  );
}

async function main() {
  const url = readDatabaseUrl();
  const yes = process.argv.includes("--yes");
  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    fail("DATABASE_URL 不合法");
  }
  const sql = neon(url);

  console.log("=== 小桥后台权限 + 教练身份标记 + 年卡限次清空 ===");
  console.log("数据库主机:", host);
  console.log("模式:", yes ? "执行（--yes）" : "dry-run（只读，不写库）");

  // is_coach 列可能还不存在，单独探测，避免整段快照失败
  let columnExists = false;
  try {
    const [row] = await sql`
      SELECT 1 AS ok FROM information_schema.columns
      WHERE table_schema = (SELECT current_schema()) AND table_name = 'users' AND column_name = 'is_coach'`;
    columnExists = !!row;
  } catch (e) {
    fail("探测 is_coach 列失败：" + e.message);
  }

  const before = await snapshot(sql).catch((e) => {
    if (String(e.message).includes("is_coach")) {
      // 列不存在时先按老结构快照
      return sql`
        SELECT id, name, email, role, 0 AS is_coach, status,
               (password_hash LIKE '$2%') AS has_bcrypt
        FROM users ORDER BY id`.then(async (users) => {
        const [card] = await sql`SELECT id, name, weekly_limit FROM card_types WHERE id = ${YEAR_CARD_ID}`;
        return { users, card };
      });
    }
    throw e;
  });
  printState("执行前：", before);

  if (!yes) {
    console.log("\n计划执行的写操作：");
    if (!columnExists) console.log("  1. ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coach integer NOT NULL DEFAULT 0");
    else console.log("  1. is_coach 列已存在，跳过 ALTER");
    console.log(`  2. UPDATE users SET is_coach=1 WHERE email IN ('${XIAOQIAO_EMAIL}','${JIAMIN_EMAIL}')`);
    console.log(`  3. UPDATE users SET role='owner', status='active' WHERE email='${XIAOQIAO_EMAIL}'`);
    console.log(`  4. UPDATE users SET password_hash=<bcrypt> WHERE email='${XIAOQIAO_EMAIL}'（密码来自环境变量）`);
    console.log(`  5. DELETE admin_sessions WHERE admin_id=小桥（改密后强制重新登录）`);
    console.log(`  6. UPDATE card_types SET weekly_limit=NULL WHERE id=${YEAR_CARD_ID} AND name='${YEAR_CARD_NAME}'`);
    console.log("\ndry-run 结束，没有写库。确认后加 --yes 执行（需 ALLOW_DB_WRITE / ALLOW_REMOTE_DB_WRITE / XIAOQIAO_ADMIN_PASSWORD）。");
    return;
  }

  const plain = process.env.XIAOQIAO_ADMIN_PASSWORD;
  if (!plain || plain.length < 8) fail("--yes 执行必须通过 XIAOQIAO_ADMIN_PASSWORD 提供至少 8 位的新密码");
  requireDbWriteGuard("apply-coach-admin-20261026", url);

  const hash = hashSync(plain, 10);

  if (!columnExists) {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coach integer NOT NULL DEFAULT 0`;
    console.log("[1/6] is_coach 列已创建");
  } else {
    console.log("[1/6] is_coach 列已存在，跳过");
  }

  await sql`UPDATE users SET is_coach = 1 WHERE email IN (${XIAOQIAO_EMAIL}, ${JIAMIN_EMAIL})`;
  console.log("[2/6] 教练身份标记已写入：小桥、嘉敏");

  await sql`UPDATE users SET role = 'owner', status = 'active', updated_at = NOW() WHERE email = ${XIAOQIAO_EMAIL}`;
  console.log("[3/6] 小桥已升为后台全权限（role=owner）");

  await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE email = ${XIAOQIAO_EMAIL}`;
  console.log("[4/6] 小桥登录密码已更新（后台与教练端同一密码）");

  await sql`DELETE FROM admin_sessions WHERE admin_id = (SELECT id FROM users WHERE email = ${XIAOQIAO_EMAIL})`;
  console.log("[5/6] 小桥的历史后台会话已清空（需重新登录）");

  await sql`UPDATE card_types SET weekly_limit = NULL WHERE id = ${YEAR_CARD_ID} AND name = ${YEAR_CARD_NAME}`;
  console.log("[6/6] 年卡一卡通每周限次已清空");

  // ── 执行后核对 ──────────────────────────────────────────────
  const after = await snapshot(sql);
  printState("执行后：", after);

  const finds = (email) => after.users.find((u) => u.email === email);
  const xq = finds(XIAOQIAO_EMAIL);
  const jm = finds(JIAMIN_EMAIL);
  const ad = after.users.find((u) => u.id === 1);
  const checks = [
    ["小桥 role=owner", xq?.role === "owner"],
    ["小桥 is_coach=1（保留教练端与课表）", Number(xq?.is_coach) === 1],
    ["嘉敏 is_coach=1", Number(jm?.is_coach) === 1],
    ["管理员 is_coach=0（不会出现在教练下拉）", Number(ad?.is_coach) === 0],
    ["小桥密码为 bcrypt 哈希", !!xq?.has_bcrypt],
    ["年卡一卡通 weekly_limit 为空", after.card?.weekly_limit === null],
  ];
  let allOk = true;
  console.log("\n核对：");
  for (const [label, ok] of checks) {
    if (!ok) allOk = false;
    console.log(`  ${ok ? "[PASS]" : "[FAIL]"} ${label}`);
  }

  // 密码哈希可用性校验（不回显密码）
  const [row] = await sql`SELECT password_hash FROM users WHERE email = ${XIAOQIAO_EMAIL}`;
  const pwOk = (() => {
    try {
      return compareSync(plain, row?.password_hash || "");
    } catch {
      return false;
    }
  })();
  console.log(`  ${pwOk ? "[PASS]" : "[FAIL]"} 新密码可通过 bcrypt 校验`);
  if (!pwOk) allOk = false;

  if (!allOk) {
    console.error("\n有核对项失败，请人工检查。");
    process.exit(1);
  }
  console.log("\n全部完成。把新密码写进本机「后台账号密码.txt」，不要发微信/群。");
}

main().catch((e) => {
  console.error("[apply] 失败：", e);
  process.exit(1);
});
