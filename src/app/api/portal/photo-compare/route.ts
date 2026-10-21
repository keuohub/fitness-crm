import { NextRequest, NextResponse } from "next/server";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mid = searchParams.get("memberId");
  if (!mid) return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  const memberId = parseInt(mid, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) return NextResponse.json({ error: "无权访问" }, { status: 401 });
  // 可指定条数（照片会一直累积，前端不该被写死的 5 条卡住）
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);

  try {
    // 带上两张照片的地址、角度与拍摄日期，会员端才能按角度分组展示对比图
    const rows = await rawSql`
      SELECT c.id, c.tenant_id, c.member_id, c.photo_id_1, c.photo_id_2, c.analysis, c.created_at,
             COALESCE(c.photo1_url, p1.file_path) AS photo1_url,
             COALESCE(c.photo1_date, p1.taken_at) AS photo1_date,
             COALESCE(c.photo1_type, p1.photo_type, 'front') AS photo1_type,
             COALESCE(c.photo2_url, p2.file_path) AS photo2_url,
             COALESCE(c.photo2_date, p2.taken_at) AS photo2_date,
             COALESCE(c.photo2_type, p2.photo_type, 'front') AS photo2_type
        FROM photo_comparisons c
        LEFT JOIN photos p1 ON p1.id = c.photo_id_1
        LEFT JOIN photos p2 ON p2.id = c.photo_id_2
       WHERE c.member_id = ${memberId}
       ORDER BY c.created_at DESC
       LIMIT ${limit}
    `;
    if (rows && rows.length > 0) {
      return NextResponse.json(rows);
    }

    // 没有真实对比照就返回空数组。
    // 绝不返回示范体态照：那会让从未拍过照的新会员看到别人的身体，
    // 并配上一段「骨盆前倾改善约 6°」的伪造诊断。空状态由前端负责。
    return NextResponse.json([]);
  } catch (err) {
    console.error("portal/photo-compare error:", err);
    return NextResponse.json([]);
  }
}
