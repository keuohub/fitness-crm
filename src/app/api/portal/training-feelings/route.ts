import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingFeelings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * 注意命名：这是「参考草稿」，不是小桥的回音。
 * 生成后只写入 ai_draft，会员端永远看不到；
 * 必须由小桥在 /admin/feelings 里改过、按过发送，才算真的回了。
 */
async function generateReplyDraft(feeling: string, memberName?: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "";

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你在帮徕舞女子塑形的主理人小桥起草一条回复草稿，最终会由她本人改写后发出。" +
              "要求：用温暖、具体、像熟人说话的语气，不超过120字，纯文本不用 markdown。" +
              "严禁说教、严禁空洞夸奖堆砌、严禁使用「亲爱的」开头以外的套话堆叠。" +
              "绝对不要编造会员没表达过的内容；如果她只发了标签词，就围绕标签本身说一句具体的观察，不要假装她讲了一整段话。" +
              "不要提及你是 AI，但也不要冒充小桥本人已经确认过的判断——只给一句能落地的回应。",
          },
          {
            role: "user",
            content:
              `会员${memberName ? "「" + memberName + "」" : ""}课后留下：${feeling}\n\n请起草一条回复草稿。`,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return "";
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { memberId, trainingId, feeling } = await request.json();

    if (!memberId || !feeling || typeof feeling !== "string" || feeling.trim().length === 0) {
      return NextResponse.json({ error: "缺少 memberId 或 feeling" }, { status: 400 });
    }

    // 权限检查
    const access = await verifyMemberAccess(request, memberId);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权操作" }, { status: 401 });
    }

    // 写入感受 —— 只有会员本人写下的一句话，不带任何拼装
    const [record] = await db
      .insert(trainingFeelings)
      .values({
        tenantId: 1,
        memberId,
        trainingId: trainingId || null,
        feeling: feeling.trim(),
        replyStatus: "pending",
      })
      .returning();

    // 只生成「参考草稿」，写入 ai_draft。
    // 关键改动：绝不再自动写进 xiaoqiao_reply ——
    // 会员看到的回音必须是小桥本人按过发送的，否则就是机器在冒充她。
    const draft = await generateReplyDraft(feeling.trim());

    if (draft) {
      await db
        .update(trainingFeelings)
        .set({ aiDraft: draft })
        .where(eq(trainingFeelings.id, record.id));
    }

    return NextResponse.json({
      id: record.id,
      feeling: record.feeling,
      replyStatus: "pending",
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("[training-feelings] POST error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

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

  // 显式列出字段：ai_draft 是小桥的内参底稿，绝不能下发到会员端
  const feelings = await db
    .select({
      id: trainingFeelings.id,
      memberId: trainingFeelings.memberId,
      trainingId: trainingFeelings.trainingId,
      feeling: trainingFeelings.feeling,
      xiaoqiaoReply: trainingFeelings.xiaoqiaoReply,
      replyStatus: trainingFeelings.replyStatus,
      createdAt: trainingFeelings.createdAt,
    })
    .from(trainingFeelings)
    .where(eq(trainingFeelings.memberId, memberId))
    .orderBy(desc(trainingFeelings.createdAt));

  return NextResponse.json(feelings);
}
