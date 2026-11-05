import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members, trainings, questionnaireSubmissions, photos, courseOfferings } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { getMemberStage } from "@/lib/member-stage";
import { autoSettleFinishedBookings } from "@/lib/booking-settle";

function inferCategoryKey(name: string, enName?: string): string {
  const n = ((name || "") + " " + (enName || "")).toLowerCase();
  if (n.includes("普拉提") || n.includes("pilates")) return "pilates";
  if (n.includes("器械") || n.includes("equipment")) return "equipment";
  if (n.includes("维密") || n.includes("超模") || n.includes("减脂") || n.includes("sculpt") || n.includes("fat_burn")) return "fat_burn";
  if (n.includes("私教") || n.includes("private")) return "private";
  if (n.includes("瑜伽") || n.includes("yoga")) return "yoga";
  return name.trim();
}

/**
 * 会员本人档案 · 唯一真实数据源
 *
 * 课时口径（2026-11-05 重定）：
 * 1) 累计上课 = 卡内已消耗（Σ 总次数 − 剩余次数）+ 未走卡的出勤记录。
 * 2) 不再使用 members.hours_* / total_hours —— 那批字段只有 2 行有值，
 *    且是 42=18+16+8 的旧灌数，会员看到的数字必须能在 member_cards 里核对。
 * 3) 分项课时只在有真实出勤明细时给出；拆不出来就不显示，不编分摊。
 */
