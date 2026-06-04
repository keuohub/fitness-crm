import { db } from "@/db";
import {
  members,
  questionnaireSubmissions,
  trainings,
  photos,
  aiFeedbackReports,
  memberMemories,
  dailyHealthLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── 日期工具 ───

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Drizzle + better-sqlite3 类型兼容辅助 ───
// returning() 在 better-sqlite3 下返回类型为 any[] | RunResult，
// TS 无法收窄，这里统一用 any 绕过。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

// ─── 主流程 ───

async function seed() {
  console.log("开始创建陈知意 399天完整数据...\n");

  // ── 1. 清理旧数据 ──
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.name, "陈知意"));

  if (existing.length > 0) {
    const mid = existing[0].id;
    await db.delete(questionnaireSubmissions).where(eq(questionnaireSubmissions.memberId, mid));
    await db.delete(trainings).where(eq(trainings.memberId, mid));
    await db.delete(photos).where(eq(photos.memberId, mid));
    await db.delete(aiFeedbackReports).where(eq(aiFeedbackReports.memberId, mid));
    await db.delete(memberMemories).where(eq(memberMemories.memberId, mid));
    await db.delete(dailyHealthLogs).where(eq(dailyHealthLogs.memberId, mid));
    await db.delete(members).where(eq(members.id, mid));
    console.log("  已清理旧数据");
  }

  // ── 2. 会员 ──
  const [member]: AnyRow[] = await db
    .insert(members)
    .values({
      tenantId: 1,
      name: "陈知意",
      gender: "female",
      phone: "13800001111",
      birthday: "1995-03-15",
      joinedAt: "2025-06-01",
      memberCode: "0010",
      status: "active",
      tags: JSON.stringify(["减脂", "体态矫正", "产后恢复"]),
      stage: "active",
      notes: "产后一年开始系统训练，目标减脂塑形、改善体态。工作为互联网产品经理，久坐。",
    })
    .returning() as AnyRow[];

  const memberId = member.id;
  console.log(`  会员已创建: ${member.name} (ID: ${memberId})`);

  // ── 3. 问卷（3份）──

  const [q1]: AnyRow[] = await db
    .insert(questionnaireSubmissions)
    .values({
      memberId,
      tenantId: 1,
      name: "陈知意",
      age: 30,
      height: 163,
      weight: 68,
      avgSleep: 6.5,
      occupation: "互联网产品经理",
      workStatus: "久坐办公",
      exerciseFrequency: "几乎不运动",
      mainConcern: "产后腹部松弛、背痛",
      edema: "下午腿部轻微浮肿",
      fatigue: "经常疲劳",
      shoulderNeckPain: "经常",
      backPain: "经常",
      lowEnergy: "经常",
      constipation: "偶尔",
      sedentary: "是",
      anxiety: "偶尔",
      bedtime: "23:30",
      breakfast: "面包+牛奶",
      lunch: "外卖简餐",
      dinner: "米饭+家常菜",
      takeout: "每周3-4次",
      sugaryDrinks: "奶茶每周2杯",
      lateSnack: "偶尔",
      bingeTime: "晚上9点后",
      dietHistory: "尝试过节食减肥，反弹明显",
      waterIntake: "约800ml/天",
      cravings: "甜食、碳水",
      menstrualRegular: "是",
      menstrualBinge: "偶尔",
      menstrualEdema: "是",
      desiredState: "恢复产前体型，穿回M码，精力充沛",
      commitment: "每周至少来2次",
    })
    .returning() as AnyRow[];

  const [q2]: AnyRow[] = await db
    .insert(questionnaireSubmissions)
    .values({
      memberId,
      tenantId: 1,
      name: "陈知意",
      age: 30,
      height: 163,
      weight: 64,
      avgSleep: 7,
      occupation: "互联网产品经理",
      workStatus: "久坐办公",
      exerciseFrequency: "每周2-3次",
      mainConcern: "背痛明显改善，腹部仍需加强",
      edema: "偶尔轻微浮肿",
      fatigue: "偶尔",
      shoulderNeckPain: "偶尔",
      backPain: "明显改善",
      lowEnergy: "偶尔",
      constipation: "基本没有",
      sedentary: "是",
      anxiety: "很少",
      bedtime: "23:00",
      breakfast: "鸡蛋+全麦面包+豆浆",
      lunch: "自带便当（鸡胸肉+蔬菜+杂粮饭）",
      dinner: "米饭+家常菜",
      takeout: "每周1-2次",
      sugaryDrinks: "奶茶每周1杯",
      lateSnack: "很少",
      bingeTime: "很少",
      dietHistory: "正在学习均衡饮食",
      waterIntake: "约1200ml/天",
      cravings: "偶尔想吃甜食",
      menstrualRegular: "是",
      menstrualBinge: "很少",
      menstrualEdema: "偶尔",
      desiredState: "体重降到60kg以下，腹部线条明显",
      commitment: "继续保持每周2-3次",
    })
    .returning() as AnyRow[];

  const [q3]: AnyRow[] = await db
    .insert(questionnaireSubmissions)
    .values({
      memberId,
      tenantId: 1,
      name: "陈知意",
      age: 31,
      height: 163,
      weight: 61,
      avgSleep: 7.5,
      occupation: "互联网产品经理",
      workStatus: "久坐办公",
      exerciseFrequency: "每周3次固定训练",
      mainConcern: "体型改善明显，信心增强，希望进一步塑形",
      edema: "基本没有",
      fatigue: "精力充沛",
      shoulderNeckPain: "基本没有",
      backPain: "已经没有",
      lowEnergy: "基本没有",
      constipation: "没有",
      sedentary: "是",
      anxiety: "很少",
      bedtime: "22:30",
      breakfast: "鸡蛋+牛油果+全麦面包+黑咖啡",
      lunch: "自带便当（三文鱼+藜麦沙拉）",
      dinner: "蛋白质+蔬菜，米饭减半",
      takeout: "每周0-1次",
      sugaryDrinks: "基本不喝",
      lateSnack: "不吃",
      bingeTime: "不吃夜宵",
      dietHistory: "已建立稳定的健康饮食习惯",
      waterIntake: "约1800ml/天",
      cravings: "很少",
      menstrualRegular: "是",
      menstrualBinge: "基本没有",
      menstrualEdema: "基本没有",
      desiredState: "练出马甲线，体脂率降到25%以下",
      commitment: "坚持每周3次，挑战更高强度",
    })
    .returning() as AnyRow[];

  // 更新时间戳（问卷的 submittedAt 是 default 值，需手动覆盖）
  await db.update(questionnaireSubmissions).set({ submittedAt: "2025-06-01 10:30:00" } as AnyRow).where(eq(questionnaireSubmissions.id, q1.id));
  await db.update(questionnaireSubmissions).set({ submittedAt: "2025-09-01 14:00:00" } as AnyRow).where(eq(questionnaireSubmissions.id, q2.id));
  await db.update(questionnaireSubmissions).set({ submittedAt: "2025-12-01 11:00:00" } as AnyRow).where(eq(questionnaireSubmissions.id, q3.id));

  await db.update(members).set({ currentQuestionnaireId: q3.id } as AnyRow).where(eq(members.id, memberId));
  console.log("  问卷已创建: 3 份");

  // ── 4. 训练记录（52次）──

  interface TrainingDef {
    date: string;
    type: string;
    duration: number;
    focus: string;
    notes?: string;
  }

  const trainingDefs: TrainingDef[] = [];

  function t(date: string, type: string, duration: number, focus: string, notes?: string) {
    trainingDefs.push({ date, type, duration, focus, notes });
  }

  // 第1-6次（2025年6月）
  t("2025-06-01", "assessment", 60, "全身评估", "首次体态评估，发现骨盆前倾、圆肩、核心力量薄弱");
  t("2025-06-04", "private", 50, "核心激活", "学习腹式呼吸，激活深层核心");
  t("2025-06-08", "private", 50, "核心+臀桥", "核心稳定性训练，臀桥激活臀肌");
  t("2025-06-11", "private", 55, "上肢拉伸+核心", "改善圆肩，胸椎灵活性训练");
  t("2025-06-15", "private", 55, "下肢排列", "足弓激活，改善膝内扣");
  t("2025-06-18", "group", 60, "垫上普拉提", "团体课初体验，节奏适应中");

  // 第7次
  t("2025-06-22", "private", 60, "核心+髋关节", "髋关节灵活性明显提升");

  // 第8-14次：连续7天打卡（2025-07-07 ~ 07-13）
  t("2025-07-07", "private", 50, "上肢+核心", "连续打卡第1天");
  t("2025-07-08", "group", 45, "流瑜伽", "连续打卡第2天");
  t("2025-07-09", "private", 55, "下肢力量", "连续打卡第3天");
  t("2025-07-10", "private", 50, "核心强化", "平板支撑突破60秒");
  t("2025-07-11", "group", 60, "普拉提器械", "连续打卡第5天");
  t("2025-07-12", "private", 45, "拉伸恢复", "主动恢复日");
  t("2025-07-13", "private", 55, "全身整合", "连续7天打卡挑战完成");

  // 第15-22次（7月中-8月）
  t("2025-07-20", "private", 60, "核心+背", "背部力量明显增强");
  t("2025-07-27", "group", 60, "垫上普拉提", "");
  t("2025-08-03", "private", 60, "臀腿强化", "深蹲模式改善");
  t("2025-08-10", "private", 55, "核心+旋转", "加入旋转控制训练");
  t("2025-08-17", "group", 60, "普拉提器械", "");
  t("2025-08-24", "private", 65, "全身力量", "开始加入轻负荷");
  t("2025-08-31", "private", 60, "核心+平衡", "单腿稳定性提升");

  // 第23-32次（9-10月）
  t("2025-09-07", "assessment", 60, "3个月复评", "阶段性评估：体重-4kg，背痛消失");
  t("2025-09-14", "private", 60, "上肢+核心", "俯卧撑从跪姿升级到标准");
  t("2025-09-21", "group", 60, "流瑜伽", "");
  t("2025-09-28", "private", 65, "下肢力量", "单腿蹲稳定");
  t("2025-10-05", "private", 60, "核心+旋转", "");
  t("2025-10-12", "group", 60, "普拉提器械", "");
  t("2025-10-19", "private", 65, "全身整合", "运动模式自动化");
  t("2025-10-26", "private", 60, "臀腿+核心", "臀桥负重10kg");
  t("2025-11-02", "group", 60, "垫上普拉提", "");
  t("2025-11-09", "private", 60, "核心+背", "");

  // 第33-42次（11-12月）
  t("2025-11-16", "private", 65, "下肢排列", "");
  t("2025-11-23", "assessment", 60, "6个月复评", "体重-7kg，骨盆位置趋于中立");
  t("2025-11-30", "private", 60, "全身力量", "");
  t("2025-12-07", "group", 60, "普拉提器械", "");
  t("2025-12-14", "private", 65, "核心+旋转", "");
  t("2025-12-21", "private", 60, "臀腿强化", "");
  t("2025-12-28", "group", 60, "流瑜伽", "年末最后一课");

  // 第43-50次（2026年1-3月）
  t("2026-01-04", "private", 60, "新年开训", "2026第一练");
  t("2026-01-11", "private", 65, "上肢+核心", "标准俯卧撑10个");
  t("2026-01-18", "group", 60, "普拉提器械", "");
  t("2026-01-25", "private", 60, "下肢力量", "");
  t("2026-02-01", "private", 65, "核心+旋转", "");
  t("2026-02-08", "group", 60, "垫上普拉提", "");
  t("2026-02-15", "private", 60, "全身整合", "");
  t("2026-02-22", "private", 65, "臀腿+核心", "");
  t("2026-03-01", "assessment", 60, "9个月复评", "体重-9kg，体脂率下降显著");

  // 第50次标记
  t("2026-03-08", "private", 60, "核心+背", "第50次训练里程碑");

  // 剩余2次
  t("2026-03-22", "private", 60, "综合训练", "");
  t("2026-04-05", "group", 60, "垫上普拉提", "");

  for (const td of trainingDefs) {
    await db.insert(trainings).values({
      tenantId: 1,
      memberId,
      coachId: 1,
      trainingDate: td.date,
      durationMinutes: td.duration,
      type: td.type,
      focusArea: td.focus,
      notes: td.notes || null,
    });
  }

  console.log(`  训练记录已创建: ${trainingDefs.length} 次`);

  // ── 5. 体态照片（8张）──
  const photoDefs = [
    { date: "2025-06-01", type: "posture", note: "初始体态记录" },
    { date: "2025-07-01", type: "body", note: "第1个月" },
    { date: "2025-08-01", type: "progress", note: "第2个月" },
    { date: "2025-09-01", type: "posture", note: "3个月对比" },
    { date: "2025-10-01", type: "body", note: "第4个月" },
    { date: "2025-11-01", type: "progress", note: "第5个月" },
    { date: "2025-12-01", type: "posture", note: "6个月对比" },
    { date: "2026-01-01", type: "body", note: "第7个月" },
  ];

  for (const p of photoDefs) {
    await db.insert(photos).values({
      tenantId: 1,
      memberId,
      photoType: p.type,
      filePath: `/member-photos/demo-${memberId}-${p.date}.jpg`,
      takenAt: p.date,
      notes: p.note,
    });
  }

  console.log(`  体态照片已创建: ${photoDefs.length} 张`);

  // ── 6. AI 反馈报告 ──

  // Daily（20条）
  const dailyDates = [
    "2025-06-02", "2025-06-08", "2025-06-15", "2025-06-22", "2025-06-29",
    "2025-07-14", "2025-07-21", "2025-07-28", "2025-08-15", "2025-09-01",
    "2025-09-15", "2025-10-01", "2025-10-15", "2025-11-01", "2025-11-15",
    "2025-12-01", "2025-12-15", "2026-01-01", "2026-01-15", "2026-02-01",
  ];

  for (const d of dailyDates) {
    await db.insert(aiFeedbackReports).values({
      tenantId: 1,
      memberId,
      reportType: "daily",
      content: `${d} 每日关怀：陈知意训练状态良好，核心控制持续提升。饮食蛋白质摄入达标，继续保持。`,
      generatedAt: `${d}T08:00:00`,
    });
  }

  // Weekly（4条）
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "weekly",
    content: "本周总结（6月第1周）：适应阶段，核心激活训练效果初显。建议下周增加一次团体课培养兴趣。",
    generatedAt: "2025-06-08T08:00:00",
  });
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "weekly",
    content: "本周总结（7月第2周）：连续7天打卡里程碑达成。训练频率和强度都在理想范围。",
    generatedAt: "2025-07-14T08:00:00",
  });
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "weekly",
    content: "本周总结（9月第1周）：3个月复评优秀，体重-4kg，核心力量跨越式提升。建议进入力量进阶。",
    generatedAt: "2025-09-08T08:00:00",
  });
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "weekly",
    content: "本周总结（1月第1周）：新年首练状态极佳，标准俯卧撑突破10个。",
    generatedAt: "2026-01-05T08:00:00",
  });

  // Monthly（3条）
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "monthly",
    content: "6月月度总结：入会第一个月，从零基础到建立训练习惯。核心激活、呼吸模式初步掌握。体重-2kg。",
    generatedAt: "2025-07-01T08:00:00",
  });
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "monthly",
    content: "9月月度总结：训练满3个月，累计减重4kg。背痛消失，圆肩改善。饮食从外卖转型为自带健康餐。",
    generatedAt: "2025-10-01T08:00:00",
  });
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "monthly",
    content: "12月月度总结：入会半年，体重68kg降至61kg，累计减重7kg。骨盆趋于中立，核心力量达预期。",
    generatedAt: "2026-01-01T08:00:00",
  });

  // Quarterly（1条）
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "quarterly",
    content: "第一季度总结（6-8月）：从评估到适应到突破。核心从零到平板支撑60秒。体重-4kg，背痛消失。",
    generatedAt: "2025-09-01T08:00:00",
  });

  // Yearly（1条）
  await db.insert(aiFeedbackReports).values({
    tenantId: 1, memberId, reportType: "yearly",
    content: "一周年年度总结（2025.6 - 2026.6）：\n\n这一年，你完成了从产后恢复到重获力量的蜕变。\n\n数字见证：体重68kg→61kg，累计减重7kg。52次训练，从核心激活到标准俯卧撑。8张体态照片记录下每一个变化。\n\n你已经不是一年前的自己了。骨盆前倾改善、圆肩消失、背痛不再。更重要的是，你建立起了可持续的健康生活习惯——自己做饭、规律训练、早睡早起。\n\n下一个目标：马甲线，我们一起去实现。",
    generatedAt: "2026-06-01T08:00:00",
  });

  const aiTotal = dailyDates.length + 4 + 3 + 1 + 1;
  console.log(`  AI反馈已创建: daily ${dailyDates.length} + weekly 4 + monthly 3 + quarterly 1 + yearly 1 = ${aiTotal} 条`);

  // ── 7. 会员记忆（6条）──
  const memoryDefs = [
    {
      type: "milestone" as const,
      content: "入会第一天，完成首次体态评估。骨盆前倾、圆肩、核心力量薄弱是三大重点区域。",
      structured: null as string | null,
      date: "2025-06-01 11:00:00",
    },
    {
      type: "note" as const,
      content: "第一次团体课后主动询问普拉提器械使用方法，学习意愿很强。",
      structured: null,
      date: "2025-06-18 15:00:00",
    },
    {
      type: "milestone" as const,
      content: "连续训练7天达成。平板支撑突破60秒，她自己也很惊喜。",
      structured: '{"streak":7}',
      date: "2025-07-13 17:00:00",
    },
    {
      type: "preference" as const,
      content: "偏爱普拉提器械课。喜欢练后喝拿铁。对音乐有要求，喜欢轻音乐。",
      structured: '{"favorite":"普拉提器械","drink":"拿铁","music":"轻音乐"}',
      date: "2025-09-01 12:00:00",
    },
    {
      type: "ai_summary" as const,
      content: "3个月AI总结：训练习惯已建立，饮食转型成功，体重-4kg。建议进入力量进阶。",
      structured: null,
      date: "2025-09-08 08:00:00",
    },
    {
      type: "milestone" as const,
      content: "入会一周年。52次训练，从产后恢复到自信满满。她说这里像第二个家。",
      structured: '{"anniversary":true,"totalTrainings":52,"weightChange":-7}',
      date: "2026-06-01 10:00:00",
    },
  ];

  for (const m of memoryDefs) {
    const [row]: AnyRow[] = await db
      .insert(memberMemories)
      .values({
        tenantId: 1,
        memberId,
        memoryType: m.type,
        content: m.content,
        structuredData: m.structured,
        createdBy: 1,
      })
      .returning() as AnyRow[];

    await db
      .update(memberMemories)
      .set({ createdAt: m.date } as AnyRow)
      .where(eq(memberMemories.id, row.id));
  }

  console.log(`  会员记忆已创建: ${memoryDefs.length} 条`);

  // ── 8. 每日健康日志（15条）──
  const healthDefs = [
    { logDate: "2025-06-07", weight: 67.5, sleepHours: 6.5, stressLevel: 3, energyLevel: 3, painAreas: "肩颈、下背", notes: "第一周适应期，身体有些酸痛" },
    { logDate: "2025-06-14", weight: 67, sleepHours: 7, stressLevel: 2, energyLevel: 3, painAreas: "肩颈", notes: "睡眠开始改善" },
    { logDate: "2025-06-28", weight: 66.5, sleepHours: 7, stressLevel: 2, energyLevel: 4, painAreas: null, notes: "精力明显提升" },
    { logDate: "2025-07-13", weight: 66, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "连续打卡最后一天，状态极佳" },
    { logDate: "2025-08-01", weight: 65.5, sleepHours: 7.5, stressLevel: 2, energyLevel: 4, painAreas: null, notes: "暑假坚持训练" },
    { logDate: "2025-08-30", weight: 65, sleepHours: 7, stressLevel: 2, energyLevel: 4, painAreas: null, notes: "体重稳定下降" },
    { logDate: "2025-09-15", weight: 64, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "3个月复评后信心大增" },
    { logDate: "2025-10-15", weight: 63.5, sleepHours: 7, stressLevel: 2, energyLevel: 4, painAreas: null, notes: "" },
    { logDate: "2025-11-15", weight: 62.5, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "" },
    { logDate: "2025-12-15", weight: 61.5, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "体重接近目标" },
    { logDate: "2026-01-15", weight: 61, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "新年目标：马甲线" },
    { logDate: "2026-02-15", weight: 61, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "体重稳定61kg" },
    { logDate: "2026-03-15", weight: 60.8, sleepHours: 7.5, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "即将突破60kg" },
    { logDate: "2026-04-15", weight: 60.5, sleepHours: 8, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "睡眠质量持续优秀" },
    { logDate: "2026-05-15", weight: 60.2, sleepHours: 8, stressLevel: 1, energyLevel: 5, painAreas: null, notes: "接近一周年，状态巅峰" },
  ];

  for (const h of healthDefs) {
    await db.insert(dailyHealthLogs).values({
      tenantId: 1,
      memberId,
      logDate: h.logDate,
      weight: h.weight,
      sleepHours: h.sleepHours,
      stressLevel: h.stressLevel,
      energyLevel: h.energyLevel,
      painAreas: h.painAreas,
      notes: h.notes,
    });
  }

  console.log(`  每日健康日志已创建: ${healthDefs.length} 条`);

  // ── 汇总 ──
  console.log("\n" + "=".repeat(50));
  console.log("陈知意 399天完整数据已创建");
  console.log("=".repeat(50));
  console.log(`  会员:        1 人`);
  console.log(`  问卷:        3 份`);
  console.log(`  训练记录:    ${trainingDefs.length} 次`);
  console.log(`  体态照片:    ${photoDefs.length} 张`);
  console.log(`  AI反馈:      ${aiTotal} 条`);
  console.log(`  会员记忆:    ${memoryDefs.length} 条`);
  console.log(`  健康日志:    ${healthDefs.length} 条`);
  console.log("=".repeat(50));
  console.log("\n触发里程碑:");
  console.log("  第10次训练");
  console.log("  第50次训练");
  console.log("  连续7天打卡 (2025-07-07 ~ 2025-07-13)");
  console.log("  首次AI反馈");
  console.log("  体重变化 >2kg (68 -> 64 -> 61)");
  console.log("  累计5张照片");
}

seed().catch((e) => {
  console.error("脚本执行失败:", e);
  process.exit(1);
});
