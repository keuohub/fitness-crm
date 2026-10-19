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

  const systemPrompt = `你是"小桥"，徕舞高定普拉提的女性主理人与资深私人教练。请基于这位女性会员的周期蜕变数据，写一封深情、专业、充满女性人文关怀与情绪共鸣的专属手札。

【核心定位与风格要求】
1. 聚焦女性生命叙事与情绪价值：
   - 杜绝一切健身房机械化套话（严禁出现“打卡”、“蛋白质达标”、“继续坚持保持”等空洞口号）；
   - 关注现代女性在职场与家庭双重压力下的紧绷与不易，赞美她“把身体掌控权重新夺回给自己”的勇气；
   - 强调普拉提带来的“松弛威仪与内在支柱”——骨盆中立回弹、深层核心觉醒、肩颈重担卸下、呼吸深沉入腹、自带从容的大女主气场。
2. 语言质感：
   - 见字如面，如同懂她身心秘密的闺蜜私教在窗边与她促膝长谈；
   - 细腻、有温度、有文学美感，煽动自我偏爱与身体掌控的自豪感。
3. 排版红线：
   - 严禁出现任何 Markdown 标记！绝对不要输出 **粗体星号**、*斜体* 或 # 符号，直接用温润的中文自然段落排版。

手札脉络：
一、见字如面（这段时间对她整个精神状态与松弛身形的深情回顾）
二、身体觉察与体态蜕变（骨盆、肩颈、深层核心的深层变化及其带给生命的笃定感）
三、小桥寄语（一段深深触动她内心的私密温暖赠言，赞颂她的自律与韧性）

署名格式：
—— 小桥 · 徕舞私享手札`;

  const reportText = await callDeepSeek(systemPrompt, userPrompt);
  const cleanReportText = reportText
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[`_]/g, "")
    .trim();

  // 存入数据库
  await db.insert(aiFeedbackReports).values({
    tenantId: 1,
    memberId,
    reportType,
    content: cleanReportText,
    generatedAt: new Date().toISOString(),
  });

  return cleanReportText;
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

// ── 初始评估报告生成 ──
export async function generateInitialAssessment(
  memberId: number
): Promise<string> {
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) throw new Error(`会员 ${memberId} 不存在`);

  const [q] = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(desc(questionnaireSubmissions.submittedAt))
    .limit(1);

  if (!q) throw new Error(`会员 ${memberId} 无问卷数据`);

  // 训练记录
  const allTrainings = await db
    .select()
    .from(trainings)
    .where(eq(trainings.memberId, memberId))
    .orderBy(desc(trainings.trainingDate));

  const trainingSummary =
    allTrainings.length > 0
      ? allTrainings
          .map((t) => `${t.trainingDate} | ${t.type} | ${t.durationMinutes ?? "?"}分钟${t.focusArea ? ` | ${t.focusArea}` : ""}`)
          .join("\n")
      : "尚无训练记录";

  const systemPrompt = `你是"小桥"，徕舞普拉提的资深女性私人教练，钟祥徕舞女子塑形馆主理人，11年专注于女性身体管理。请基于会员的初次问卷数据，生成一份专业、温暖、像闺蜜聊天的初始评估报告。

风格要求：
- 语气像闺蜜聊天，专业但不冷漠
- 永远先肯定再建议
- 用数据说话但不说教
- 禁止制造焦虑
- 纯文本输出，不使用 markdown

报告结构：

一、关于你的身体数据
- 体重、BMI（身体质量指数）、在健康区间的位置
- 每个数字必须有量化解读
- 身体数据的结论要落到训练方向上

二、饮食与代谢分析
- 三餐复盘：逐餐写蛋白质估算 + 结构评价
- 全天蛋白质估算 + 与建议量的缺口
- 亮点（好的习惯）+ 需改善的
- 喝水情况

三、身体症状与内在联系
- 症状之间的因果链（如久坐与骨盆、肩颈紧张与呼吸代偿）
- 体态问题的根源分析，温暖解构，强调“这不是你的错，是身体在替你承受生活”
- 没有的症状也是身体的坚韧资产

四、你的独特优势
- 3-5条，用短句，关联到训练可行性与骨骼潜能
- 真诚肯定，不夸张、不编造

五、为你定制的专属三阶蜕变规划
- 第一阶段（第1-10节）· 觉知与舒展：横膈膜深层呼吸重塑，腹横肌唤醒，骨盆中立位回弹，卸下日常耸肩与腰椎代偿
- 第二阶段（第11-30节）· 激活与精雕：针对核心困扰（如减脂、直角肩、天鹅颈、紧致臀腿）一对一器械精雕，重塑肌肉线条走向
- 第三阶段（第31节及以后）· 掌控与终生优雅：挺拔成为无需刻意的骨骼潜意识，拥有大女主从容自律气场

六、未来的身心展望
- 生动描绘完成蜕变后的身体质感：晨起不再肩背酸沉，穿衣自然凸显骨相挺拔，举手投足松弛有力

七、就算问题解决了，坚持的意义是什么？（人文关怀与深度共情）
- 真诚解答学员常问的“练好之后还要不要练”：解决问题只是相遇的起点。普拉提从来不是为了外界审视，而是在快节奏世界里为自己留一张安放身心的核心床。每一次肌肉延展，都是对自我生命的最高偏爱。自律成骨骼，岁月即礼赞。小桥与徕舞会一直陪伴你每一步成长。

署名格式：
—— 小桥 · 专属私教手札`;

  const userPrompt = `请为以下会员生成初始评估报告：

【基本信息】
姓名：${member.name}
年龄：${q.age ?? "未填写"}岁
身高：${q.height ?? "未填写"}cm
体重：${q.weight ?? "未填写"}kg
职业：${q.occupation || "未填写"}
工作状态：${q.workStatus || "未填写"}

【运动习惯】
运动频率：${q.exerciseFrequency || "未填写"}

【身体困扰】
主要困扰：${q.mainConcern || "未填写"}
水肿：${q.edema || "未填写"}
疲劳：${q.fatigue || "未填写"}
肩颈痛：${q.shoulderNeckPain || "未填写"}
腰痛：${q.backPain || "未填写"}
精力不足：${q.lowEnergy || "未填写"}
便秘：${q.constipation || "未填写"}
久坐：${q.sedentary || "未填写"}
焦虑：${q.anxiety || "未填写"}

【饮食情况】
早餐：${q.breakfast || "未填写"}
午餐：${q.lunch || "未填写"}
晚餐：${q.dinner || "未填写"}
外卖：${q.takeout || "未填写"}
含糖饮料：${q.sugaryDrinks || "未填写"}
夜宵：${q.lateSnack || "未填写"}
暴食时段：${q.bingeTime || "未填写"}
节食史：${q.dietHistory || "未填写"}
喝水量：${q.waterIntake || "未填写"}
食欲：${q.cravings || "未填写"}

【睡眠】
入睡时间：${q.bedtime || "未填写"}
日均睡眠：${q.avgSleep ?? "未填写"}小时

【生理期】
月经规律：${q.menstrualRegular || "未填写"}
经期暴食：${q.menstrualBinge || "未填写"}
经期水肿：${q.menstrualEdema || "未填写"}

【目标与投入】
想要的改变：${q.desiredState || "未填写"}
愿意投入多久：${q.commitment || "未填写"}

【训练记录】
${trainingSummary}`;

  const reportText = await callDeepSeek(systemPrompt, userPrompt);

  // 存入数据库
  await db.insert(aiFeedbackReports).values({
    tenantId: 1,
    memberId,
    reportType: "initial_assessment",
    content: reportText,
    generatedAt: new Date().toISOString(),
    questionnaireData: JSON.stringify(q),
  });

  return reportText;
}

// ── 批量生成初始评估 ──
export async function batchGenerateInitialAssessments(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: { memberId: number; name: string; status: string; message: string }[];
}> {
  const results: { memberId: number; name: string; status: string; message: string }[] = [];
  let succeeded = 0;
  let failed = 0;

  // 找出有问卷但还没有 initial_assessment 的会员
  const allMembers = await db.select().from(members);

  for (const member of allMembers) {
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

      // 检查是否已有 initial_assessment
      const [existing] = await db
        .select()
        .from(aiFeedbackReports)
        .where(
          and(
            eq(aiFeedbackReports.memberId, member.id),
            eq(aiFeedbackReports.reportType, "initial_assessment")
          )
        )
        .limit(1);
      if (existing) {
        results.push({ memberId: member.id, name: member.name, status: "skipped", message: "已有初始评估" });
        continue;
      }

      console.log(`[${member.name}] 生成初始评估...`);
      await generateInitialAssessment(member.id);
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
