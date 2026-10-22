import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { requireAdmin } from "@/lib/auth/admin-session";
import { deleteCache } from "@/lib/api-cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "member-photos");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const data = await db
    .select()
    .from(photos)
    .where(eq(photos.memberId, memberId))
    .orderBy(desc(photos.takenAt));

  const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const memberIdRaw = formData.get("memberId");
    const photoType = formData.get("photoType") as string | null;
    const takenAt = formData.get("takenAt") as string | null;
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "缺少上传文件 file" },
        { status: 400 }
      );
    }

    // 若无 memberId，支持管理后台通用品牌大片上传（月度之星、场馆相册、团队肖像、体态对比等）
    if (!memberIdRaw) {
      // 品牌素材上传只允许已登录管理员
      if (!requireAdmin(request)) {
        return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
      }
      const allowedExt = ["jpg", "jpeg", "png", "webp"];
      const rawExt = (file.name.split(".").pop() || "").toLowerCase();
      if (allowedExt.indexOf(rawExt) < 0) {
        return NextResponse.json({ error: "只支持 jpg/png/webp" }, { status: 400 });
      }
      const BRAND_DIR = path.join(process.cwd(), "public", "brand", "uploads");
      const MINI_DIR = path.join(process.cwd(), "miniprogram", "images", "uploads");
      await mkdir(BRAND_DIR, { recursive: true });
      // 云托管容器内 /app/miniprogram 只读，这里失败不能阻断上传
      try {
        await mkdir(MINI_DIR, { recursive: true });
      } catch (err) {
        console.warn("miniprogram dir not writable, skip sync:", err);
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `brand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(BRAND_DIR, filename);
      const miniPath = path.join(MINI_DIR, filename);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      try {
        await writeFile(miniPath, buffer);
      } catch (err) {
        console.warn("Failed to sync to miniprogram dir:", err);
      }

      const url = `/brand/uploads/${filename}`;
      const localMiniprogramUrl = `/images/uploads/${filename}`;
      return NextResponse.json({ url, localMiniprogramUrl }, { status: 201 });
    }

    const mid = typeof memberIdRaw === "string" ? parseInt(memberIdRaw, 10) : (memberIdRaw as unknown as number);

    const access = await verifyMemberAccess(request, mid);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权访问" }, { status: 401 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const filename = `${mid}-${timestamp}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/member-photos/${filename}`;

    const __r_record = await db
      .insert(photos)
      .values({
        tenantId: 1,
        memberId: mid,
        photoType: photoType || "progress",
        filePath: url,
        takenAt: takenAt || null,
      })
      .returning();
    const record = (__r_record as any)[0];

    // 清除该会员照片缓存，保障前台秒级刷新
    deleteCache(`photos:${mid}`);

    return NextResponse.json(
      { id: record.id, url, photoType: record.photoType, takenAt: record.takenAt },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
