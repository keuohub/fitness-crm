// src/scripts/_test-db-guard.ts
//
// 徕舞测试环境安全熔断守卫（Fail-Closed Environment Guard）
// 核心职责：
//   1. 仅显式加载 .env.test 配置文件，严禁自动回退读取 .env.local 或 .env.production。
//   2. 严格核验目标数据库连接串，严禁连接任何已知的正式生产数据库实例。
//   3. 失败即关闭（Fail-Closed）：缺少配置、缺少确认标记或目标为生产库时，在执行任何 SQL 前主动抛错并退出进程。

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 已知正式生产数据库端点特征（绝对黑名单）
const PROD_HOST_PATTERNS = [
  "ep-shiny-star-aoar2x37-pooler",
  "ep-shiny-star-aoar2x37.c-2",
  "ep-shiny-star-aoar2x37",
];

export interface TestDbValidationResult {
  valid: boolean;
  testDbUrl: string;
  host: string;
  database: string;
  error?: string;
}

export function validateTestDatabaseTarget(): TestDbValidationResult {
  const rootDir = process.cwd();
  const testEnvPath = path.join(rootDir, ".env.test");

  // 1. 显式读取 .env.test（若存在则加载），严禁加载 .env.local 或 .env.production
  if (fs.existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath, override: true });
  }

  const testDbUrl = process.env.TEST_DATABASE_URL?.trim();

  // 2. 检查 TEST_DATABASE_URL 是否存在
  if (!testDbUrl) {
    return {
      valid: false,
      testDbUrl: "",
      host: "none",
      database: "none",
      error:
        "【安全阻断】未检测到 TEST_DATABASE_URL 配置！\n" +
        "测试脚本已被安全守卫强制终止。测试脚本严禁回退连接生产库。\n" +
        "请先在项目根目录创建 .env.test，并配置独立的测试数据库连接串：\n" +
        "  TEST_DATABASE_URL=postgresql://...\n" +
        "  TEST_DB_CONFIRMED=1",
    };
  }

  // 3. 检查人工确认开关
  if (process.env.TEST_DB_CONFIRMED !== "1") {
    return {
      valid: false,
      testDbUrl,
      host: "unconfirmed",
      database: "unconfirmed",
      error:
        "【安全阻断】未设置 TEST_DB_CONFIRMED=1！\n" +
        "必须在 .env.test 中显式配置 TEST_DB_CONFIRMED=1，表明已人工核实该连接串确为独立测试数据库。",
    };
  }

  // 4. 解析目标主机
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(testDbUrl);
  } catch (err: any) {
    return {
      valid: false,
      testDbUrl,
      host: "invalid_url",
      database: "invalid_url",
      error: `【安全阻断】TEST_DATABASE_URL 不是合法的 URL 格式：${err.message}`,
    };
  }

  const host = parsedUrl.hostname;
  const database = parsedUrl.pathname;

  // 5. 生产主机特征绝对阻断
  for (const pattern of PROD_HOST_PATTERNS) {
    if (host.includes(pattern)) {
      return {
        valid: false,
        testDbUrl,
        host,
        database,
        error:
          `【严重安全阻断】检测到目标数据库主机 [${host}] 匹配正式生产库特征 [${pattern}]！\n` +
          "安全守卫已拒绝执行任何测试或写入操作！\n" +
          "必须使用完全独立的 Neon 测试 Branch 或独立的测试数据库实例。",
      };
    }
  }

  return {
    valid: true,
    testDbUrl,
    host,
    database,
  };
}

/**
 * 守卫入口：在测试脚本开头调用。未通过时直接终止进程，绝不执行后续代码。
 */
export function requireTestDatabaseGuard(): string {
  const result = validateTestDatabaseTarget();
  if (!result.valid) {
    console.error("\n=======================================================");
    console.error("  FATAL: TEST ENVIRONMENT WRITE GUARD REJECTED EXECUTION");
    console.error("=======================================================");
    console.error(result.error);
    console.error("=======================================================\n");
    process.exit(1);
  }

  console.log(`[TEST-GUARD] ✓ 测试环境核验通过: 目标主机=${result.host}, 数据库=${result.database}`);
  return result.testDbUrl;
}
