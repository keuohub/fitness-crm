// scripts/_db-write-guard.mjs
//
// 写库脚本的统一默认拒绝机制。
//
// 背景：本仓库所有脚本都从 .env.local 读 DATABASE_URL，而它连的是**生产库**。
// 任何人顺手跑一下 s6-acceptance / migrate / import，就会往生产库写数据。
// 这里加一道默认关闭的闸门，避免"验证一下"变成事故。
//
// 通过条件（两档）：
//   ALLOW_DB_WRITE=1         必需。明确同意本次运行会写数据库。
//   ALLOW_REMOTE_DB_WRITE=1  目标不是 localhost/127.0.0.1 时额外必需。
//                            （生产 Neon 和 Neon 测试 branch 都算远程，都需要显式确认）
//
// 用法（在脚本里，拿到连接串之后立刻调用）：
//   import { requireDbWriteGuard } from "./_db-write-guard.mjs";
//   requireDbWriteGuard("s6-acceptance", url);
//
// 只读脚本（compare-*、check-deploy-readiness、import-dry-run）不需要接这个。

function parseHost(dbUrl) {
  if (!dbUrl) return "unknown";
  try {
    const u = new URL(dbUrl);
    return u.hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "unknown";
}

/**
 * 写库前的闸门。未授权直接退出进程（exit 1），不执行任何 SQL。
 * @param {string} label 脚本名，用于提示
 * @param {string} dbUrl 目标数据库连接串（只用来判断 host，不会打印凭据）
 */
export function requireDbWriteGuard(label, dbUrl) {
  const host = parseHost(dbUrl);
  const allowWrite = process.env.ALLOW_DB_WRITE === "1";
  const allowRemote = process.env.ALLOW_REMOTE_DB_WRITE === "1";

  const blocked = (reasons) => {
    console.error(`
[write-guard] 已拒绝运行：${label}

本脚本会写数据库，默认禁止执行。

目标 host：${host}

${reasons.map((r) => "  - " + r).join("\n")}

放行方式：
  ALLOW_DB_WRITE=1 ${isLocalHost(host) ? "" : "ALLOW_REMOTE_DB_WRITE=1 "}node scripts/${label}.mjs

执行前请确认：
  1. 目标是 Neon branch 或本地库，不是生产库
  2. 已备份（生产操作必须先在 Neon 控制台建快照）
  3. 跑完的测试数据不会污染真实会员

只读脚本不需要这个闸门（compare-*、check-deploy-readiness、import-dry-run）。
`);
    process.exit(1);
  };

  if (!allowWrite) {
    blocked(["缺少 ALLOW_DB_WRITE=1"]);
  }
  if (!isLocalHost(host) && !allowRemote) {
    blocked(["缺少 ALLOW_REMOTE_DB_WRITE=1（目标不是本地库）"]);
  }

  console.log(`[write-guard] ${label} → ${host}：已授权写入`);
}
