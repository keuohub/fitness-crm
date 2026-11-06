import COS from "cos-nodejs-sdk-v5";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { rawSql } from "@/db";

// 对象存储配置：优先读数据库 studio_settings（可随时改，不用重发版改环境变量），
// 数据库没配再回退环境变量；两者都没有则降级本地存储。
export type StorageType = "cos" | "local";

export interface StorageResult {
  /** 图片是否真的存进了「靠得住的地方」。false 时 url 为空，调用方必须报错，不能当成功。 */
  ok: boolean;
  url: string;
  storageType: StorageType;
  /** 降级或配置可疑时的中文提示，供后台直接展示 */
  warning?: string;
  /** ok=false 时给运营看的中文原因 */
  error?: string;
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
 * 上传文件：优先对象存储（永久保存、跨发版不丢图）。
 *
 * 关键约束（2026-11-06 修）：
 * 线上跑在云托管的多实例容器里，运行时写进 public/ 的文件**既不会被静态服务提供，
 * 也不会在实例重建后存活**。以前 COS 失败就静默写本地并返回成功，
 * 运营看到"上传成功"，会员端却是空白 —— 这是最难查的一类问题。
 * 所以：生产环境上传失败必须失败，把原因原样抛给后台。
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  filename: string,
  prefix: string = "media"
): Promise<StorageResult> {
  const cfg = await resolveConfig();
  const isProd = process.env.NODE_ENV === "production";

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
      return { ok: true, url, storageType: "cos" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("[Storage] COS 上传失败:", reason);
      if (isProd) {
        return {
          ok: false,
          url: "",
          storageType: "cos",
          error: humanizeCosError(reason),
        };
      }
      const local = await saveToLocal(buffer, filename);
      return {
        ...local,
        ok: true,
        warning: `图片已保存到本地临时目录（未进对象存储），下次发版会丢失。COS 上传失败原因：${reason.slice(0, 160)}`,
      };
    }
  }

  if (isProd) {
    return {
      ok: false,
      url: "",
      storageType: "local",
      error: "还没有配置对象存储，线上无法保存图片。请在 studio_settings 填写 cos_bucket / cos_secret_id / cos_secret_key。",
    };
  }

  const local = await saveToLocal(buffer, filename);
  return {
    ...local,
    ok: true,
    warning: "尚未配置对象存储，图片暂存在本地，发版后会丢失。",
  };
}

/** 把 COS 的英文错误码翻成运营看得懂的一句话 */
function humanizeCosError(reason: string): string {
  if (/arrears|UnavailableForLegalReasons|451/i.test(reason)) {
    return "对象存储被停用：腾讯云账号欠费，请到腾讯云控制台充值后重试（COS 账单结清即可恢复）。";
  }
  if (/AccessDenied|403/i.test(reason)) {
    return "对象存储拒绝写入：密钥无权限，或存储桶权限为私有读。请检查 cos_secret_id / cos_secret_key 与该桶的读写权限。";
  }
  if (/NoSuchBucket|404/i.test(reason)) {
    return "找不到存储桶：cos_bucket 名称或 cos_region 区域填错了。";
  }
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(reason)) {
    return "连不上对象存储：网络超时，请稍后重试。";
  }
  return `对象存储上传失败：${reason.slice(0, 160)}`;
}

/**
 * 存储健康检查：后台进页面时探一次，坏了就直接红条提示，
 * 而不是等运营传完图发现前台是空白才回头查。
 *
 * 为什么不能只 headBucket：
 * 腾讯云账号欠费时，HeadBucket 依然返回 200（只查桶元数据），
 * 但 putObject 会 451。只测元数据等于给了一个假阳性。
 * 所以这里真写一个探针对象、匿名读一次、再删掉 —— 完整走一遍运营上传的路径。
 */
export async function checkStorageHealth(): Promise<{
  ok: boolean;
  storageType: StorageType;
  bucket?: string;
  region?: string;
  message: string;
}> {
  const cfg = await resolveConfig();
  if (!cfg) {
    return {
      ok: false,
      storageType: "local",
      message: "尚未配置对象存储，图片只能存本地，线上会丢失。",
    };
  }

  const probeKey = `_health/probe-${Date.now()}.txt`;
  let uploaded = false;
  try {
    const client = getClient(cfg);
    await new Promise<void>((resolve, reject) => {
      client.putObject(
        {
          Bucket: cfg.bucket,
          Region: cfg.region,
          Key: probeKey,
          Body: Buffer.from("ok"),
          ContentType: "text/plain",
        },
        (err) => (err ? reject(err) : resolve())
      );
    });
    uploaded = true;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      storageType: "cos",
      bucket: cfg.bucket,
      region: cfg.region,
      message: `写入失败：${humanizeCosError(reason)}`,
    };
  }

  // 写成功了，再验证"不登录能不能读到" —— 小程序 <image> 抓的就是这个公开地址。
  let publicReadable = true;
  let readDetail = "";
  try {
    const domain = cleanDomain(cfg.domain);
    const publicUrl = domain
      ? `https://${domain}/${probeKey}`
      : `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com/${probeKey}`;
    const res = await fetch(publicUrl, { method: "GET" });
    publicReadable = res.ok;
    if (!res.ok) readDetail = `HTTP ${res.status}`;
  } catch (err) {
    publicReadable = false;
    readDetail = err instanceof Error ? err.message : String(err);
  } finally {
    try {
      const client = getClient(cfg);
      await new Promise<void>((resolve) => {
        client.deleteObject({ Bucket: cfg.bucket, Region: cfg.region, Key: probeKey }, () =>
          resolve()
        );
      });
    } catch {
      /* 探针删不掉不影响结论，留着也无害 */
    }
  }

  if (!publicReadable) {
    return {
      ok: false,
      storageType: "cos",
      bucket: cfg.bucket,
      region: cfg.region,
      message: `能写入，但图片读不出来（${readDetail}）：存储桶不是「公有读私有写」，会员端和小程序会显示空白。请把该桶访问权限改成「公有读私有写」。`,
    };
  }

  return {
    ok: true,
    storageType: "cos",
    bucket: cfg.bucket,
    region: cfg.region,
    message: "对象存储正常（可写入、可公开读取）",
  };
}

async function saveToLocal(buffer: Buffer, filename: string): Promise<StorageResult> {
  const uploadDir = path.join(process.cwd(), "public", "media");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { ok: true, url: `/media/${filename}`, storageType: "local" };
}
