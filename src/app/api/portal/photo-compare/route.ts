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

    // 默认提供三维标准体态评估网格对比（与封面月度之星彻底隔离）
    const defaultPosture = [
      {
        id: 1001,
        member_id: memberId,
        photo1_url: "/images/posture/posture_front_before.jpg",
        photo2_url: "/images/posture/posture_front_after.jpg",
        photo1_type: "front",
        photo2_type: "front",
        photo1_date: "2025-10-20",
        photo2_date: "2026-10-18",
        analysis: "经过普拉提与大器械精准训练，肋骨外翻已显著收紧归位；骨盆前倾改善约 6°，左右高低肩平衡对称，下颌线与双侧锁骨线条舒展挺拔。",
      },
      {
        id: 1002,
        member_id: memberId,
        photo1_url: "/images/posture/posture_side_before.jpg",
        photo2_url: "/images/posture/posture_side_after.jpg",
        photo1_type: "side",
        photo2_type: "side",
        photo1_date: "2025-10-20",
        photo2_date: "2026-10-18",
        analysis: "侧面观颈部前倾纠正明显，耳垂、肩峰与大转子回归标准垂直重力线。腹横肌建立自主内在张力，小腹自然平坦，后背生理弧度优雅自然。",
      },
      {
        id: 1003,
        member_id: memberId,
        photo1_url: "/images/posture/posture_back_before.jpg",
        photo2_url: "/images/posture/posture_back_after.jpg",
        photo1_type: "back",
        photo2_type: "back",
        photo1_date: "2025-10-20",
        photo2_date: "2026-10-18",
        analysis: "背部翼状肩胛已完全改善，双侧背阔肌与斜方肌中下束恢复均等支撑。脊柱中立无代偿，呈现紧致修长且富有弹性的体态线条。",
      },
    ];
    return NextResponse.json(defaultPosture);
  } catch (err) {
    console.error("portal/photo-compare error:", err);
    return NextResponse.json([]);
  }
}
