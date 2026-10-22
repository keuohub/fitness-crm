import COS from "cos-nodejs-sdk-v5";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// 腾讯云 / 微信云托管对象存储配置（来自环境变量）
const COS_SECRET_ID = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID;
const COS_SECRET_KEY = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION || "ap-shanghai";
const COS_CUSTOM_DOMAIN = process.env.COS_CUSTOM_DOMAIN; // 可选自定义加速域名

let cosInstance: COS | null = null;

function getCosClient(): COS | null {
  if (cosInstance) return cosInstance;
  if (COS_SECRET_ID && COS_SECRET_KEY && COS_BUCKET) {
    cosInstance = new COS({
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY,
    });
    return cosInstance;
  }
  return null;
}

/**
 * 上传文件：优先上传到腾讯云对象存储（永久保存、跨发版不丢失）；
 * 若未配置对象存储凭据，优雅降级落到本地运行时 public/media 目录（保持开发与当前兼容）。
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  filename: string,
  prefix: string = "media"
): Promise<{ url: string; storageType: "cos" | "local" }> {
  const cos = getCosClient();

  if (cos && COS_BUCKET) {
    const key = `${prefix}/${filename}`;
    return new Promise((resolve) => {
      cos.putObject(
        {
          Bucket: COS_BUCKET,
          Region: COS_REGION,
          Key: key,
          Body: buffer,
        },
        (err, data) => {
          if (err) {
            console.error("[Storage] COS 上传失败，降级本地存储:", err);
            saveToLocal(buffer, filename).then(resolve).catch((localErr) => {
              console.error("[Storage] 本地降级存储也失败:", localErr);
              resolve({ url: `/media/${filename}`, storageType: "local" });
            });
            return;
          }
          // 上传成功，构造可公开访问的 URL
          const url = COS_CUSTOM_DOMAIN
            ? `https://${COS_CUSTOM_DOMAIN}/${key}`
            : `https://${data.Location}`;
          resolve({ url, storageType: "cos" });
        }
      );
    });
  }

  // 默认降级方案：保存到本地 public/media
  return saveToLocal(buffer, filename);
}

async function saveToLocal(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; storageType: "local" }> {
  const uploadDir = path.join(process.cwd(), "public", "media");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);
  return { url: `/media/${filename}`, storageType: "local" };
}
