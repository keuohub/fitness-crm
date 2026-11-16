import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/db";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get("id");
  const key = searchParams.get("key");

  let rows: any[] = [];
  if (idStr) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id)) {
      rows = await rawSql`SELECT image_url FROM booking_landing_categories WHERE id = ${id} LIMIT 1;`;
    }
  } else if (key) {
    rows = await rawSql`SELECT image_url FROM booking_landing_categories WHERE key = ${key} LIMIT 1;`;
  }

  const rawUrl: string = rows[0]?.image_url || "";
  if (!rawUrl) {
    return new NextResponse("Image Not Found", { status: 404 });
  }

  // 1. 如果是远程 HTTP/HTTPS（如腾讯云 COS 图片），代理拉取并流式返回，避免客户端被域名黑名单过滤
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    try {
      const res = await fetch(rawUrl, { next: { revalidate: 3600 } });
      if (!res.ok) {
        return new NextResponse("Failed to fetch upstream image", { status: res.status });
      }
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch (err: any) {
      console.error("Image proxy error for", rawUrl, err);
      return new NextResponse("Proxy Error", { status: 500 });
    }
  }

  // 2. 如果是本地工程文件路径（如 /images/categories/xxx.jpg）
  const cleanPath = rawUrl.replace(/^\/+/, "");
  const candidates = [
    path.join(process.cwd(), "miniprogram", cleanPath),
    path.join(process.cwd(), "public", cleanPath),
  ];

  let localFile: string | null = null;
  for (const c of candidates) {
    if (existsSync(c)) {
      localFile = c;
      break;
    }
  }

  if (!localFile) {
    return new NextResponse("Local file not found", { status: 404 });
  }

  try {
    const buf = await readFile(localFile);
    const ext = localFile.split(".").pop()?.toLowerCase() || "jpg";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
    };
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[ext] || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("Local file read error:", err);
    return new NextResponse("Read error", { status: 500 });
  }
}
