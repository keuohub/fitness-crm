import COS from "cos-nodejs-sdk-v5";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// 腾讯云对象存储配置（来自云托管运行时环境变量）
const COS_SECRET_ID = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID;
const COS_SECRET_KEY = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION || "ap-shanghai";
// 可选：绑定到桶上的自定义域名 / CDN 域名（只填域名，不要带 https://）
const COS_CUSTOM_DOMAIN = process.env.COS_CUSTOM_DOMAIN;

let cosInstance: COS | null = null;
let bucketFormatChecked = false;

export type StorageType = "cos" | "local";

export interface StorageResult {
  url: string;
  storageType: StorageType;
  /** 降级或配置可疑时的中文提示，供后台直接展示 */
  warning?: string;
}

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

function cleanDomain(domain: string): string {
  return String(domain)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function getCosClient(): COS | null {
  if (cosInstance) return cosInstance;
  if (COS_SECRET_ID && COS_SECRET_KEY && COS_BUCKET) {
    if (!bucketFormatChecked) {
      bucketFormatChecked = true;
      // COS 桶名必须是「名称-appid」形式，缺后缀时 putObject 必然失败
      if (!/-\d{4,}$/.test(COS_BUCKET)) {
        console.warn("[Storage] COS_BUCKET 疑似缺少 -appid 后缀:", COS_BUCKET);
      }
    }
    cosInstance = new COS({
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY,
    });
    return cosInstance;
  }
  return null;
}

/** 当前是否真正配置了对象存储（用于健康检查/后台提示） */
export function isObjectStorageConfigured(): boolean {
  return Boolean(COS_SECRET_ID && COS_SECRET_KEY && COS_BUCKET);
}

/**
 * 上传文件：优先对象存储（永久保存、跨发版不丢图）；
 * 未配置或上传失败时降级到本地 public/media，并且把原因带回给调用方展示。
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  filename: string,
  prefix: string = "media"
): Promise<StorageResult> {
  const cos = getCosClient();

  if (cos && COS_BUCKET) {
    const key = `${prefix}/${filename}`;
    const contentType = mimeOf(filename);
    try {
      const data = await new Promise<{ Location: string }>((resolve, reject) => {
        cos.putObject(
          {
            Bucket: COS_BUCKET,
            Region: COS_REGION,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          },
          (err, result) => (err ? reject(err) : resolve(result as { Location: string }))
        );
      });
      // 默认域名下 Location 已含 /key；自定义域名需要自己拼 key
      const url = COS_CUSTOM_DOMAIN
        ? `https://${cleanDomain(COS_CUSTOM_DOMAIN)}/${key}`
        : `https://${data.Location}`;
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
    warning: isObjectStorageConfigured()
      ? undefined
      : "尚未配置对象存储（COS_BUCKET / COS_SECRET_ID / COS_SECRET_KEY），图片暂存在本地，发版后会丢失。",
  };
}

async function saveToLocal(buffer: Buffer, filename: string): Promise<StorageResult> {
  const uploadDir = path.join(process.cwd(), "public", "media");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/media/${filename}`, storageType: "local" };
}
