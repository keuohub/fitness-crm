import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, trainings, coachNotes, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq, gte, lte, desc, and } from "drizzle-orm";
import { getValidAdminSession } from "@/lib/auth/admin-session";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

async function callDeepSeek(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "";
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: "你是小桥，温暖真诚的女性健身教练。说话像朋友聊天。" },{ role: "user", content: prompt }], temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!response.ok) return "";
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(request: NextRequest) {
  const admin = await getValidAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    const { memberId, reportType } = await request.json();
    if (!memberId) return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });

    const [member] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.id, memberId));
    if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

    const [q] = await db.select({ desiredState: questionnaireSubmissions.desiredState }).from(questionnaireSubmissions).where(eq(questionnaireSubmissions.memberId, memberId)).orderBy(desc(questionnaireSubmissions.submittedAt)).limit(1);

    const now = new Date();
    const isMonthly = reportType === "monthly";
    const daysBack = isMonthly ? 30 : 7;
    const startDate = new Date(now.getTime() - daysBack * 86400000).toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);
    const prevStart = new Date(now.getTime() - daysBack * 2 * 86400000).toISOString().slice(0, 10);

    const recentTrainings = await db.select({ trainingDate: trainings.trainingDate, type: trainings.type, focusArea: trainings.focusArea }).from(trainings).where(and(eq(trainings.memberId, memberId), gte(trainings.trainingDate, startDate), lte(trainings.trainingDate, endDate))).orderBy(desc(trainings.trainingDate));

    const prevTrainings = await db.select({ id: trainings.id }).from(trainings).where(and(eq(trainings.memberId, memberId), gte(trainings.trainingDate, prevStart), lte(trainings.trainingDate, startDate)));

    const recentNotes = await db.select({ aiMessage: coachNotes.aiMessage }).from(coachNotes).where(and(eq(coachNotes.memberId, memberId), gte(coachNotes.createdAt, startDate))).orderBy(desc(coachNotes.createdAt)).limit(5);

    const coachMsgs = recentNotes.map(n => n.aiMessage || "").filter(Boolean);
    const trainingData = recentTrainings.map(t => ({ date: t.trainingDate, type: t.type || "训练", focus: t.focusArea || "" }));
    const goal = q?.desiredState || "";

    let prompt = "";
    if (isMonthly) {
      prompt = `你是小桥，徕舞女子塑形馆的教练。请为${member.name}写月度总结（不超过500字）。\n\n她的目标：${goal}\n本月训练${recentTrainings.length}次（上月${prevTrainings.length}次）\n训练记录：\n${trainingData.map(t => `  ${t.date} | ${t.type} | ${t.focus}`).join("\n")}\n教练观察：\n${coachMsgs.map(m => `  "${m}"`).join("\n")}\n\n结构：一、本月概览 二、身体在悄悄改变 三、关于你的目标 四、下月方向\n规则：不提AI/系统/数据/算法，温柔有力量，署名小桥`;
    } else {
      prompt = `你是小桥，徕舞女子塑形馆的教练。请为${member.name}写本周周报（不超过350字）。\n\n她的目标：${goal}\n本周训练${recentTrainings.length}次（上周${prevTrainings.length}次）\n训练记录：\n${trainingData.map(t => `  ${t.date} | ${t.type} | ${t.focus}`).join("\n")}\n教练观察：\n${coachMsgs.map(m => `  "${m}"`).join("\n")}\n\n结构：一、本周回顾 二、你的变化 三、小桥想对你说\n规则：不提AI/系统/数据/算法，像闺蜜写的信，署名小桥`;
    }

    const content = await callDeepSeek(prompt, isMonthly ? 1200 : 800);
    const typeLabel = isMonthly ? "月报" : "周报";

    const [inserted] = await db.insert(aiFeedbackReports).values({
      tenantId: 1, memberId, reportType: typeLabel, content, questionnaireData: goal, generatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json({ id: inserted.id, reportType: typeLabel, content, createdAt: inserted.createdAt });
  } catch (err) {
    console.error("weekly-report error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
