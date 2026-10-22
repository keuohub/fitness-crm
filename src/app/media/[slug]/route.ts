// 运行时上传文件的读取路由。
//
// 背景：云托管镜像里的 public/ 是构建期快照，其中已存在的目录（如 public/brand/uploads）
// 对运行用户只读；只有运行时新建的目录可写，且 Next 的静态服务不会服务运行时文件。
// 所以统一把上传文件写到 public/media（运行时创建），再由这个动态路由实时读盘返回。
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || slug.includes("..") || slug.includes("/")) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "media", slug);
  if (!existsSync(filePath)) {
    return new NextResponse("Image Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    const ext = slug.split(".").pop()?.toLowerCase() || "jpg";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/heic",
    };
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error reading media file:", err);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
