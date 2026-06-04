import { requireAdmin } from "@/lib/auth/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API 错误 ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(5, 10);
  const allActive = await db.select().from(members).where(eq(members.status, "active"));

  const birthdayMembers = allActive.filter((m) => {
    if (!m.birthday) return false;
    return m.birthday.slice(5) === today;
  });

  return NextResponse.json({
    today,
    count: birthdayMembers.length,
    birthdays: birthdayMembers.map((m) => ({ id: m.id, name: m.name, birthday: m.birthday })),
  });
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(5, 10);
  const allActive = await db.select().from(members).where(eq(members.status, "active"));

  const birthdayMembers = allActive.filter((m) => {
    if (!m.birthday) return false;
    return m.birthday.slice(5) === today;
  });

  const results: { memberId: number; name: string; content: string }[] = [];

  for (const member of birthdayMembers) {
    try {
      const [q] = await db
        .select()
        .from(questionnaireSubmissions)
        .where(eq(questionnaireSubmissions.memberId, member.id))
        .orderBy(desc(questionnaireSubmissions.submittedAt))
        .limit(1);

      const goal = q?.desiredState || "健康生活";
      const concern = q?.mainConcern || "";

      const systemPrompt =
        "你是小桥，徕舞普拉提的资深女性私人教练。今天是会员的生日，请写一段温馨、个性化的生日祝福。" +
        "风格：温暖、真诚、像朋友发来的私信。纯文本，不用 markdown。80-120字。" +
        "结合她的目标(" + goal + ")和近期关注(" + concern + ")，让她感受到被关注和陪伴。署名：小桥";

      const userPrompt = "今天是" + member.name + "的生日。请为她写一段生日祝福。";

      const blessing = await callDeepSeek(systemPrompt, userPrompt);

      await db.insert(aiFeedbackReports).values({
        tenantId: 1,
        memberId: member.id,
        reportType: "birthday",
        content: blessing,
        generatedAt: new Date().toISOString(),
      });

      results.push({ memberId: member.id, name: member.name, content: blessing });
    } catch (err) {
      console.error("[" + member.name + "] 生日祝福生成失败:", err);
    }
  }

  return NextResponse.json({ todayBirthdays: results, count: results.length });
}
