// 会员头像上传：会员从手机相册选一张图，替换自己的头像
// 鉴权走 verifyMemberAccess（支持 X-Portal-Member-Id 头，小程序端用这个）

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { uploadFileToStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const memberIdRaw = formData.get("memberId");
    const file = formData.get("file") as File | null;

    if (!memberIdRaw || !file) {
      return NextResponse.json({ error: "缺少 memberId 或 file" }, { status: 400 });
    }

    const memberId = parseInt(String(memberIdRaw), 10);
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
    }

    const access = await verifyMemberAccess(request, memberId);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权访问" }, { status: 401 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    if (!["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
      return NextResponse.json({ error: "只支持 jpg/png/webp/heic" }, { status: 400 });
    }
    const filename = `member-avatar-${memberId}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { url: avatarUrl, storageType, warning } = await uploadFileToStorage(
      Buffer.from(bytes),
      filename,
      "avatars"
    );

    await db.update(members).set({ avatarUrl }).where(eq(members.id, memberId));

    return NextResponse.json({ avatarUrl, storage: storageType, warning });
  } catch (err) {
    console.error("avatar upload error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
