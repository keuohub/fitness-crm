// Pilot Group Seed — 创建15名测试会员并激活Portal

import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}

const PILOT_MEMBERS = [
  { name: "王莉", phone: "13800000001", birthday: "1990-05-15", joinedAt: "2025-06-01", target: "产后恢复" },
  { name: "微微", phone: "13800000002", birthday: "1992-08-22", joinedAt: "2025-06-02", target: "减脂塑形" },
  { name: "李婷", phone: "13800000003", birthday: "1988-03-10", joinedAt: "2025-07-15", target: "体态矫正" },
  { name: "张悦", phone: "13800000004", birthday: "1995-11-08", joinedAt: "2025-08-01", target: "核心重建" },
  { name: "赵雪", phone: "13800000005", birthday: "1993-01-25", joinedAt: "2025-09-10", target: "减脂塑形" },
  { name: "刘芳", phone: "13800000006", birthday: "1987-06-18", joinedAt: "2025-10-05", target: "产后恢复" },
  { name: "周洁", phone: "13800000007", birthday: "1998-04-30", joinedAt: "2025-11-20", target: "体态矫正" },
  { name: "吴敏", phone: "13800000008", birthday: "1991-09-12", joinedAt: "2025-12-15", target: "减压放松" },
  { name: "郑欣", phone: "13800000009", birthday: "1994-07-03", joinedAt: "2026-01-08", target: "减脂塑形" },
  { name: "孙雅", phone: "13800000010", birthday: "1989-02-14", joinedAt: "2026-02-01", target: "核心重建" },
  { name: "钱璐", phone: "13800000011", birthday: "1996-10-20", joinedAt: "2026-02-20", target: "体态矫正" },
  { name: "陈思", phone: "13800000012", birthday: "1993-12-05", joinedAt: "2026-03-10", target: "产后恢复" },
  { name: "杨柳", phone: "13800000013", birthday: "1990-04-28", joinedAt: "2026-04-01", target: "减脂塑形" },
  { name: "黄悦", phone: "13800000014", birthday: "1997-08-16", joinedAt: "2026-04-15", target: "减压放松" },
  { name: "林静", phone: "13800000015", birthday: "1992-01-30", joinedAt: "2026-05-01", target: "体态矫正" },
];

async function seed() {
  console.log("开始创建 Pilot 测试会员组 (15人)...\n");

  for (const m of PILOT_MEMBERS) {
    // Check if exists by phone
    const existing = await db
      .select()
      .from(members)
      .where(eq(members.phone, m.phone))
      .limit(1);

    if (existing.length > 0) {
      // Update with portal code if needed
      const member = existing[0];
      if (!member.portalCode || !member.portalEnabled) {
        const code = generateCode();
        await db
          .update(members)
          .set({ portalCode: code, portalEnabled: 1 })
          .where(eq(members.id, member.id));
        console.log(`[UPDATE] ${m.name} -> portalCode: ${code}`);
      } else {
        console.log(`[SKIP] ${m.name} -> already has portalCode: ${member.portalCode}`);
      }
    } else {
      const code = generateCode();
      await db.insert(members).values({
        name: m.name,
        phone: m.phone,
        birthday: m.birthday,
        joinedAt: m.joinedAt,
        status: "active",
        portalCode: code,
        portalEnabled: 1,
        tenantId: 1,
      });
      console.log(`[INSERT] ${m.name} (${m.phone}) -> portalCode: ${code}`);
    }
  }

  console.log("\nPilot 会员组创建完成。");
  console.log("请将邀请码分发给对应会员。");
}

seed().catch(console.error);
