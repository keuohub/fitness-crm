import { db } from "@/db";
import {
  members,
  questionnaireSubmissions,
  trainings,
  aiFeedbackReports,
  photos,
  memberMemories,
} from "@/db/schema";
import { eq, gte, desc, and } from "drizzle-orm";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// ── 报告类型 → 天数映射 ──
const REPORT_DAYS: Record<string, number> = {
  weekly: 7,
  "15days": 15,
  monthly: 30,
  quarterly: 90,
  semiyearly: 180,
  yearly: 365,
};

const REPORT_LABELS: Record<string, string> = {
  weekly: "周报",
  "15days": "15日总结",
  monthly: "月报",
  quarterly: "季度总结",
  semiyearly: "半年总结",
  yearly: "年度总结",
};

// ── DeepSeek 调用 ──
async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API 错误 ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 返回空内容");
  return content.trim();
}

// ── 生成单会员周期报告 ──
export async function generatePeriodReport(
  memberId: number,
  reportType: string
): Promise<string> {
  const days = REPORT_DAYS[reportType];
  if (!days) throw new Error(`不支持的报告类型: ${reportType}`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  // a. 会员信息
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) throw new Error(`会员 ${memberId} 不存在`);

  // 最新问卷
  const [latestQ] = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(desc(questionnaireSubmissions.submittedAt))
    .limit(1);

  // 最早问卷（用于对比）
  const [earliestQ] = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(questionnaireSubmissions.submittedAt)
    .limit(1);

  // b. 训练记录
  const periodTrainings = await db
    .select()
    .from(trainings)
    .where(
      and(
        eq(trainings.memberId, memberId),
        gte(trainings.trainingDate, startStr)
      )
    )
    .orderBy(desc(trainings.trainingDate));

  // c. AI 每日反馈
  const periodFeedbacks = await db
    .select()
    .from(aiFeedbackReports)
    .where(
      and(
        eq(aiFeedbackReports.memberId, memberId),
        eq(aiFeedbackReports.reportType, "daily"),
        gte(aiFeedbackReports.generatedAt, startStr)
      )
    )
    .orderBy(desc(aiFeedbackReports.createdAt));

  // d. 照片
  const periodPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.memberId, memberId),
        gte(photos.takenAt, startStr)
      )
    );

  // e. 最近记忆
  const recentMemories = await db
    .select()
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(desc(memberMemories.createdAt))
    .limit(5);

  // ── 组装 User Prompt ──
  const q = latestQ;
  const eq_ = earliestQ;

  const trainingSummary =
    periodTrainings.length > 0
      ? periodTrainings
          .map(
            (t) =>
              `${t.trainingDate} | ${t.type} | ${t.durationMinutes ?? "?"}分钟${t.focusArea ? ` | 重点: ${t.focusArea}` : ""}${t.notes ? ` | ${t.notes}` : ""}`
          )
          .join("\n")
      : "该时间段内无训练记录";

  const feedbackSummary =
    periodFeedbacks.length > 0
      ? periodFeedbacks
          .map((f) => `[${f.generatedAt?.slice(0, 10)}] ${f.content?.slice(0, 200)}...`)
          .join("\n---\n")
      : "无";

  const memorySummary =
    recentMemories.length > 0
      ? recentMemories
          .map((m) => `[${m.memoryType}] ${m.content || ""}`.trim())
          .filter(Boolean)
          .join("\n")
      : "无";

  const userPrompt = `请为以下会员生成一份 ${REPORT_LABELS[reportType] || reportType}（${startStr} 至 ${todayStr}）：

【基本信息】
姓名：${member.name}
联系电话：${member.phone || "未填写"}
${q ? `身高：${q.height ?? "?"}cm，体重：${q.weight ?? "?"}kg` : "无问卷数据"}
${eq_ && q && eq_.id !== q.id ? `最早问卷 (${eq_.submittedAt}) 体重：${eq_.weight ?? "?"}kg → 最新 (${q.submittedAt}) 体重：${q.weight ?? "?"}kg` : ""}
${q ? `目标：${q.desiredState || "未填写"}\n主要困扰：${q.mainConcern || "未填写"}\n运动频率：${q.exerciseFrequency || "未填写"}\n日均睡眠：${q.avgSleep ?? "?"}小时` : ""}

【训练记录（${periodTrainings.length} 次）】
${trainingSummary}

【AI 每日反馈摘要（${periodFeedbacks.length} 条）】
${feedbackSummary}

【照片记录】
该时间段上传 ${periodPhotos.length} 张照片

【近期记忆】
${memorySummary}`;

  const systemPrompt = `你是"小桥"，徕舞普拉提的资深女性私人教练。请基于会员的周期数据，生成一份专业、温暖的结构化总结报告。

风格：像和老朋友复盘这段时间的变化。数据要量化解读，变化要有因果关系分析。纯文本输出，不用 markdown。

报告结构：

一、总体回顾
- 报告时间段 + 训练出勤情况 + 整体状态概述

二、身体变化
- 如果有多份问卷，对比体重/BMI/睡眠变化趋势
- 变化了多少，意味着什么

三、训练成果
- 训练次数、类型分布、重点突破的肌群或能力
- 没有训练记录时也要诚实说明

四、生活状态
- 睡眠、饮食、情绪趋势
- 从每日反馈中提取的关键信号

五、优势与成长
- 这段时间她做得好的地方
- 值得肯定的进步，哪怕很小

六、下阶段建议
- 接下来 1-2 周该关注什么
- 具体、可执行

七、小桥寄语
- 一段温暖的私密话，像给朋友写信
- 不提具体课程和动作名称

署名格式：
—— 小桥 · ${REPORT_LABELS[reportType] || reportType} · ${startStr} — ${todayStr}`;

  const reportText = await callDeepSeek(systemPrompt, userPrompt);

  // 存入数据库
  await db.insert(aiFeedbackReports).values({
    tenantId: 1,
    memberId,
    reportType,
    content: reportText,
    generatedAt: new Date().toISOString(),
  });

  return reportText;
}

