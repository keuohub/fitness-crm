// 会员头像上传：会员从手机相册选一张图，替换自己的头像
// 鉴权走 verifyMemberAccess（支持 X-Portal-Member-Id 头，小程序端用这个）

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// TODO(上线前)：改为对象存储（OSS/COS）。当前写服务器磁盘，云上重新发布会丢图。
const UPLOAD_DIR = path.join(process.cwd(), "public", "member-avatars");

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

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `${memberId}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(bytes));

    const avatarUrl = `/member-avatars/${filename}`;
    await db.update(members).set({ avatarUrl }).where(eq(members.id, memberId));

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("avatar upload error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
