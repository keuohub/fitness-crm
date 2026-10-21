import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.some((s) => s.includes(".."))) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const relativeSubpath = slug.join("/");

  // Look in miniprogram/images, public/images, public/brand
  const candidates = [
    path.join(process.cwd(), "miniprogram", "images", relativeSubpath),
    path.join(process.cwd(), "public", "images", relativeSubpath),
    path.join(process.cwd(), "public", "brand", relativeSubpath),
  ];

  let targetPath: string | null = null;
  for (const c of candidates) {
    if (existsSync(c)) {
      targetPath = c;
      break;
    }
  }

  if (!targetPath) {
    return new NextResponse("Image Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(targetPath);
    const ext = slug[slug.length - 1].split(".").pop()?.toLowerCase() || "jpg";
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
    console.error("Error reading image:", err);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
