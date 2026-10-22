import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ── 懒初始化（Lazy Init）──────────────────────────────────────
// 目的：Docker / 云托管构建阶段不读数据库连接串，`next build` 不会因缺少
// DATABASE_URL 而中断；真正缺失时在**首次访问数据库**的那一刻报错（fail-fast）。
// 调用方无需修改：rawSql 仍是标签模板函数，db 仍是 drizzle 实例。

// 显式写死 neon 的类型参数，避免 ReturnType<typeof neon> 被推成
// NeonQueryFunction<boolean, boolean> 而让调用方拿到联合返回类型。
type NeonSql = NeonQueryFunction<false, false>;
type Database = ReturnType<typeof drizzle<typeof schema>>;

let sqlSingleton: NeonSql | null = null;
let dbSingleton: Database | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL 环境变量未设置：数据库连接串缺失。\n" +
        "本地请写入 .env.local；云端请在「微信云托管 → 服务设置 → 环境变量」配置后重新发布。"
    );
  }
  return url;
}

function getSql(): NeonSql {
  if (!sqlSingleton) sqlSingleton = neon(getDatabaseUrl());
  return sqlSingleton;
}

function getDb(): Database {
  if (!dbSingleton) dbSingleton = drizzle(getSql(), { schema });
  return dbSingleton;
}

/**
 * 标签模板形式与原来完全一致：rawSql`SELECT ...`
 * 类型直接沿用 neon 的签名（保留其重载），否则调用方会拿到联合返回类型。
 */
export const rawSql = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => getSql()(strings, ...values)) as unknown as NeonSql;

/**
 * 与原来的 drizzle 实例用法完全一致（db.select / db.insert / ...）。
 * 用 Proxy 延迟到首次属性访问才建连接，方法会绑定到真实实例，避免 this 丢失。
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb() as unknown as object, prop);
  },
});
