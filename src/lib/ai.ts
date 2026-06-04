import { db } from "@/db";
import { members, questionnaireSubmissions, memberMemories, dailyHealthLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `你是一位名叫"小桥"的资深女性私人教练。你拥有多年的女性体态矫正、营养指导和身心整合经验。

你的核心信念是：身体的问题要找根源，而不是盯着表面数字。体重正常的人也可能体态很差，饮食不规律的人训练效果一定打折。

你的写作风格：像朋友聊天一样直接、亲切、不绕弯子。用口语化的专业术语，所有专业名词第一次出现时括号解释。纯文本，不用任何 markdown 标记。每个数字都要有量化解读，不能说"BMI 24.8"，要说"超出标准线0.8个点"。

你必须严格按照以下结构输出反馈，不可跳过任何部分：

标题格式：{姓名} · 每日关怀与建议

正文开头：{姓名}你好，{一句个性化开头，呼应她的目标或数据特点}

一、关于你的身体数据
- 列出体重、BMI，计算BMI = 体重 ÷ (身高米 × 身高米)，BMI 18.5-23.9为正常
- 每个数字必须有量化解读：不能只说"BMI 21.2"，要说"处于正常范围正中间"或"超出标准线X个点"
- 身高对应的健康体重范围
- 睡眠时长和入睡时间的评价
- 结论要落到核心问题上：是体重问题还是体态问题，还是精力问题

二、饮食分析
- 逐餐复盘：早餐、午餐、晚餐各写了什么，蛋白质够不够，碳水是否过量
- 如果只填了"饭"或"米饭"，默认有搭配菜，但碳水占比偏高
- 找出核心饮食问题并分析因果：午餐吃太少→下午饿→晚上暴食→第二天水肿疲劳
- 外卖、奶茶、夜宵、含糖饮料各自评价
- 饮水量量化评价：少于500ml=严重不足，500-1000ml=及格偏少，1000-1500ml=接近达标，1500ml以上=达标
- 如果有节食史或暴食时段，分析其对代谢和情绪的影响
- 亮点（做得好的地方）+ 需要改善的

三、身体症状与内在联系
- 把所有症状串成因果链，用 → 连接
- 水肿、疲劳、肩颈痛、腰痛、精力不足、便秘、焦虑——逐个分析，指向共同根源
- 久坐时长的评价：少于4h=良好，4-8h=注意，8-12h=偏多，12h以上=严重
- 经期状态与水肿、情绪暴食的关联
- 明确指出哪些症状其实是同一个根源问题的不同表现
- 没有的症状也是信息（如"没有腰痛"说明核心基础不差）

四、你的独特优势
- 列出3-5条，用短句，自然关联到训练可行性
- 基于真实数据，不编造、不夸大
- 如：BMI在标准区间、身高比例好、睡眠充足、经期规律、无腰痛等

五、行动建议
- 先说饮食调整：具体、可执行、无压力，不用一刀切
- 再说生活习惯：睡眠、饮水、久坐中断
- 训练放最后：只说方向（如减脂塑形、体态调整、核心重建），不写具体动作
- 自然地引导到"下一步"，如："下一步我们做体态评估""接下来重点关注三餐规律"
- 不推荐走路、散步、在家运动等非馆内行为
- 不写具体课程名称

结尾：用2-3句话总结核心问题和方向，自然收尾。

署名：小桥`;

export async function generateDailyFeedback(memberId: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }

  // 1. 查询会员基本信息
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId));

  if (!member) {
    throw new Error(`会员 ${memberId} 不存在`);
  }

  // 2. 最新问卷
  const [questionnaire] = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(desc(questionnaireSubmissions.submittedAt))
    .limit(1);

  // 3. 最近 3 条记忆
  const recentMemories = await db
    .select()
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(desc(memberMemories.createdAt))
    .limit(3);

  // 4. 最近 7 天健康日志
  const recentHealthLogs = await db
    .select()
    .from(dailyHealthLogs)
    .where(eq(dailyHealthLogs.memberId, memberId))
    .orderBy(desc(dailyHealthLogs.logDate))
    .limit(7);

  // ── 组装 User Prompt ──

  const q = questionnaire;

  const age = q?.age ?? "未知";
  const height = q?.height ?? null;
  const weight = q?.weight ?? null;
  const bmi = height && weight ? (weight / ((height / 100) * (height / 100))).toFixed(1) : null;

  const memoriesText =
    recentMemories.length > 0
      ? recentMemories
          .map(
            (m) =>
              `[${m.memoryType}] ${m.content || ""} ${m.structuredData || ""}`.trim()
          )
          .filter(Boolean)
          .join("\n")
      : "暂无记录";

  const healthLogsText =
    recentHealthLogs.length > 0
      ? recentHealthLogs
          .map(
            (log) =>
              `${log.logDate}: 体重${log.weight ?? "?"}kg, 睡眠${log.sleepHours ?? "?"}h, 压力${log.stressLevel ?? "?"}/5, 精力${log.energyLevel ?? "?"}/5${log.painAreas ? `, 疼痛部位: ${log.painAreas}` : ""}${log.notes ? `, 备注: ${log.notes}` : ""}`
          )
          .join("\n")
      : "暂无记录";

  const userPrompt = `请为以下会员生成每日关怀反馈：

【基本信息】
姓名：${member.name}
年龄：${age}岁
身高：${height ? height + "cm" : "未知"}
体重：${weight ? weight + "kg" : "未知"}
${bmi ? `BMI：${bmi}` : ""}
职业：${q?.occupation || "未填写"}
工作状态：${q?.workStatus || "未填写"}

【目标与困扰】
期望状态：${q?.desiredState || "未填写"}
主要困扰：${q?.mainConcern || "未填写"}

【身体状态】
睡眠：${q?.avgSleep ? q.avgSleep + "小时" : "未填写"}
就寝时间：${q?.bedtime || "未填写"}
疲劳感：${q?.fatigue || "未填写"}
精力不足：${q?.lowEnergy || "未填写"}
水肿：${q?.edema || "未填写"}
肩颈疼痛：${q?.shoulderNeckPain || "未填写"}
腰痛：${q?.backPain || "未填写"}
便秘：${q?.constipation || "未填写"}
每日久坐时长：${q?.sedentary || "未填写"}

【饮食】
早餐：${q?.breakfast || "未填写"}
午餐：${q?.lunch || "未填写"}
晚餐：${q?.dinner || "未填写"}
外卖频率：${q?.takeout || "未填写"}
含糖饮料：${q?.sugaryDrinks || "未填写"}
夜宵：${q?.lateSnack || "未填写"}
暴食时段：${q?.bingeTime || "未填写"}
饮水量：${q?.waterIntake || "未填写"}
食欲偏好：${q?.cravings || "未填写"}
节食/减肥史：${q?.dietHistory || "未填写"}

【心理与运动】
焦虑程度：${q?.anxiety || "未填写"}
运动频率：${q?.exerciseFrequency || "未填写"}

【经期】
规律性：${q?.menstrualRegular || "未填写"}
经期暴食：${q?.menstrualBinge || "未填写"}
经期水肿：${q?.menstrualEdema || "未填写"}

【近期健康日志】
${healthLogsText}

【近期记忆】
${memoriesText}`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek API 返回空内容");
  }

  return content.trim();
}
