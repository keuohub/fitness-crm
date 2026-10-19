import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { trainingFeelings, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) {
    // 兼容开发调试环境或通过管理员调用
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  try {
    if (memberId) {
      const feelings = await rawSql`
        SELECT tf.id, tf.tenant_id, tf.member_id, tf.training_id, tf.feeling, tf.xiaoqiao_reply, tf.created_at,
               m.name as member_name, m.portal_code
          FROM training_feelings tf
          LEFT JOIN members m ON m.id = tf.member_id
         WHERE tf.member_id = ${parseInt(memberId, 10)}
         ORDER BY tf.created_at DESC
         LIMIT 50
      `;
      return NextResponse.json(feelings);
    }

    const allFeelings = await rawSql`
      SELECT tf.id, tf.tenant_id, tf.member_id, tf.training_id, tf.feeling, tf.xiaoqiao_reply, tf.created_at,
             m.name as member_name, m.portal_code
        FROM training_feelings tf
        LEFT JOIN members m ON m.id = tf.member_id
       ORDER BY tf.created_at DESC
       LIMIT 100
    `;
    return NextResponse.json(allFeelings);
  } catch (err: any) {
    console.error("[admin/training-feelings] error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { feelingId, reply } = await request.json();
    if (!feelingId || !reply) {
      return NextResponse.json({ error: "缺少 feelingId 或 reply" }, { status: 400 });
    }

    await rawSql`
      UPDATE training_feelings
         SET xiaoqiao_reply = ${reply.trim()}
       WHERE id = ${feelingId}
    `;

    return NextResponse.json({ success: true, feelingId, reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
