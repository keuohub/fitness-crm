import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool, types as pgTypes } from "pg";
import * as schema from "./schema";

// 构建阶段不读连接串。线上 Neon 仍走 HTTP 驱动；
// 指向普通 Postgres（本地验收、云托管自建库）时改走 node-postgres，语句用法不变。

type NeonSql = NeonQueryFunction<false, false>;
type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

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

function isNeonHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "neon.tech" || host.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

pgTypes.setTypeParser(20, (value) => Number(value));
pgTypes.setTypeParser(21, (value) => Number(value));
pgTypes.setTypeParser(23, (value) => Number(value));
pgTypes.setTypeParser(700, (value) => Number(value));
pgTypes.setTypeParser(701, (value) => Number(value));
pgTypes.setTypeParser(1700, (value) => Number(value));

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = normalizeValue(item);
    return out;
  }
  return value;
}

function pgTagged(pool: Pool): NeonSql {
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = "";
    const params: unknown[] = [];
    strings.forEach((part, index) => {
      text += part;
      if (index < values.length) {
        params.push(values[index] === undefined ? null : values[index]);
        text += `$${params.length}`;
      }
    });
    return pool.query(text, params).then((result) => result.rows.map((row) => normalizeValue(row)));
  };
  return tag as unknown as NeonSql;
}

function getSql(): NeonSql {
  if (!sqlSingleton) {
    const url = getDatabaseUrl();
    sqlSingleton = isNeonHost(url) ? neon(url) : pgTagged(new Pool({ connectionString: url }));
  }
  return sqlSingleton;
}

function getDb(): Database {
  if (!dbSingleton) {
    const url = getDatabaseUrl();
    if (isNeonHost(url)) {
      dbSingleton = drizzleNeon(neon(url), { schema });
    } else {
      dbSingleton = drizzlePg(new Pool({ connectionString: url }), { schema }) as unknown as Database;
    }
  }
  return dbSingleton;
}

export const rawSql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...values)) as unknown as NeonSql;

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb() as unknown as object, prop);
  },
});
