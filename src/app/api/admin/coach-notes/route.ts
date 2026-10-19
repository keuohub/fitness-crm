import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coachNotes, members, trainings, questionnaireSubmissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

async function generateCoachMessage(
  memberName: string,
  tags: string[],
  coachNote: string,
  questionnaireGoal: string,
  recentTrainingCount: number
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "";

  const prompt = `你是小桥，徕舞女子塑形馆的教练。你的一位会员${memberName}刚完成了一次训练。

教练记录：
- 训练标签：${tags.join("、")}
- 教练备注：${coachNote || "无"}
- 她当初入会时写的期望：${questionnaireGoal || "未填写"}
- 她已累计训练${recentTrainingCount}次

请你用温暖、真诚、有人情味的语气，写一段不超过180字的课后鼓励。
规则：
- 永远用"你"称呼，不说"会员"
- 先肯定她这次训练的表现（结合标签），再联系她的目标
- 如果她还没达成目标，给她鼓励——强调过程比结果重要
- 绝对不提"AI""系统""数据""算法"这些词
- 读起来像闺蜜发的微信消息，不像报告
- 署名：小桥`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是小桥，一位温暖真诚的女性健身教练。你说话像朋友聊天，不用华丽词藻，只说实话。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 400,
    }),
  });

  if (!response.ok) return "";
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { memberId, trainingId, tags, coachNote } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
    }

    // 只查需要的字段
    const [member] = await db
      .select({ id: members.id, name: members.name, tenantId: members.tenantId })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) {
      return NextResponse.json({ error: "会员不存在" }, { status: 404 });
    }

    const [q] = await db
      .select({ desiredState: questionnaireSubmissions.desiredState })
      .from(questionnaireSubmissions)
      .where(eq(questionnaireSubmissions.memberId, memberId))
      .orderBy(desc(questionnaireSubmissions.submittedAt))
      .limit(1);

    const allTrainings = await db
      .select({ id: trainings.id })
      .from(trainings)
      .where(eq(trainings.memberId, memberId));

    const goalText = q?.desiredState || "";
    const tagList = Array.isArray(tags) ? tags : [];
    const aiMsg = await generateCoachMessage(
      member.name || "会员",
      tagList,
      coachNote || "",
      goalText,
      allTrainings.length
    );

    const [inserted] = await db
      .insert(coachNotes)
      .values({
        tenantId: member.tenantId || 1,
        memberId,
        trainingId: trainingId || null,
        tags: JSON.stringify(tagList),
        coachNote: coachNote || "",
        aiMessage: aiMsg,
      })
      .returning();

    return NextResponse.json({
      id: inserted.id,
      tags: tagList,
      coachNote: coachNote || "",
      aiMessage: aiMsg,
      createdAt: inserted.createdAt,
    });
  } catch (err) {
    console.error("coach-notes POST error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (memberId) {
    const notes = await db
      .select()
      .from(coachNotes)
      .where(eq(coachNotes.memberId, parseInt(memberId, 10)))
      .orderBy(desc(coachNotes.createdAt))
      .limit(20);
    return NextResponse.json(notes.map((n) => ({
      ...n,
      tags: JSON.parse(n.tags || "[]"),
    })));
  }

  const notes = await db
    .select()
    .from(coachNotes)
    .orderBy(desc(coachNotes.createdAt))
    .limit(50);
  return NextResponse.json(notes.map((n) => ({
    ...n,
    tags: JSON.parse(n.tags || "[]"),
  })));
}
