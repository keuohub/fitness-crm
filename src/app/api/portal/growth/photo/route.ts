import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";
import { ensureGrowthSchema } from "@/lib/growth-schema";
import { uploadFileToStorage } from "@/lib/storage";
import { shanghaiToday } from "@/lib/shanghai-date";

export async function POST(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  await ensureGrowthSchema();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "只支持 jpg、png、webp" }, { status: 400 });
  }
  const filename = `progress-${memberId}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await uploadFileToStorage(bytes, filename, "private-progress");
  const today = shanghaiToday();
  const [row] = await rawSql`
    INSERT INTO photos (tenant_id, member_id, photo_type, file_path, taken_at, notes, visibility, created_at)
    VALUES (1, ${memberId}, 'progress', ${stored.url}, ${today}, '会员成长照', 'private', NOW())
    RETURNING id, file_path, taken_at`;
  return NextResponse.json({ photo: row, storage: stored.storageType, warning: stored.warning }, { status: 201 });
}
