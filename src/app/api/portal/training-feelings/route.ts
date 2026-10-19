import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingFeelings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

async function generateXiaoqiaoReply(feeling: string, memberName?: string): Promise<string> {
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
              "你是小桥，徕舞女子塑形的私人教练。会员刚训练完给你发了一段感受。请用温暖、鼓励的语气回应她。必须提到她说的具体内容。不超过150字。纯文本，不用 markdown。语气像闺蜜聊天，不冷漠、不说教。",
          },
          {
            role: "user",
            content: `会员${memberName ? "「" + memberName + "」" : ""}说：${feeling}\n\n请以"小桥"的口吻回应她。`,
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

    // 写入感受
    const [record] = await db
      .insert(trainingFeelings)
      .values({
        tenantId: 1,
        memberId,
        trainingId: trainingId || null,
        feeling: feeling.trim(),
      })
      .returning();

    // 生成小桥的回应（异步，不阻塞返回）
    const reply = await generateXiaoqiaoReply(feeling.trim());

    if (reply) {
      await db
        .update(trainingFeelings)
        .set({ xiaoqiaoReply: reply })
        .where(eq(trainingFeelings.id, record.id));
    }

    return NextResponse.json({
      id: record.id,
      feeling: record.feeling,
      xiaoqiaoReply: reply,
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

  const feelings = await db
    .select()
    .from(trainingFeelings)
    .where(eq(trainingFeelings.memberId, memberId))
    .orderBy(desc(trainingFeelings.createdAt));

  return NextResponse.json(feelings);
}
