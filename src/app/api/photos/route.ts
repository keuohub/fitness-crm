import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { requireAdmin } from "@/lib/auth/admin-session";
import { deleteCache } from "@/lib/api-cache";
import { uploadFileToStorage } from "@/lib/storage";


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
      if (!(await requireAdmin(request))) {
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
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const filename = `brand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = await file.arrayBuffer();
      const { url, storageType, warning } = await uploadFileToStorage(Buffer.from(bytes), filename, "brand");

      return NextResponse.json(
        { url, localMiniprogramUrl: url, storage: storageType, warning },
        { status: 201 }
      );
    }

    const mid = typeof memberIdRaw === "string" ? parseInt(memberIdRaw, 10) : (memberIdRaw as unknown as number);

    const access = await verifyMemberAccess(request, mid);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权访问" }, { status: 401 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const timestamp = Date.now();
    const filename = `member-photo-${mid}-${timestamp}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { url, storageType, warning } = await uploadFileToStorage(Buffer.from(bytes), filename, "member-photos");

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
      { id: record.id, url, photoType: record.photoType, takenAt: record.takenAt, storage: storageType, warning },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
