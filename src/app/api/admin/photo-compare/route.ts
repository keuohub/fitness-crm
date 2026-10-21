import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_url TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_url TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_date TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_date TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_type TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_type TEXT;`;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    const rows = memberId
      ? await rawSql`
          SELECT c.id, c.tenant_id, c.member_id, c.analysis, c.created_at,
                 COALESCE(c.photo1_url, p1.file_path) AS photo1_url,
                 COALESCE(c.photo1_date, p1.taken_at) AS photo1_date,
                 COALESCE(c.photo1_type, p1.photo_type, 'front') AS photo1_type,
                 COALESCE(c.photo2_url, p2.file_path) AS photo2_url,
                 COALESCE(c.photo2_date, p2.taken_at) AS photo2_date,
                 COALESCE(c.photo2_type, p2.photo_type, 'front') AS photo2_type
            FROM photo_comparisons c
            LEFT JOIN photos p1 ON p1.id = c.photo_id_1
            LEFT JOIN photos p2 ON p2.id = c.photo_id_2
           WHERE c.member_id = ${parseInt(memberId, 10)}
           ORDER BY c.created_at DESC
        `
      : await rawSql`
          SELECT c.*, m.name AS member_name
            FROM photo_comparisons c
            LEFT JOIN members m ON m.id = c.member_id
           ORDER BY c.created_at DESC
           LIMIT 50
        `;

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("admin photo-compare error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_url TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_url TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_date TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_date TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo1_type TEXT;`;
    await rawSql`ALTER TABLE photo_comparisons ADD COLUMN IF NOT EXISTS photo2_type TEXT;`;

    const body = await request.json();
    const {
      memberId,
      photo1_url,
      photo2_url,
      photo1_date = "2025-10-20",
      photo2_date = "2026-10-18",
      photo1_type = "front",
      photo2_type = "front",
      analysis = "",
    } = body;

    if (!memberId || !photo1_url || !photo2_url) {
      return NextResponse.json({ error: "会员与两张对比照片为必填" }, { status: 400 });
    }

    const mid = Number(memberId);
    const result = await rawSql`
      INSERT INTO photo_comparisons (
        tenant_id, member_id, photo1_url, photo2_url, photo1_date, photo2_date, photo1_type, photo2_type, analysis
      ) VALUES (
        1, ${mid}, ${photo1_url}, ${photo2_url}, ${photo1_date}, ${photo2_date}, ${photo1_type}, ${photo2_type}, ${analysis}
      ) RETURNING id
    `;

    return NextResponse.json({ success: true, id: result[0]?.id }, { status: 201 });
  } catch (err: any) {
    console.error("admin photo-compare POST error:", err);
    return NextResponse.json({ error: err.message || "创建对比失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, photo1_url, photo2_url, photo1_date, photo2_date, photo1_type, photo2_type, analysis } = body;
    if (!id) return NextResponse.json({ error: "缺少对比 ID" }, { status: 400 });

    await rawSql`
      UPDATE photo_comparisons
         SET photo1_url = COALESCE(${photo1_url}, photo1_url),
             photo2_url = COALESCE(${photo2_url}, photo2_url),
             photo1_date = COALESCE(${photo1_date}, photo1_date),
             photo2_date = COALESCE(${photo2_date}, photo2_date),
             photo1_type = COALESCE(${photo1_type}, photo1_type),
             photo2_type = COALESCE(${photo2_type}, photo2_type),
             analysis = COALESCE(${analysis}, analysis)
       WHERE id = ${Number(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("admin photo-compare PUT error:", err);
    return NextResponse.json({ error: err.message || "更新对比失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少对比 ID" }, { status: 400 });

    await rawSql`DELETE FROM photo_comparisons WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("admin photo-compare DELETE error:", err);
    return NextResponse.json({ error: err.message || "删除对比失败" }, { status: 500 });
  }
}