export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // 会员打开「我的账户」时顺手结算已下课的课次（不阻塞返回），
  // 否则会员看到的累计课时和卡内余次会停在上一节之前。
  autoSettleFinishedBookings().catch((e) =>
    console.error("[portal/me] autoSettle error:", e)
  );

  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

  // 1. 真实训练记录（用于逐条训练日志与最近一次训练时间）
  const trainingRows = await db
    .select({ type: trainings.type, trainingDate: trainings.trainingDate })
    .from(trainings)
    .where(eq(trainings.memberId, memberId));

  const trainingCountsMap = new Map<string, number>();
  for (const row of trainingRows) {
    const key = String(row.type || "pilates");
    trainingCountsMap.set(key, (trainingCountsMap.get(key) || 0) + 1);
  }

  // 2. 动态约课与出勤记录：每次预约并在到课（attended）或预约中（booked，且无未到课标记）
  const bookingCountsMap = new Map<string, number>();
  try {
    const dynamicBookings = await rawSql`
      SELECT 
        c.key AS category_key,
        COUNT(DISTINCT b.id)::int AS count
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      JOIN course_categories c ON c.id = s.course_category_id
      LEFT JOIN attendance a ON a.booking_id = b.id
      WHERE b.tenant_id = 1 
        AND b.member_id = ${memberId}
        -- attended 必须在内：教练签到会把 bookings.status 改成 attended，
        -- 旧条件只认 booked/completed，导致真实到课后课时反而掉 1。
        -- 取消(cancelled)、未到(no_show) 不在其列，天然排除。
        AND b.status IN ('booked', 'completed', 'attended')
        AND (a.status IS NULL OR a.status = 'attended')
      GROUP BY c.key
    `;
    for (const row of dynamicBookings) {
      if (row.category_key) {
        bookingCountsMap.set(String(row.category_key), Number(row.count || 0));
      }
    }
  } catch (err) {
    console.error("Query dynamic bookings error:", err);
  }

  // 3. 读取后台配置的项目介绍/类目，按后台自由排序展示
  let activeOfferings: any[] = [];
  try {
    activeOfferings = await db
      .select()
      .from(courseOfferings)
      .where(eq(courseOfferings.isActive, 1))
      .orderBy(asc(courseOfferings.sortOrder));
  } catch (err) {
    console.error("Query course offerings error:", err);
  }

  // 3.5 卡内真实消耗：已消耗 = Σ(总次数 − 剩余次数)
  // 这是导入 275 位会员时唯一带过来的历史痕迹（189 张卡 / 共 1824 节已消耗），
  // 比 members.total_hours 可信：后者只有 2 行有值，且是 42=18+16+8 那套灌进去的假数。
  let cardUsed = 0;
  let cardRemaining = 0;
  let activeCardCount = 0;
  try {
    const [row] = await rawSql`
      SELECT COALESCE(SUM(total_count - remaining_count), 0)::int AS used,
             COALESCE(SUM(remaining_count), 0)::int AS remaining,
             COUNT(*)::int AS cards
        FROM member_cards
       WHERE member_id = ${memberId}
         AND status = 'active'`;
    cardUsed = Number(row?.used || 0);
    cardRemaining = Number(row?.remaining || 0);
    activeCardCount = Number(row?.cards || 0);
  } catch (err) {
    console.error("Query member_cards error:", err);
  }

  const attendedTotal = Array.from(bookingCountsMap.values()).reduce((a, b) => a + b, 0);

  // 出勤里有一部分是走卡扣的，避免与 cardUsed 重复计数：
  // 只把"超出卡消耗"的那部分算作额外记录（无卡免费课、体验课等）。
  const standaloneAttended = Math.max(0, attendedTotal - cardUsed);

  const seenKeys = new Set<string>();
  const courseCounts: Array<{ key: string; label: string; count: number }> = [];

  // 分项统计只在有真实出勤/训练明细时才给。
  // 卡消耗无法拆分到课种（一张卡通常通用于多个课种），硬拆就是编造，
  // 因此没有明细时返回空数组，由前端隐藏该区块，而不是显示一排 0。
  if (attendedTotal > 0 || trainingCountsMap.size > 0) {
    if (activeOfferings && activeOfferings.length > 0) {
      for (const off of activeOfferings) {
        const key = inferCategoryKey(off.name, off.enName);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const attendedCount = bookingCountsMap.get(key) || 0;
        const standaloneTraining = Math.max(0, (trainingCountsMap.get(key) || 0) - attendedCount);
        courseCounts.push({ key, label: off.name, count: attendedCount + standaloneTraining });
      }
    }
  }

  // 累计课时 = 卡内真实消耗 + 未走卡的出勤记录
  // 不再累加 members.hours_*（import 时只有 2 行有值且是 42=18+16+8 的旧假数）
  const dividedTotal = courseCounts.reduce((sum, item) => sum + item.count, 0);
  const totalHours = cardUsed + standaloneAttended > 0 ? cardUsed + standaloneAttended : dividedTotal;

  const trainingsByType = courseCounts
    .filter((item) => item.count > 0)
    .map((item) => ({ key: item.key, label: item.label, count: item.count }));

  // 最近一次训练日期（会员端首页显示「上次练习」用得上）
  const lastTrainingDate =
    trainingRows
      .map((r) => r.trainingDate)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

  const [questionnaireRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId));

  const [photoRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(photos)
    .where(eq(photos.memberId, memberId));

  const questionnaireCount = Number(questionnaireRow?.n || 0);
  const photoCount = Number(photoRow?.n || 0);

  // 伴行天数：只有真实入会日期才计算，否则 null（前端显示「待录入」）
  let joinDays: number | null = null;
  if (member.joinedAt) {
    const t = new Date(String(member.joinedAt).replace(/[-/.]/g, "/")).getTime();
    if (!Number.isNaN(t)) {
      joinDays = Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1);
    }
  }

  const stage = getMemberStage(totalHours);

  // 检查是否具备管家端/管理权限（通过独立 manager_accounts 权限表严格绑定，杜绝硬编码）
  const [managerAccount] = await rawSql`
    SELECT ma.role, ma.user_id
    FROM manager_accounts ma
    WHERE ma.member_id = ${member.id}
      AND ma.is_active = 1
    LIMIT 1
  `.catch(() => []);

  const isManager = Boolean(managerAccount);
  const managerRole = managerAccount?.role || null;

  const response = NextResponse.json({
    memberId: member.id,
    memberName: member.name,
    memberCode: member.memberCode || null,
    joinedAt: member.joinedAt || null,
    avatarUrl: member.avatarUrl || null,
    portalEnabled: member.portalEnabled,
    mentorName: member.mentorName || null,
    status: member.status || null,
    gender: member.gender || null,

    joinDays,
    totalHours,
    courseCounts,
    trainingsByType,
    lastTrainingDate,
    questionnaireCount,
    photoCount,

    // 卡内余额：会员最关心的数字，直接给出总额，不用前端再算
    cardRemaining,
    activeCardCount,

    stage,
    isManager,
    managerRole,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
