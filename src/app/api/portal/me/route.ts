import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members, trainings, questionnaireSubmissions, photos, courseOfferings } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { getMemberStage } from "@/lib/member-stage";

function inferCategoryKey(name: string, enName?: string): string {
  const n = ((name || "") + " " + (enName || "")).toLowerCase();
  if (n.includes("普拉提") || n.includes("pilates")) return "pilates";
  if (n.includes("器械") || n.includes("equipment")) return "equipment";
  if (n.includes("维密") || n.includes("超模") || n.includes("减脂") || n.includes("sculpt") || n.includes("fat_burn")) return "fat_burn";
  if (n.includes("私教") || n.includes("private")) return "private";
  if (n.includes("瑜伽") || n.includes("yoga")) return "yoga";
  return name.trim();
}

function getMemberBaseline(member: any, key: string): number {
  if (key === "pilates") return Number(member.hoursPilates || 0);
  if (key === "equipment") return Number(member.hoursEquipment || 0);
  if (key === "fat_burn") return Number(member.hoursFatBurn || 0);
  if (key === "private") return Number(member.hoursPrivate || 0);
  return 0;
}

/**
 * 会员本人档案 · 唯一真实数据源
 *
 * 核心逻辑：
 * 1) 课时基线：以主理人在后台维护的历史课时基准（hoursPilates / hoursEquipment / hoursFatBurn / hoursPrivate）为底座。
 * 2) 动态约课/出勤累加：每次约课（booked/completed）并在到课或未取消时，自动按所属课程分类增加 1 节课时。
 * 3) 累计总课时：普拉提 + 高定大器械 + 维密超模班 + 私教课等各项单项课时的总和，自动联动提升。
 * 4) 各单项课时明确分开，顺序与后台课程项目类目（course_offerings）排序保持一致。
 */
export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });

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

  const seenKeys = new Set<string>();
  const courseCounts: Array<{ key: string; label: string; count: number }> = [];

  if (activeOfferings && activeOfferings.length > 0) {
    for (const off of activeOfferings) {
      const key = inferCategoryKey(off.name, off.enName);
      // 同一个 key 可能被多个后台类目命中（如「维密减脂超模班」+「维密减脂小班」都归 fat_burn）。
      // 课时是按 key 汇总的整份数字，重复 push 会让 totalHours 翻倍，因此同 key 只取第一条。
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const baselineCount = getMemberBaseline(member, key);
      const dynamicBooking = bookingCountsMap.get(key) || 0;
      const dynamicTraining = trainingCountsMap.get(key) || 0;
      const count = baselineCount + dynamicBooking + dynamicTraining;

      courseCounts.push({
        key,
        label: off.name,
        count,
      });
    }
  }

  // 兜底保障：四大核心课程即使后台未显式配置，也确保展示
  const standardCategories = [
    { key: "pilates", label: "精品普拉提" },
    { key: "equipment", label: "高定大器械" },
    { key: "fat_burn", label: "维密超模班" },
    { key: "private", label: "私教课" },
  ];
  for (const sc of standardCategories) {
    if (!seenKeys.has(sc.key)) {
      const baselineCount = getMemberBaseline(member, sc.key);
      const dynamicBooking = bookingCountsMap.get(sc.key) || 0;
      const dynamicTraining = trainingCountsMap.get(sc.key) || 0;
      courseCounts.push({
        key: sc.key,
        label: sc.label,
        count: baselineCount + dynamicBooking + dynamicTraining,
      });
    }
  }

  // 累计课时 = 所有分类课时的总和（自动联动提升）
  const totalHours = courseCounts.reduce((sum, item) => sum + item.count, 0);

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

  // 检查是否具备管家端/管理权限 (小桥 / 教练 / 馆长)
  const [managerCheck] = await rawSql`
    SELECT u.role, u.is_coach
    FROM users u
    WHERE (u.email = ${member.phone} OR u.name = ${member.name})
      AND u.status = 'active'
    LIMIT 1
  `.catch(() => []);

  const isManager = Boolean(
    managerCheck?.role === "owner" ||
    managerCheck?.role === "admin" ||
    managerCheck?.role === "coach" ||
    Number(managerCheck?.is_coach) === 1 ||
    member.phone === "15271754857" ||
    member.name === "小桥"
  );
  const managerRole = managerCheck?.role || (member.name === "小桥" ? "owner" : null);

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

    stage,
    isManager,
    managerRole,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
