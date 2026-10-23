import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { trainingFeelings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";

/**
 * 管理端 · 待回便签
 *
 * 改造要点：
 * 1. 全接口必须管理员 —— 旧版本 GET 里写着 `if (!admin) { // 兼容开发调试 }`，
 *    等于把 87 位会员的私人留言挂在公网上。
 * 2. 回复必须显式"发送"（PUT action=reply），系统不再代替小桥说话。
 * 3. ai_draft 只在后台出现，是给人改的草稿，不是给会员看的回音。
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status") || "all";

  const memberFilter = memberId ? Number(memberId) : null;

  try {
    const rows = await rawSql`
      SELECT tf.id,
             tf.member_id,
             tf.training_id,
             tf.feeling,
             tf.xiaoqiao_reply,
             tf.ai_draft,
             tf.reply_status,
             tf.created_at,
             m.name AS member_name,
             m.member_code,
             m.avatar_url,
             m.joined_at,
             m.mentor_name,
             (SELECT COUNT(*)::int FROM trainings t2 WHERE t2.member_id = tf.member_id) AS training_count,
             (SELECT MAX(t3.training_date) FROM trainings t3 WHERE t3.member_id = tf.member_id) AS last_training_date
        FROM training_feelings tf
        LEFT JOIN members m ON m.id = tf.member_id
       WHERE (${memberFilter}::int IS NULL OR tf.member_id = ${memberFilter}::int)
         AND (
              ${status} = 'all'
              OR (${status} = 'pending' AND tf.reply_status IN ('pending', 'auto_legacy'))
              OR tf.reply_status = ${status}
             )
       ORDER BY (tf.reply_status IN ('pending', 'auto_legacy')) DESC, tf.created_at DESC
       LIMIT 100
    `;

    const list = rows as any[];
    // auto_legacy 也要算进"等你"：那几句话是机器替你写的，她还没听过你的原话
    const pendingCount = list.filter(
      (r) => r.reply_status === "pending" || r.reply_status === "auto_legacy"
    ).length;

    return NextResponse.json({ items: list, pendingCount, total: list.length });
  } catch (err: any) {
    console.error("[admin/training-feelings] GET error:", err);
    return NextResponse.json({ error: err.message, items: [], pendingCount: 0 }, { status: 500 });
  }
}

/**
 * 小桥按下「发送」：这一刻之前，会员看到的只有"小桥正在看"。
 */
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id ?? body.feelingId);
    const action = String(body.action || "reply");
    const reply = body.reply ?? body.xiaoqiaoReply;

    if (!id) {
      return NextResponse.json({ error: "缺少便签 id" }, { status: 400 });
    }

    // 划掉：这条便签不回了（已当面聊过、或只是打卡）
    if (action === "dismiss") {
      await db
        .update(trainingFeelings)
        .set({ replyStatus: "dismissed" })
        .where(eq(trainingFeelings.id, id));
      return NextResponse.json({ success: true, id, replyStatus: "dismissed" });
    }

    if (typeof reply !== "string" || reply.trim().length === 0) {
      return NextResponse.json({ error: "回复内容不能为空" }, { status: 400 });
    }

    if (reply.trim().length > 500) {
      return NextResponse.json({ error: "回复超过 500 字，便签里说话短一点更像人" }, { status: 400 });
    }

    const [updated] = await db
      .update(trainingFeelings)
      .set({ xiaoqiaoReply: reply.trim(), replyStatus: "replied" })
      .where(eq(trainingFeelings.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      id,
      replyStatus: "replied",
      xiaoqiaoReply: updated?.xiaoqiaoReply ?? reply.trim(),
    });
  } catch (err: any) {
    console.error("[admin/training-feelings] PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * 小桥主动补记一条（当面聊过、电话里说过的话，事后补录）
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { memberId, feeling } = body;
    const reply = body.reply ?? body.xiaoqiaoReply;

    if (!memberId || !feeling || !String(feeling).trim()) {
      return NextResponse.json({ error: "缺少 memberId 或 feeling" }, { status: 400 });
    }

    const hasReply = typeof reply === "string" && reply.trim().length > 0;

    const [created] = await db
      .insert(trainingFeelings)
      .values({
        tenantId: 1,
        memberId: Number(memberId),
        feeling: String(feeling).trim(),
        xiaoqiaoReply: hasReply ? String(reply).trim() : null,
        replyStatus: hasReply ? "replied" : "pending",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
