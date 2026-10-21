import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || slug.includes("..")) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  // 1. Check in public/brand/uploads
  const filePath = path.join(process.cwd(), "public", "brand", "uploads", slug);
  // 2. Check in miniprogram/images/uploads
  const miniPath = path.join(process.cwd(), "miniprogram", "images", "uploads", slug);

  const targetPath = existsSync(filePath) ? filePath : existsSync(miniPath) ? miniPath : null;

  if (!targetPath) {
    return new NextResponse("Image Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(targetPath);
    const ext = slug.split(".").pop()?.toLowerCase() || "jpg";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      heic: "image/heic",
    };
    const contentType = mimeTypes[ext] || "image/jpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error reading uploaded image:", err);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
