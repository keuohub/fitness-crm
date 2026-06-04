import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
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

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const memberIdRaw = formData.get("memberId");
    const photoType = formData.get("photoType") as string | null;
    const takenAt = formData.get("takenAt") as string | null;
    const file = formData.get("file") as File | null;

    if (!memberIdRaw || !file) {
      return NextResponse.json(
        { error: "缺少必填字段 memberId 或 file" },
        { status: 400 }
      );
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

    return NextResponse.json(
      { id: record.id, url, photoType: record.photoType, takenAt: record.takenAt },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
