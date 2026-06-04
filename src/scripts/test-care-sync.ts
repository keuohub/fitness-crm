/**
 * 测试脚本：模拟飞书四张关怀表数据同步
 *
 * 用法：
 *   npx tsx src/scripts/test-care-sync.ts
 *
 * 验证链路：
 *   模拟飞书数据 → 提取字段 → 写入 daily_health_logs + member_memories → SQLite 验证
 */

import { db } from "@/db";
import { members, dailyHealthLogs, memberMemories } from "@/db/schema";
import { extractFields, HEALTH_LOG_MAPPING, SELF_REPORT_MAPPING } from "@/lib/feishu-field-map";
import { eq, desc } from "drizzle-orm";

// ── 模拟飞书原始数据 ──

interface FeishuMockRecord {
  table: string;
  fields: Record<string, unknown>;
}

const TEST_MEMBER_CODE = "0010"; // 使用已存在的会员编号

const mockRecords: FeishuMockRecord[] = [
  // 15天适应记录
  {
    table: "15d",
    fields: {
      "会员编号": TEST_MEMBER_CODE,
      "适应感受": "还行，慢慢找到节奏",
      "身体感受": "更灵活了,睡得更好了",
      "身体变化": "训练后第二天不会那么酸了，身体恢复变快",
      "下一步期待": "想尝试普拉提器械课",
      "给教练的话": "谢谢教练每次都很有耐心",
      "表单版本": "v2",
    },
  },
  // 30天成长记录
  {
    table: "30d",
    fields: {
      "memberCode": TEST_MEMBER_CODE,
      "一个月最大变化": "睡眠更稳定",
      "饮食变化": "开始自己带午餐，蛋白质比以前多了",
      "最骄傲的事": "平板支撑突破60秒",
      "下月目标": "每周坚持练4次",
      "FORM_VERSION": "v2",
    },
  },
  // 90天阶段回顾
  {
    table: "90d",
    fields: {
      "会员编号": TEST_MEMBER_CODE,
      "三个月最大变化": "体态明显改善，朋友都说我站姿变好",
      "最满意的坚持": "每周至少来3次，风雨无阻",
      "最近生活状态": "工作压力还是大，但训练成了缓冲",
      "加入以来改变最大": "不再焦虑体重，更关注身体感受",
      "训练意义": "训练已经从任务变成习惯，不去反而觉得少了点什么",
      "克服时刻": "有几次加班到很晚，但还是赶来上了晚课",
      "下一个90天目标": "核心力量再上一个台阶",
      "FORM_VERSION": "v2",
    },
  },
  // 365天周年纪念
  {
    table: "365d",
    fields: {
      "会员编号": TEST_MEMBER_CODE,
      "年度最大变化": "心态彻底变了，运动成了生活的一部分",
      "最值得骄傲的事": "一整年没有中断超过两周",
      "最难忘的训练瞬间": "夏天的时候第一次完整跟完一节课没休息",
      "向新会员介绍徕舞": "这里不是健身房，是让你学会和自己相处的空间",
      "训练身份认同": "我不再去刻意坚持，因为坚持已经变成我是谁的一部分",
      "感恩": "感谢小桥教练一年的陪伴，每次低谷都是她让我没有放弃",
      "对过去的自己说": "谢谢你没有放弃，谢谢你愿意给自己一个机会",
      "新年期待": "希望明年能开始尝试器械进阶",
      "FORM_VERSION": "v2",
    },
  },
];

