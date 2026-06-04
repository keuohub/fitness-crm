/**
 * 批量生成每日反馈 — 遍历 active 会员，调用 DeepSeek 生成并入库
 * 用法：npx tsx src/scripts/daily-feedback-cron.ts
 */

import { db } from "@/db";
import { members as membersTable, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { generateDailyFeedback } from "@/lib/ai";

interface ProcessResult {
  memberId: number;
  name: string;
  status: "success" | "skipped" | "error";
  message: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function manualRun(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: ProcessResult[];
}> {
  const results: ProcessResult[] = [];
  let succeeded = 0;
  let failed = 0;

  // 1. 获取所有 active 状态的会员
  const activeMembers = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  // 2. 遍历处理
  for (const member of activeMembers) {
    try {
      // 检查是否有问卷
      const [q] = await db
        .select()
        .from(questionnaireSubmissions)
        .where(eq(questionnaireSubmissions.memberId, member.id))
        .limit(1);

      if (!q) {
        results.push({
          memberId: member.id,
          name: member.name,
          status: "skipped",
          message: "无问卷记录",
        });
        continue;
      }

      // 检查今天是否已生成
      const today = todayStr();
      const [existing] = await db
        .select()
        .from(aiFeedbackReports)
        .where(
          and(
            eq(aiFeedbackReports.memberId, member.id),
            like(aiFeedbackReports.generatedAt, `${today}%`)
          )
        )
        .limit(1);

      if (existing) {
        results.push({
          memberId: member.id,
          name: member.name,
          status: "skipped",
          message: "今日已有反馈",
        });
        continue;
      }

      // 生成反馈
      console.log(`[${member.name}] 生成中...`);
      const feedback = await generateDailyFeedback(member.id);

      // 入库
      await db.insert(aiFeedbackReports).values({
        tenantId: 1,
        memberId: member.id,
        reportType: "daily",
        content: feedback,
        generatedAt: new Date().toISOString(),
      });

      console.log(`[${member.name}] 完成 ✓`);
      results.push({
        memberId: member.id,
        name: member.name,
        status: "success",
        message: "生成成功",
      });
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      console.error(`[${member.name}] 失败: ${msg}`);
      results.push({
        memberId: member.id,
        name: member.name,
        status: "error",
        message: msg,
      });
      failed++;
    }
  }

  const processed = results.length;
  console.log(`\n完成：${processed} 个会员，成功 ${succeeded}，失败 ${failed}`);

  // ── 生日祝福 ──
  const today = new Date().toISOString().slice(5, 10); // MM-DD
  const allMembers = await db.select().from(membersTable).where(eq(membersTable.status, "active"));
  const birthdayMembers = allMembers.filter((m) => m.birthday && m.birthday.slice(5) === today);

  if (birthdayMembers.length > 0) {
    console.log(`\n🎂 今日生日会员: ${birthdayMembers.map(m => m.name).join("、")}`);
    console.log("开始生成生日祝福...");

    const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
    const apiKey = process.env.DEEPSEEK_API_KEY;

    for (const member of birthdayMembers) {
      try {
        if (!apiKey) { console.log(`[${member.name}] 跳过: DEEPSEEK_API_KEY 未配置`); continue; }

        const res = await fetch(DEEPSEEK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: `你是"小桥"，徕舞普拉提的资深女性私人教练。今天是会员的生日，请写一段温馨、个性化的生日祝福。纯文本，80-120字，署名：—— 小桥` },
              { role: "user", content: `今天是${member.name}的生日，请为ta写一段祝福。` },
            ],
            temperature: 0.8, max_tokens: 800,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const blessing = data.choices?.[0]?.message?.content?.trim() || "";

          await db.insert(aiFeedbackReports).values({
            tenantId: 1, memberId: member.id, reportType: "birthday",
            content: blessing, generatedAt: new Date().toISOString(),
          });

          console.log(`[${member.name}] 生日祝福已生成 ✓`);
        }
      } catch (err) {
        console.error(`[${member.name}] 生日祝福失败:`, err);
      }
    }
  }

  return {
    processed,
    succeeded,
    failed,
    results,
  };
}

// 直接运行时执行
if (require.main === module) {
  manualRun()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("批量生成失败:", err);
      process.exit(1);
    });
}
