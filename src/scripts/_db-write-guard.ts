// src/scripts/_db-write-guard.ts
//
// 写库脚本的默认拒绝机制（TypeScript 版）。
//
// 为什么单独一份、不直接 import scripts/_db-write-guard.mjs：
//   1. 这些脚本由 tsx 直接跑 src/ 下的 .ts 文件；
//   2. `tsc --noEmit` / Next 的类型检查覆盖 tsconfig include 的 `**/*.ts`；
//   3. 从 src/ 里 import 仓库根目录的 .mjs 没有类型声明，会直接让类型检查报错。
//   所以在 src/ 内放一份**同口径**实现：环境变量、判断逻辑、提示文案与
//   scripts/_db-write-guard.mjs 保持一致，改动时两边要同步。
//
// 通过条件（两档）：
//   ALLOW_DB_WRITE=1         必需
//   ALLOW_REMOTE_DB_WRITE=1  目标不是 localhost/127.0.0.1/::1 时额外必需
//                            （生产 Neon 与 Neon 测试 branch 都算远程，都需要显式确认）
//
// 两种用法：
//   requireDbWriteGuard()   —— 独立入口脚本用：拒绝时直接 process.exit(1)
//   assertDbWriteAllowed()  —— 会被其他模块 import 的函数用：拒绝时抛错，
//                              避免把宿主进程（Next 服务 / scheduler）杀掉

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export class DbWriteGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbWriteGuardError";
  }
}

export interface DbWriteDecision {
  allowed: boolean;
  host: string;
  reasons: string[];
}

function parseHost(dbUrl?: string): string {
  if (!dbUrl) return "unknown";
  try {
    return new URL(dbUrl).hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function isLocalHost(host: string): boolean {
  return host === "unknown" || LOCAL_HOSTS.has(host);
}

/** 只判断，不打印、不退出、不抛错。 */
export function evaluateDbWrite(dbUrl?: string): DbWriteDecision {
  const host = parseHost(dbUrl);
  const reasons: string[] = [];
  if (process.env.ALLOW_DB_WRITE !== "1") reasons.push("缺少 ALLOW_DB_WRITE=1");
  if (!isLocalHost(host) && process.env.ALLOW_REMOTE_DB_WRITE !== "1") {
    reasons.push("缺少 ALLOW_REMOTE_DB_WRITE=1（目标不是本地库）");
  }
  return { allowed: reasons.length === 0, host, reasons };
}

function refusalText(label: string, host: string, reasons: string[]): string {
  return [
    "",
    `[write-guard] 已拒绝运行：${label}`,
    "",
    "本脚本会写数据库，默认禁止执行。",
    "",
    `目标 host：${host}`,
    "",
    ...reasons.map((r) => `  - ${r}`),
    "",
    "放行方式：",
    `  ALLOW_DB_WRITE=1 ${isLocalHost(host) ? "" : "ALLOW_REMOTE_DB_WRITE=1 "}npx tsx src/scripts/${label}.ts`,
    "",
    "执行前请确认：",
    "  1. 目标是 Neon branch 或本地库，不是生产库",
    "  2. 已备份（生产操作必须先在 Neon 控制台建快照）",
    "  3. 写入的数据不会污染真实会员",
    "",
  ].join("\n");
}

/** 独立入口脚本：拒绝时直接退出进程。 */
export function requireDbWriteGuard(label: string, dbUrl?: string): void {
  const d = evaluateDbWrite(dbUrl);
  if (!d.allowed) {
    console.error(refusalText(label, d.host, d.reasons));
    process.exit(1);
  }
  console.log(`[write-guard] ${label} → ${d.host}：已授权写入`);
}

/** 被 import 的函数：拒绝时抛错，由调用方决定如何收场（不要把宿主进程杀掉）。 */
export function assertDbWriteAllowed(label: string, dbUrl?: string): void {
  const d = evaluateDbWrite(dbUrl);
  if (!d.allowed) {
    throw new DbWriteGuardError(refusalText(label, d.host, d.reasons));
  }
}