async function main() {
  console.log("=== 徕舞关怀表同步测试 ===\n");

  // 1. 确认测试会员存在
  const [member] = await db
    .select({ id: members.id, name: members.name, memberCode: members.memberCode })
    .from(members)
    .where(eq(members.memberCode, TEST_MEMBER_CODE));

  if (!member) {
    console.error(`错误：找不到测试会员 member_code=${TEST_MEMBER_CODE}`);
    console.log("可用会员：");
    const all = await db.select({ id: members.id, name: members.name, memberCode: members.memberCode }).from(members);
    all.forEach(m => console.log(`  ${m.memberCode || "(无编号)"} | ${m.name} (id=${m.id})`));
    process.exit(1);
  }

  console.log(`测试会员: ${member.name} (id=${member.id}, code=${member.memberCode})\n`);

  let healthLogCount = 0;
  let memoryCount = 0;

  for (const rec of mockRecords) {
    console.log(`--- ${rec.table} ---`);
    console.log(`原始字段: ${JSON.stringify(rec.fields, null, 2)}`);

    const healthMapped = extractFields(rec.fields, HEALTH_LOG_MAPPING);
    const reportMapped = extractFields(rec.fields, SELF_REPORT_MAPPING);

    console.log(`提取健康字段: ${JSON.stringify(healthMapped)}`);
    console.log(`提取报告字段: ${JSON.stringify(reportMapped)}`);

    // member_code 关联验证
    const mappedCode = healthMapped["member_code"] || reportMapped["member_code"];
    if (mappedCode !== TEST_MEMBER_CODE) {
      console.error(`错误：member_code 不匹配！预期 ${TEST_MEMBER_CODE}，实际 ${mappedCode}`);
      continue;
    }

    // form_version 验证
    const version = reportMapped["FORM_VERSION"];
    console.log(`表单版本: ${version || "未设置"}`);

    // 写入 daily_health_logs（如果有数据）
    const hasHealth = healthMapped["weight_kg"] || healthMapped["avg_sleep_hours"] ||
      healthMapped["energy_level"] || healthMapped["stress_level"] || healthMapped["pain_areas"];

    if (hasHealth) {
      await db.insert(dailyHealthLogs).values({
        tenantId: 1,
        memberId: member.id,
        logDate: new Date().toISOString().slice(0, 10),
        weight: (healthMapped["weight_kg"] as number) ?? null,
        sleepHours: (healthMapped["avg_sleep_hours"] as number) ?? null,
        energyLevel: (healthMapped["energy_level"] as number) ?? null,
        stressLevel: (healthMapped["stress_level"] as number) ?? null,
        painAreas: (healthMapped["pain_areas"] as string) ?? null,
      });
      healthLogCount++;
      console.log("→ daily_health_logs 写入成功");
    }

    // 写入 member_memories
    const texts: string[] = [];
    const structured: Record<string, string | number> = {};
    let isMilestone = false;

    const milestoneKeys = ["PROUDEST_MOMENT", "PROUDEST_ACHIEVEMENT", "TRAINING_MEANING", "BIGGEST_CHANGE_YEAR"];

    for (const [key, val] of Object.entries(reportMapped)) {
      if (key === "member_code") continue;
      if (val === undefined || val === null || val === "") continue;
      if (typeof val === "number") {
        structured[key] = val;
      } else {
        const s = String(val).trim();
        if (s.length > 0) texts.push(s);
        // Store structured data for key fields
        if (["FORM_VERSION", "ADAPTATION_FEELING", "MOST_NOTICEABLE_CHANGE_30D", "LIFE_STATUS"].includes(key)) {
          structured[key] = s;
        }
        if (milestoneKeys.includes(key)) isMilestone = true;
      }
    }

    if (texts.length > 0) {
      const memoryType = isMilestone ? "milestone" : "self_report";
      await db.insert(memberMemories).values({
        tenantId: 1,
        memberId: member.id,
        content: texts.join("\n"),
        structuredData: JSON.stringify(structured),
        memoryType,
      });
      memoryCount++;
      console.log(`→ member_memories 写入成功 (memory_type=${memoryType}, structured_data_keys=${Object.keys(structured).join(", ")})`);
    }
  }

  console.log(`\n=== 同步完成 ===`);
  console.log(`daily_health_logs 写入: ${healthLogCount} 条`);
  console.log(`member_memories 写入: ${memoryCount} 条`);

  // 验证读取
  console.log(`\n=== 数据库验证 ===`);

  const recentHealthLogs = await db.select().from(dailyHealthLogs).where(eq(dailyHealthLogs.memberId, member.id)).orderBy(desc(dailyHealthLogs.id)).limit(5);
  console.log(`daily_health_logs (最近5条):`);
  recentHealthLogs.forEach(r => console.log(`  id=${r.id} date=${r.logDate} weight=${r.weight} sleep=${r.sleepHours} energy=${r.energyLevel} stress=${r.stressLevel}`));

  const recentMemories = await db.select().from(memberMemories).where(eq(memberMemories.memberId, member.id)).orderBy(desc(memberMemories.id)).limit(5);
  console.log(`\nmember_memories (最近5条):`);
  recentMemories.forEach(r => console.log(`  id=${r.id} type=${r.memoryType} content=${r.content?.slice(0, 80)}... structured=${r.structuredData?.slice(0, 60)}...`));

  console.log(`\n✅ 测试完成。`);
}

main().catch(console.error);