// ── 批量生成 ──
export async function batchGenerateReports(reportType: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: { memberId: number; name: string; status: string; message: string }[];
}> {
  const results: { memberId: number; name: string; status: string; message: string }[] = [];
  let succeeded = 0;
  let failed = 0;

  const activeMembers = await db
    .select()
    .from(members)
    .where(eq(members.status, "active"));

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const member of activeMembers) {
    try {
      // 检查是否有问卷
      const [q] = await db
        .select()
        .from(questionnaireSubmissions)
        .where(eq(questionnaireSubmissions.memberId, member.id))
        .limit(1);
      if (!q) {
        results.push({ memberId: member.id, name: member.name, status: "skipped", message: "无问卷" });
        continue;
      }

      // 检查今天是否已有同类型报告
      const [existing] = await db
        .select()
        .from(aiFeedbackReports)
        .where(
          and(
            eq(aiFeedbackReports.memberId, member.id),
            eq(aiFeedbackReports.reportType, reportType),
            gte(aiFeedbackReports.generatedAt, todayStr)
          )
        )
        .limit(1);
      if (existing) {
        results.push({ memberId: member.id, name: member.name, status: "skipped", message: "今日已有" });
        continue;
      }

      console.log(`[${member.name}] 生成 ${REPORT_LABELS[reportType]}...`);
      await generatePeriodReport(member.id, reportType);
      console.log(`[${member.name}] 完成 ✓`);
      results.push({ memberId: member.id, name: member.name, status: "success", message: "生成成功" });
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      console.error(`[${member.name}] 失败: ${msg}`);
      results.push({ memberId: member.id, name: member.name, status: "error", message: msg });
      failed++;
    }
  }

  return { processed: results.length, succeeded, failed, results };
}
