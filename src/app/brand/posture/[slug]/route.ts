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

  const candidates = [
    path.join(process.cwd(), "public", "brand", "posture", slug),
    path.join(process.cwd(), "miniprogram", "images", "posture", slug),
  ];

  let targetPath: string | null = null;
  for (const c of candidates) {
    if (existsSync(c)) {
      targetPath = c;
      break;
    }
  }

  if (!targetPath) {
    return new NextResponse("Posture Image Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(targetPath);
    const ext = slug.split(".").pop()?.toLowerCase() || "jpg";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[ext] || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new NextResponse("Error reading file", { status: 500 });
  }
}
