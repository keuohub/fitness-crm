import COS from "cos-nodejs-sdk-v5";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { rawSql } from "@/db";

// 对象存储配置：优先读数据库 studio_settings（可随时改，不用重发版改环境变量），
// 数据库没配再回退环境变量；两者都没有则降级本地存储。
export type StorageType = "cos" | "local";

export interface StorageResult {
  url: string;
  storageType: StorageType;
  /** 降级或配置可疑时的中文提示，供后台直接展示 */
  warning?: string;
}

interface CosConfig {
  bucket: string;
  region: string;
  secretId: string;
  secretKey: string;
  domain?: string;
}

let cachedConfig: { cfg: CosConfig | null; at: number } | null = null;
let cachedClient: { key: string; client: COS } | null = null;
const CACHE_MS = 60 * 1000;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  svg: "image/svg+xml",
};

function mimeOf(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function cleanDomain(domain?: string): string {
  return String(domain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function envConfig(): CosConfig | null {
  const bucket = process.env.COS_BUCKET;
  const secretId = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
  if (bucket && secretId && secretKey) {
    return {
      bucket,
      region: process.env.COS_REGION || "ap-shanghai",
      secretId,
      secretKey,
      domain: process.env.COS_CUSTOM_DOMAIN,
    };
  }
  return null;
}

async function resolveConfig(): Promise<CosConfig | null> {
  if (cachedConfig && Date.now() - cachedConfig.at < CACHE_MS) return cachedConfig.cfg;

  let dbCfg: CosConfig | null = null;
  try {
    const rows = (await rawSql`SELECT key, value FROM studio_settings
      WHERE key IN ('cos_bucket', 'cos_region', 'cos_secret_id', 'cos_secret_key', 'cos_public_domain')`) as Array<{
      key: string;
      value: string | null;
    }>;
    const map = new Map<string, string>();
    for (const r of rows) if (r.value) map.set(r.key, String(r.value).trim());
    const bucket = map.get("cos_bucket");
    const secretId = map.get("cos_secret_id");
    const secretKey = map.get("cos_secret_key");
    if (bucket && secretId && secretKey) {
      dbCfg = {
        bucket,
        region: map.get("cos_region") || "ap-shanghai",
        secretId,
        secretKey,
        domain: map.get("cos_public_domain"),
      };
    }
  } catch (err) {
    console.warn("[Storage] 读取数据库对象存储配置失败，回退环境变量:", err);
  }

  const cfg = dbCfg || envConfig();
  cachedConfig = { cfg, at: Date.now() };
  return cfg;
}

function getClient(cfg: CosConfig): COS {
  const cacheKey = `${cfg.secretId}:${cfg.secretKey}`;
  if (cachedClient && cachedClient.key === cacheKey) return cachedClient.client;
  if (!/-\d{4,}$/.test(cfg.bucket)) {
    console.warn("[Storage] COS 桶名疑似缺少 -appid 后缀:", cfg.bucket);
  }
  const client = new COS({ SecretId: cfg.secretId, SecretKey: cfg.secretKey });
  cachedClient = { key: cacheKey, client };
  return client;
}

/** 当前是否配置了对象存储（数据库或环境变量均可） */
export async function isObjectStorageConfigured(): Promise<boolean> {
  return Boolean(await resolveConfig());
}

/**
 * 上传文件：优先对象存储（永久保存、跨发版不丢图）；
 * 未配置或上传失败时降级到本地 public/media，并把原因带回给调用方展示。
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  filename: string,
  prefix: string = "media"
): Promise<StorageResult> {
  const cfg = await resolveConfig();

  if (cfg) {
    const key = `${prefix}/${filename}`;
    try {
      const client = getClient(cfg);
      const data = await new Promise<{ Location: string }>((resolve, reject) => {
        client.putObject(
          {
            Bucket: cfg.bucket,
            Region: cfg.region,
            Key: key,
            Body: buffer,
            ContentType: mimeOf(filename),
          },
          (err, result) => (err ? reject(err) : resolve(result as { Location: string }))
        );
      });
      // 默认域名下 Location 已含 /key；自定义域名需要自己拼 key
      const domain = cleanDomain(cfg.domain);
      const url = domain ? `https://${domain}/${key}` : `https://${data.Location}`;
      return { url, storageType: "cos" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("[Storage] COS 上传失败，已降级本地存储:", reason);
      const local = await saveToLocal(buffer, filename);
      return {
        ...local,
        warning: `图片已保存到本地临时目录（未进对象存储），下次发版会丢失。COS 上传失败原因：${reason.slice(0, 160)}`,
      };
    }
  }

  const local = await saveToLocal(buffer, filename);
  return {
    ...local,
    warning: "尚未配置对象存储，图片暂存在本地，发版后会丢失。",
  };
}

async function saveToLocal(buffer: Buffer, filename: string): Promise<StorageResult> {
  const uploadDir = path.join(process.cwd(), "public", "media");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/media/${filename}`, storageType: "local" };
}
