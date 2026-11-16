import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

// 校验管家/管理权限（通过独立 manager_accounts 权限表严格绑定，杜绝硬编码）
async function checkManagerAuth(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return null;

  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return null;

  const [managerAccount] = await rawSql`
    SELECT ma.role, ma.user_id
    FROM manager_accounts ma
    WHERE ma.member_id = ${member.id}
      AND ma.is_active = 1
    LIMIT 1
  `.catch(() => []);

  return managerAccount ? { ...member, managerRole: managerAccount.role, managerUserId: managerAccount.user_id } : null;
}

export async function GET(request: NextRequest) {
  const manager = await checkManagerAuth(request);
  if (!manager) return bad("无权访问管家操作接口", 403);

  const u = new URL(request.url);
  const action = u.searchParams.get("action") || "";

  // 1. 获取某天的场次以及每个场次下的预约学员名单
  if (action === "bookings") {
    const date = u.searchParams.get("date") || new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const sessions = await rawSql`
      SELECT
        cs.id,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.capacity,
        cs.booked_count,
        cs.status,
        COALESCE(c.name, cs.title) as course_name,
        COALESCE(u.name, '专业导师') as coach_name,
        COALESCE(r.name, '主操房') as room_name
      FROM class_sessions cs
      LEFT JOIN course_categories c ON cs.course_category_id = c.id
      LEFT JOIN users u ON cs.coach_id = u.id
      LEFT JOIN rooms r ON cs.room_id = r.id
      WHERE cs.session_date = ${date} AND cs.status <> 'cancelled'
      ORDER BY cs.start_time ASC
    `.catch(() => []);

    const sessionIds = sessions.map((s: any) => s.id);
    let sessionBookings: any[] = [];
    if (sessionIds.length > 0) {
      sessionBookings = await rawSql`
        SELECT
          b.id,
          b.session_id,
          b.member_id,
          b.status,
          b.booked_at,
          m.name as member_name,
          CASE 
            WHEN m.phone IS NOT NULL AND LENGTH(m.phone) = 11 
            THEN CONCAT(SUBSTRING(m.phone, 1, 3), '****', SUBSTRING(m.phone, 8, 4))
            ELSE COALESCE(m.member_code, '学员')
          END as member_phone,
          m.member_code,
          -- 名单上要显示"她用哪张卡"，约刻的做法是每行标卡名，前台一眼看出余次从哪扣。
          -- 取当前最该扣的那张：针对本节课课种，专用卡优先，其次最早到期的卡。
          (
            SELECT ct.name
            FROM member_cards mc
            JOIN card_types ct ON ct.id = mc.card_type_id
            WHERE mc.tenant_id = 1
              AND mc.member_id = m.id
              AND mc.status = 'active'
              AND (
                mc.valid_until IS NULL
                OR mc.valid_until::text !~ '^[0-9]{4}'
                OR mc.valid_until::date >= CURRENT_DATE
              )
              AND (
                EXISTS (SELECT 1 FROM card_type_courses ctc WHERE ctc.card_type_id = ct.id AND ctc.course_category_id = cs.course_category_id)
                OR NOT EXISTS (SELECT 1 FROM card_type_courses ctc2 WHERE ctc2.card_type_id = ct.id)
              )
            ORDER BY 
              ((SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) = 0) ASC,
              (SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) ASC,
              CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END,
              CASE WHEN mc.valid_until IS NULL THEN 1 ELSE 0 END,
              mc.valid_until, mc.id
            LIMIT 1
          ) as card_name,
          (SELECT COUNT(*)::int FROM attendance a WHERE a.booking_id = b.id) as attendance_count
        FROM bookings b
        JOIN members m ON b.member_id = m.id
        JOIN class_sessions cs ON cs.id = b.session_id
        WHERE b.session_id = ANY(${sessionIds})
          AND b.status IN ('booked', 'attended', 'no_show')
        ORDER BY b.id ASC
      `.catch(() => []);
    }

    const sessionsWithBookings = sessions.map((s: any) => ({
      ...s,
      attendees: sessionBookings.filter((b: any) => b.session_id === s.id),
    }));

    return NextResponse.json({ date, sessions: sessionsWithBookings });
  }

  // 2. 获取所有课程项目（供小程序直接编辑课程名称、星级、简介与分类）
  if (action === "courses") {
    const list = await rawSql`
      SELECT id, name, category_type, difficulty_stars, description, cover_image
      FROM course_categories
      ORDER BY id ASC
    `.catch(() => []);
    return NextResponse.json({ courses: list });
  }

  // 3. 获取导师与教室字典（供排课下拉选择，教练统一取自 users 表 coach 账号）
  if (action === "options") {
    const coaches = await rawSql`
      SELECT id, name 
      FROM users 
      WHERE (role IN ('coach', 'owner', 'admin') OR is_coach = 1) 
        AND status = 'active'
      ORDER BY id ASC
    `.catch(() => []);
    const roomList = await rawSql`SELECT id, name, capacity FROM rooms ORDER BY id ASC`.catch(() => []);
    const courses = await rawSql`SELECT id, name, category_type FROM course_categories ORDER BY id ASC`.catch(() => []);
    const cardTypes = await rawSql`
      SELECT id, name, category, total_count, validity_days, price_cents
      FROM card_types
      WHERE tenant_id = 1 AND is_active = 1
      ORDER BY sort_order ASC, id ASC
    `.catch(() => []);
    return NextResponse.json({ coaches, rooms: roomList, courses, cardTypes });
  }

  // 4. 获取会员列表 (支持搜索，默认脱敏展示手机号)
  if (action === "members") {
    const q = String(u.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(u.searchParams.get("page") || 1));
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const list = q
      ? await rawSql`
          SELECT m.id, m.name, 
                 CASE 
                   WHEN m.phone IS NOT NULL AND LENGTH(m.phone) = 11 
                   THEN CONCAT(SUBSTRING(m.phone, 1, 3), '****', SUBSTRING(m.phone, 8, 4))
                   ELSE '未留手机'
                 END as phone,
                 m.member_code, m.status, m.joined_at, m.portal_enabled,
                 COALESCE((SELECT count(*) FROM member_cards mc WHERE mc.member_id = m.id AND mc.status = 'active'), 0)::int as active_cards_count
          FROM members m
          WHERE m.status != 'archived'
            AND (m.name ILIKE ${'%' + q + '%'} OR m.phone ILIKE ${'%' + q + '%'} OR m.member_code ILIKE ${'%' + q + '%'})
          ORDER BY m.id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `.catch(() => [])
      : await rawSql`
          SELECT m.id, m.name,
                 CASE 
                   WHEN m.phone IS NOT NULL AND LENGTH(m.phone) = 11 
                   THEN CONCAT(SUBSTRING(m.phone, 1, 3), '****', SUBSTRING(m.phone, 8, 4))
                   ELSE '未留手机'
                 END as phone,
                 m.member_code, m.status, m.joined_at, m.portal_enabled,
                 COALESCE((SELECT count(*) FROM member_cards mc WHERE mc.member_id = m.id AND mc.status = 'active'), 0)::int as active_cards_count
          FROM members m
          WHERE m.status != 'archived'
          ORDER BY m.id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `.catch(() => []);

    const [{ total }] = await rawSql`
      SELECT count(*)::int as total FROM members WHERE status != 'archived'
    `.catch(() => [{ total: 0 }]);

    return NextResponse.json({ members: list, total, page, pageSize });
  }

  // 4.5 会员详情（手机端"点进一个人"看全部）
  // 约刻的会员信息页只有 6 个只读字段，点行没有任何反应，馆长想知道"她还剩几次、上次来是什么时候"
  // 只能靠导出表格去翻。这里一次性给她画像：卡、余次、有效期、到课率、最近记录、下次预约。
  if (action === "member_detail") {
    const id = Number(u.searchParams.get("id") || 0);
    if (!id) return bad("缺少会员 id");

    const [member] = await rawSql`
      SELECT id, name, gender, phone, birthday, joined_at, member_code, status,
             freeze_status, freeze_start, freeze_end, portal_enabled,
             mentor_name, avatar_url, notes
      FROM members
      WHERE id = ${id} AND tenant_id = 1
      LIMIT 1
    `.catch(() => []);
    if (!member) return bad("会员不存在", 404);

    // 卡列表：active 排前面，其余按 id 倒序
    const cards = await rawSql`
      SELECT mc.id, ct.name AS card_name, ct.category,
             mc.total_count, mc.remaining_count,
             mc.valid_from, mc.valid_until, mc.status, mc.created_at,
             (mc.total_count - mc.remaining_count) AS used_count
      FROM member_cards mc
      LEFT JOIN card_types ct ON ct.id = mc.card_type_id
      WHERE mc.tenant_id = 1 AND mc.member_id = ${id}
      ORDER BY CASE WHEN mc.status = 'active' THEN 0 ELSE 1 END, mc.id DESC
    `.catch(() => []);

    // 到课画像：到课数 / 未到数 / 最近一次到课
    const [stat] = await rawSql`
      SELECT
        COUNT(*) FILTER (WHERE b.status = 'attended')::int AS attended,
        COUNT(*) FILTER (WHERE b.status = 'no_show')::int  AS no_show,
        COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS cancelled,
        MAX(s.session_date) FILTER (WHERE b.status = 'attended') AS last_attended_date
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      WHERE b.tenant_id = 1 AND b.member_id = ${id}
    `.catch(() => [{ attended: 0, no_show: 0, cancelled: 0, last_attended_date: null }]);

    // 最近 10 条约课记录（含未到，馆长要能看出"她约了但不来"）
    const recent = await rawSql`
      SELECT b.id AS booking_id, b.status, b.booked_at,
             s.id AS session_id, s.session_date, s.start_time, s.end_time,
             COALESCE(c.name, s.title) AS course_name,
             COALESCE(u.name, '') AS coach_name
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      LEFT JOIN course_categories c ON c.id = s.course_category_id
      LEFT JOIN users u ON u.id = s.coach_id
      WHERE b.tenant_id = 1 AND b.member_id = ${id}
      ORDER BY s.session_date DESC, s.start_time DESC
      LIMIT 10
    `.catch(() => []);

    // 下次要来的是哪节
    const upcoming = await rawSql`
      SELECT b.id AS booking_id, s.session_date, s.start_time,
             COALESCE(c.name, s.title) AS course_name, b.status
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      LEFT JOIN course_categories c ON c.id = s.course_category_id
      WHERE b.tenant_id = 1 AND b.member_id = ${id}
        AND b.status IN ('booked', 'waitlist')
        AND s.session_date >= to_char((NOW() AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD')
      ORDER BY s.session_date ASC, s.start_time ASC
      LIMIT 3
    `.catch(() => []);

    // 当前可扣的那张卡（用于"还剩几次"的大字展示）
    const activeCard = cards.find((c: any) => c.status === "active") || null;

    return NextResponse.json({
      member,
      cards,
      activeCard,
      stat: stat || {},
      recent,
      upcoming,
    });
  }

  // 5. 获取会员卡明细（手机号脱敏）
  if (action === "cards") {
    const list = await rawSql`
      SELECT mc.id, mc.member_id, mc.remaining_count, mc.total_count,
             mc.valid_from as start_date, mc.valid_until as end_date, mc.status,
             ct.name as card_name, ct.category as card_category, m.name as member_name,
             CASE 
               WHEN m.phone IS NOT NULL AND LENGTH(m.phone) = 11 
               THEN CONCAT(SUBSTRING(m.phone, 1, 3), '****', SUBSTRING(m.phone, 8, 4))
               ELSE '未留手机'
             END as member_phone
      FROM member_cards mc
      JOIN card_types ct ON mc.card_type_id = ct.id
      JOIN members m ON mc.member_id = m.id
      WHERE mc.status = 'active'
      ORDER BY mc.id DESC
      LIMIT 50
    `.catch(() => []);
    return NextResponse.json({ cards: list });
  }

  // 6. 教室与场地设备明细
  if (action === "venue") {
    const roomList = await rawSql`
      SELECT r.id, r.name, r.capacity,
             CASE
               WHEN r.name LIKE '%器械%' THEN '普拉提重力核心床 (Reformer) 6 台'
               WHEN r.name LIKE '%超模%' OR r.name LIKE '%垫上%' THEN '稳踏椅 / 弧形桶 / 塑形小球魔力圈'
               WHEN r.name LIKE '%私教%' THEN '凯迪拉克多功能高床 / 梯桶 / 脊柱矫正器'
               ELSE '专业普拉提塑形训练设备'
             END as equipment_desc
      FROM rooms r
      ORDER BY r.id ASC
    `.catch(() => []);
    return NextResponse.json({ rooms: roomList });
  }

  // 6.5. 教练团队列表
  if (action === "coaches") {
    const list = await rawSql`
      SELECT u.id, u.name, u.email, u.status, u.avatar_url,
             COALESCE(tm.role_title, '资深塑形教练') as role_title,
             COALESCE(tm.experience, '多年普拉提与形体训练经验') as experience,
             COALESCE(tm.is_active, 1) as is_active
      FROM users u
      LEFT JOIN team_members tm ON tm.name = u.name
      WHERE u.tenant_id = 1 AND (u.is_coach = 1 OR u.role = 'coach')
      ORDER BY u.status ASC, u.id ASC
    `.catch(() => []);
    return NextResponse.json({ coaches: list });
  }

  // 6.6. 卡种规则配置库 (含关联课种与生效状态)
  if (action === "card_types") {
    const rows = await rawSql`
      SELECT ct.id, ct.name, ct.category, ct.price_cents, ct.validity_days,
             ct.total_count, ct.is_active, ct.sort_order,
             (SELECT COUNT(*)::int FROM member_cards mc WHERE mc.card_type_id = ct.id AND mc.status = 'active') as active_count
      FROM card_types ct
      WHERE ct.tenant_id = 1
      ORDER BY ct.is_active DESC, ct.sort_order ASC, ct.id ASC
    `.catch(() => []);

    const courses = await rawSql`
      SELECT ctc.card_type_id, cc.name as category_name
      FROM card_type_courses ctc
      JOIN course_categories cc ON cc.id = ctc.course_category_id
      ORDER BY ctc.course_category_id ASC
    `.catch(() => []);
    const map = new Map<number, string[]>();
    for (const c of courses) {
      const arr = map.get(c.card_type_id) || [];
      arr.push(c.category_name);
      map.set(c.card_type_id, arr);
    }
    const result = rows.map((r: any) => ({
      ...r,
      courseCategories: map.get(r.id) || [],
    }));
    return NextResponse.json({ cardTypes: result });
  }

  // 6.7. 管理员与系统权限账号列表
  if (action === "admins") {
    const list = await rawSql`
      SELECT id, name, email, role, status, created_at
      FROM users
      WHERE tenant_id = 1 AND (role IN ('admin', 'owner') OR id IN (1, 11, 26, 27))
      ORDER BY id ASC
    `.catch(() => []);
    return NextResponse.json({ admins: list });
  }

  // 7. 经营数据与报表概览（在册且开通约课会员口径准确）
  if (action === "reports") {
    const [report] = await rawSql`
      SELECT
        (SELECT count(*)::int FROM members WHERE status = 'active' AND portal_enabled = 1) as active_members,
        (SELECT count(*)::int FROM member_cards WHERE status = 'active') as active_cards,
        (SELECT count(*)::int FROM bookings WHERE status = 'attended') as total_attended,
        (SELECT count(*)::int FROM bookings b JOIN class_sessions cs ON b.session_id = cs.id WHERE cs.session_date = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AND b.status IN ('booked', 'attended')) as today_bookings,
        (SELECT count(*)::int FROM class_sessions WHERE session_date >= to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AND status <> 'cancelled') as upcoming_sessions
    `.catch(() => [{}]);
    return NextResponse.json({ report });
  }

  return bad("未知 action");
}

export async function POST(request: NextRequest) {
  const manager = await checkManagerAuth(request);
  if (!manager) return bad("无权执行管家操作", 403);

  const u = new URL(request.url);
  const action = u.searchParams.get("action") || "";
  const body = await request.json().catch(() => ({}));

  // 0. 签到 / 标记未到（馆长在手机端代签）
  // 约刻的做法是名单每行一个「签到」，点了就扣次记出勤。我们这条链路原来只对教练开放
  // （coach/check-in 里硬校验 booking.coach_id === 当前教练），馆长拿手机签不了，
  // 会员没预约就来了也没法补签，只能跑去电脑后台。这里按约刻的方式开放给馆长。
  // status: attended = 到课（扣次）｜ no_show = 未到（不扣次，但必须记，
  // 否则 autoSettleFinishedBookings 会把它当默认到课扣掉）。
  if (action === "checkin") {
    const bookingId = Number(body.bookingId || 0);
    const status = String(body.status || "attended");
    if (!bookingId) return bad("缺少 bookingId");
    if (!["attended", "no_show"].includes(status)) return bad("status 只能是 attended 或 no_show");

    const [booking] = await rawSql`
      SELECT b.*, s.coach_id, s.session_date, s.course_category_id,
             COALESCE(c.name, s.title) AS course_name
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      LEFT JOIN course_categories c ON c.id = s.course_category_id
      WHERE b.id = ${bookingId} AND b.tenant_id = 1
      LIMIT 1
    `.catch(() => []);
    if (!booking) return bad("预约不存在", 404);
    if (booking.status === "cancelled") return bad("这笔预约已取消，不能签到", 409);

    // 先挡一道重复签到：没有这条判断，连点两次就会扣两次次卡
    const [dup] = await rawSql`
      SELECT id, status FROM attendance WHERE booking_id = ${bookingId} LIMIT 1
    `.catch(() => []);
    if (dup) {
      return NextResponse.json({
        success: true, duplicate: true, status: dup.status,
        message: dup.status === "no_show" ? "已经标记过未到" : "已经签到过了",
      });
    }

    const operatorId = Number(manager.managerUserId || 1) || 1;
    const noteText = (status === "attended" ? "馆长代签到 · " : "馆长标记未到 · ") + (booking.course_name || "");
    const txNote = (status === "attended" ? "馆长代签到扣次 · " : "馆长标记未到扣次 · ") + (booking.course_name || "");

    // 一条 CTE 走完：锁卡 → 写考勤 → 扣次 → 写流水 → 改预约状态。
    // 中途任何一步没数据（比如这张卡不能上这种课），整条语句不出行，账不会半截。
    const rows = await rawSql`
      WITH booking_ok AS (
        SELECT id, session_id, member_id FROM bookings
        WHERE id = ${bookingId} AND tenant_id = 1
          AND status IN ('booked', 'unsettled')
        FOR UPDATE
      ), candidate AS (
        SELECT mc.id, mc.remaining_count, ct.category,
               COALESCE((SELECT COUNT(*)::int FROM card_type_courses ctc_cnt
                          WHERE ctc_cnt.card_type_id = ct.id), 0) AS course_scope
        FROM member_cards mc
        JOIN card_types ct ON ct.id = mc.card_type_id
        JOIN booking_ok bo ON bo.member_id = mc.member_id
        JOIN class_sessions s ON s.id = bo.session_id
        WHERE mc.tenant_id = 1
          AND mc.status = 'active'
          AND (mc.valid_from IS NULL OR mc.valid_from::text !~ '^[0-9]{4}' OR mc.valid_from::date <= s.session_date::date)
          AND (mc.valid_until IS NULL OR mc.valid_until::text !~ '^[0-9]{4}' OR mc.valid_until::date >= s.session_date::date)
          AND (ct.category = 'period' OR mc.remaining_count > 0)
          AND (
            EXISTS (SELECT 1 FROM card_type_courses ctc
                     WHERE ctc.card_type_id = ct.id
                       AND ctc.course_category_id = s.course_category_id)
            OR NOT EXISTS (SELECT 1 FROM card_type_courses ctc2 WHERE ctc2.card_type_id = ct.id)
          )
        -- 扣卡优先级与教练端 coach/check-in 完全一致（项目档案硬规则）：
        -- ① 专用卡优于通卡（有课种绑定的一律排前面，绑定越少越专用）
        -- ② 同类多张时，最早到期的先扣，避免好卡放过期
        ORDER BY
          ((SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) = 0) ASC,
          (SELECT COUNT(*)::int FROM card_type_courses ctc_o WHERE ctc_o.card_type_id = ct.id) ASC,
          CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END,
          CASE WHEN mc.valid_until IS NULL THEN 1 ELSE 0 END,
          mc.valid_until, mc.id
        LIMIT 1
        FOR UPDATE OF mc
      ), att AS (
        INSERT INTO attendance
          (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
        SELECT 1, bo.session_id, bo.member_id, bo.id, ${status}, ${operatorId}, NOW(), ${noteText}
        FROM booking_ok bo
        -- 标记未到不需要有卡（爽约也要留记录），到课才必须能挑出一张可扣的卡
        WHERE ${status} = 'no_show' OR EXISTS (SELECT 1 FROM candidate)
        ON CONFLICT DO NOTHING
        RETURNING id
      ), deduct AS (
        UPDATE member_cards
           SET remaining_count = GREATEST(remaining_count - 1, 0), updated_at = NOW()
         WHERE id = (SELECT id FROM candidate WHERE category = 'count')
           AND EXISTS (SELECT 1 FROM att)
        RETURNING id, remaining_count
      ), tx AS (
        INSERT INTO card_transactions
          (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
        SELECT 1, ca.id, bo.member_id, bo.id, 'deduct',
               CASE WHEN ca.category = 'count' THEN -1 ELSE 0 END,
               COALESCE((SELECT remaining_count FROM deduct), ca.remaining_count),
               ${txNote}, ${operatorId}
        FROM candidate ca, booking_ok bo
        WHERE EXISTS (SELECT 1 FROM att)
        RETURNING id
      ), upd AS (
        UPDATE bookings SET status = ${status}, updated_at = NOW()
        WHERE id = ${bookingId} AND EXISTS (SELECT 1 FROM att)
        RETURNING id, status
      )
      SELECT
        (SELECT count(*)::int FROM att)                  AS inserted,
        (SELECT id FROM candidate)                       AS card_id,
        (SELECT category FROM candidate)                 AS card_category,
        COALESCE((SELECT remaining_count FROM deduct), (SELECT remaining_count FROM candidate)) AS card_remaining
    `.catch((e: any) => {
      console.error("[manager/checkin] cte error", e?.message);
      return [];
    });

    const r: any = (rows && rows[0]) || null;
    if (!r) return bad("签到失败，请重试", 500);

    if (Number(r.inserted) === 0) {
      // 上面已经挡过一次重复签到，走到这里要么是并发重复，要么是真没卡可扣
      const [again] = await rawSql`
        SELECT id, status FROM attendance WHERE booking_id = ${bookingId} LIMIT 1
      `.catch(() => []);
      if (again) {
        return NextResponse.json({
          success: true, duplicate: true, status: again.status,
          message: "这条预约已经处理过了",
        });
      }
      return bad(
        "这个学员没有能上这节课的有效卡，没法扣次。请先给她开卡或补次，再签到。",
        409
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status,
      memberName: booking.member_name || "",
      cardCategory: r.card_category,
      cardRemaining: r.card_category === "count" ? Number(r.card_remaining || 0) : null,
      message: (function() {
        // 按项目档案硬规则：旷课（未到）同样计入未到记录并扣 1 次课时，
        // 只有"她名下根本没有可用卡"时才出现未扣次的情况。
        var act = status === "attended" ? "已签到" : "已记未到（旷课）";
        if (r.card_category === "count") {
          return act + "，次卡扣 1 节，卡内还剩 " + Number(r.card_remaining || 0) + " 节";
        }
        if (r.card_category === "period") return act + "（期限卡不扣次）";
        return act + "（名下无可用卡，本次未扣次）";
      })(),
    });
  }

  // 1. 取消预约并释放席位（校验预约原状态，已扣次课时原路退回，杜绝死锁与账实不符）
  if (action === "cancel_booking") {
    const bookingId = Number(body.bookingId);
    if (!bookingId) return bad("缺少 bookingId");

    const [booking] = await rawSql`
      SELECT b.*, s.session_date, s.start_time, s.end_time, s.title as session_title
      FROM bookings b
      JOIN class_sessions s ON s.id = b.session_id
      WHERE b.id = ${bookingId} AND b.tenant_id = 1
    `;
    if (!booking) return bad("预约不存在", 404);
    if (booking.status === "cancelled") {
      return NextResponse.json({ success: true, message: "该预约此前已处于取消状态", duplicate: true });
    }
    if (booking.status !== "booked") {
      return bad("该预约已结课/已出勤，无法直接取消；如需调账退款请走后台专门通道", 409);
    }

    // 校验开课时间：已结束的课程不可代客取消
    const startMs = new Date(`${booking.session_date}T${booking.start_time}:00+08:00`).getTime();
    if (startMs <= Date.now() - 3600_000) {
      return bad("该课程已结束，不可作为未上课代客取消；出勤历史不可篡改", 409);
    }

    // 检查此预约是否已有提前扣次流水
    const [deductTx] = await rawSql`
      SELECT * FROM card_transactions
      WHERE booking_id = ${bookingId} AND type = 'deduct'
      ORDER BY id DESC LIMIT 1
    `.catch(() => []);

    if (deductTx) {
      // 课时原路返还会员卡
      await rawSql`
        UPDATE member_cards
        SET remaining_count = remaining_count + 1, updated_at = NOW()
        WHERE id = ${deductTx.member_card_id}
      `;
      await rawSql`
        INSERT INTO card_transactions (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
        VALUES (1, ${deductTx.member_card_id}, ${booking.member_id}, ${bookingId}, 'refund', 1,
                (SELECT remaining_count FROM member_cards WHERE id = ${deductTx.member_card_id}),
                ${'管家代客取消退还课时 · ' + (booking.session_title || '课程')}, ${manager.managerUserId || 1})
      `;
    }

    // 更新预约状态为 cancelled
    await rawSql`
      UPDATE bookings
      SET status = 'cancelled',
          cancel_reason = ${body.reason || '管家在小程序端代客取消'},
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = ${bookingId}
    `;

    // 释放席位
    await rawSql`
      UPDATE class_sessions
      SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
      WHERE id = ${booking.session_id}
    `;

    return NextResponse.json({
      success: true,
      message: deductTx ? "预约已取消，已扣课时已全额返还会员卡，席位已释放" : "预约已取消，席位已释放，学员预约额度已恢复"
    });
  }

  // 2. 现场录入新会员（同步生成邀请码与登录PIN，拒绝重复手机号，账号立即可登）
  if (action === "create_member") {
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || !phone) return bad("请填写会员姓名和手机号");
    if (!/^1\d{10}$/.test(phone)) return bad("请输入有效11位手机号");

    // 检查手机号是否已被占用
    const [existPhone] = await rawSql`SELECT id, name FROM members WHERE phone = ${phone} AND status <> 'archived' LIMIT 1`.catch(() => []);
    if (existPhone) {
      return bad(`手机号 ${phone} 已被会员【${existPhone.name}】使用，不可重复录入`, 409);
    }

    // 自动分配唯一会员编号 LWxxxx
    const [maxIdRow] = await rawSql`SELECT MAX(id) as max_id FROM members`.catch(() => [{ max_id: 100 }]);
    const nextNum = (maxIdRow?.max_id || 100) + 1;
    const memberCode = `LW${String(nextNum).padStart(4, "0")}`;
    
    // 生成专属邀请码与登录PIN (支持小程序账号登录)
    const portalCode = memberCode;
    const loginPin = phone.slice(-4);

    const [newMem] = await rawSql`
      INSERT INTO members (
        name, phone, member_code, portal_code, login_pin,
        status, portal_enabled, joined_at, created_at, updated_at
      ) VALUES (
        ${name}, ${phone}, ${memberCode}, ${portalCode}, ${loginPin},
        'active', 1, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date, NOW(), NOW()
      )
      RETURNING id, name, phone, member_code, portal_code, login_pin
    `;

    return NextResponse.json({
      success: true,
      member: newMem,
      portalCode,
      loginPin,
      message: `会员【${name}】录入成功！专属邀请码：${portalCode}，登录验证码：${loginPin}`
    });
  }

  // 3. 修改课程信息（名称、分类、星级、简介）
  if (action === "update_course") {
    const courseId = Number(body.id);
    const name = String(body.name || "").trim();
    const categoryType = String(body.categoryType || "boutique");
    const difficultyStars = Math.max(1, Math.min(5, Number(body.difficultyStars || 3)));
    const description = String(body.description || "").trim();

    if (!courseId || !name) return bad("课程ID与名称不能为空");

    await rawSql`
      UPDATE course_categories
      SET name = ${name},
          category_type = ${categoryType},
          difficulty_stars = ${difficultyStars},
          description = ${description}
      WHERE id = ${courseId}
    `;

    return NextResponse.json({ success: true, message: `课程【${name}】已保存并同步小程序` });
  }

  // 4. 快速新增一节排课（教练/教室/时段冲突强校验，容量不超过教室容量）
  if (action === "create_session") {
    const courseCategoryId = Number(body.courseCategoryId);
    const coachId = Number(body.coachId) || null;
    const roomId = Number(body.roomId) || null;
    const sessionDate = String(body.sessionDate || "").trim();
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();
    const capacity = Number(body.capacity || 6);

    if (!courseCategoryId || !sessionDate || !startTime || !endTime) {
      return bad("排课缺少必要信息（课程、日期或时段）");
    }
    if (startTime >= endTime) {
      return bad("开始时间必须早于结束时间");
    }

    // 教室容量上限校验
    if (roomId) {
      const [room] = await rawSql`SELECT name, capacity FROM rooms WHERE id = ${roomId}`.catch(() => []);
      if (room && capacity > Number(room.capacity)) {
        return bad(`席位上限（${capacity}人）不可超过教室【${room.name}】的最大容纳人数（${room.capacity}人）`);
      }
    }

    // 同一教练时段冲突校验
    if (coachId) {
      const [coachCollision] = await rawSql`
        SELECT cs.id, cs.title, cs.start_time, cs.end_time, u.name as coach_name
        FROM class_sessions cs
        JOIN users u ON u.id = cs.coach_id
        WHERE cs.tenant_id = 1
          AND cs.session_date = ${sessionDate}
          AND cs.coach_id = ${coachId}
          AND cs.status <> 'cancelled'
          AND cs.start_time < ${endTime}
          AND cs.end_time > ${startTime}
        LIMIT 1
      `.catch(() => []);
      if (coachCollision) {
        return bad(`导师【${coachCollision.coach_name}】在同时段（${coachCollision.start_time}-${coachCollision.end_time}）已有课程【${coachCollision.title}】，不可冲突排课`);
      }
    }

    // 同一教室时段冲突校验
    if (roomId) {
      const [roomCollision] = await rawSql`
        SELECT cs.id, cs.title, cs.start_time, cs.end_time, r.name as room_name
        FROM class_sessions cs
        JOIN rooms r ON r.id = cs.room_id
        WHERE cs.tenant_id = 1
          AND cs.session_date = ${sessionDate}
          AND cs.room_id = ${roomId}
          AND cs.status <> 'cancelled'
          AND cs.start_time < ${endTime}
          AND cs.end_time > ${startTime}
        LIMIT 1
      `.catch(() => []);
      if (roomCollision) {
        return bad(`教室【${roomCollision.room_name}】在同时段（${roomCollision.start_time}-${roomCollision.end_time}）已被课程【${roomCollision.title}】占用，不可冲突排课`);
      }
    }

    const [course] = await rawSql`SELECT name FROM course_categories WHERE id = ${courseCategoryId} LIMIT 1`.catch(() => []);
    const title = course?.name || "普拉提课程";

    const [newSession] = await rawSql`
      INSERT INTO class_sessions (
        tenant_id, course_category_id, coach_id, room_id, title,
        session_date, start_time, end_time, capacity, booked_count,
        status, created_at, updated_at
      ) VALUES (
        1, ${courseCategoryId}, ${coachId}, ${roomId}, ${title},
        ${sessionDate}, ${startTime}, ${endTime}, ${capacity}, 0,
        'open', NOW(), NOW()
      )
      RETURNING id, title, session_date, start_time, end_time, capacity
    `;

    return NextResponse.json({ success: true, session: newSession, message: `排课成功：${sessionDate} ${startTime} ${title}` });
  }

  // 5. 取消排课场次（同步取消该场已有的有效预约并释放席位，防止孤儿预约）
  if (action === "cancel_session") {
    const sessionId = Number(body.sessionId);
    if (!sessionId) return bad("缺少 sessionId");

    const [session] = await rawSql`SELECT * FROM class_sessions WHERE id = ${sessionId} AND tenant_id = 1`.catch(() => []);
    if (!session) return bad("排课场次不存在", 404);
    if (session.status === "cancelled") {
      return NextResponse.json({ success: true, message: "该场次此前已处于取消状态", duplicate: true });
    }

    // 处理该场次现有的预约：全部标为 cancelled，释放席位
    const affectedBookings = await rawSql`
      UPDATE bookings
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancel_reason = ${body.reason || '会馆取消排课场次'},
          updated_at = NOW()
      WHERE session_id = ${sessionId} AND status = 'booked'
      RETURNING id, member_id
    `.catch(() => []);

    await rawSql`
      UPDATE class_sessions
      SET status = 'cancelled', booked_count = 0, updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      success: true,
      message: `排课场次已取消${affectedBookings.length > 0 ? `，已同步为 ${affectedBookings.length} 位已约学员取消预约` : ''}`,
      cancelledBookingsCount: affectedBookings.length
    });
  }

  // 6. 手机管家端：直接新建一门课程
  if (action === "create_course") {
    const name = String(body.name || "").trim();
    const categoryType = String(body.categoryType || "boutique");
    const difficultyStars = Math.max(1, Math.min(5, Number(body.difficultyStars || 3)));
    const description = String(body.description || "").trim();

    if (!name) return bad("课程名称不能为空");

    const [existing] = await rawSql`SELECT id FROM course_categories WHERE name = ${name} AND is_active = 1 LIMIT 1`.catch(() => []);
    if (existing) return bad(`课程【${name}】已存在，请勿重复创建`, 409);

    const courseKey = "c_" + Date.now().toString(36);
    const [newCourse] = await rawSql`
      INSERT INTO course_categories (tenant_id, key, name, category_type, difficulty_stars, description, is_active, created_at)
      VALUES (1, ${courseKey}, ${name}, ${categoryType}, ${difficultyStars}, ${description}, 1, NOW())
      RETURNING *
    `;

    return NextResponse.json({ success: true, course: newCourse, message: `新课程【${name}】已创建，可直接用于排课` });
  }

  // 7. 手机管家端：编辑修改已有排课场次（带完整冲突校验）
  if (action === "update_session") {
    const sessionId = Number(body.sessionId);
    if (!sessionId) return bad("缺少 sessionId");

    const [currSession] = await rawSql`SELECT * FROM class_sessions WHERE id = ${sessionId} AND tenant_id = 1`.catch(() => []);
    if (!currSession) return bad("场次不存在", 404);
    if (currSession.status === "cancelled") return bad("已取消的场次不可直接编辑，请重新发布");

    const courseCategoryId = Number(body.courseCategoryId) || currSession.course_category_id;
    const coachId = Number(body.coachId) || currSession.coach_id;
    const roomId = Number(body.roomId) || currSession.room_id;
    const sessionDate = String(body.sessionDate || currSession.session_date).trim();
    const startTime = String(body.startTime || currSession.start_time).trim();
    const endTime = String(body.endTime || currSession.end_time).trim();
    const capacity = Number(body.capacity || currSession.capacity);

    if (startTime >= endTime) return bad("开始时间必须早于结束时间");

    // 席位上限不能低于当前已预约的人数
    if (capacity < Number(currSession.booked_count || 0)) {
      return bad(`席位上限（${capacity}人）不能低于当前已预约人数（${currSession.booked_count}人）`);
    }

    // 教室容量校验
    if (roomId) {
      const [room] = await rawSql`SELECT name, capacity FROM rooms WHERE id = ${roomId}`.catch(() => []);
      if (room && capacity > Number(room.capacity)) {
        return bad(`席位上限（${capacity}人）不可超过教室【${room.name}】的最大容纳人数（${room.capacity}人）`);
      }
    }

    // 教练冲突校验（排除当前场次本身）
    if (coachId) {
      const [coachCollision] = await rawSql`
        SELECT cs.id, cs.title, cs.start_time, cs.end_time, u.name as coach_name
        FROM class_sessions cs
        JOIN users u ON u.id = cs.coach_id
        WHERE cs.tenant_id = 1
          AND cs.id <> ${sessionId}
          AND cs.session_date = ${sessionDate}
          AND cs.coach_id = ${coachId}
          AND cs.status <> 'cancelled'
          AND cs.start_time < ${endTime}
          AND cs.end_time > ${startTime}
        LIMIT 1
      `.catch(() => []);
      if (coachCollision) {
        return bad(`导师【${coachCollision.coach_name}】在同时段（${coachCollision.start_time}-${coachCollision.end_time}）已有课程【${coachCollision.title}】，不可冲突排课`);
      }
    }

    // 教室冲突校验（排除当前场次本身）
    if (roomId) {
      const [roomCollision] = await rawSql`
        SELECT cs.id, cs.title, cs.start_time, cs.end_time, r.name as room_name
        FROM class_sessions cs
        JOIN rooms r ON r.id = cs.room_id
        WHERE cs.tenant_id = 1
          AND cs.id <> ${sessionId}
          AND cs.session_date = ${sessionDate}
          AND cs.room_id = ${roomId}
          AND cs.status <> 'cancelled'
          AND cs.start_time < ${endTime}
          AND cs.end_time > ${startTime}
        LIMIT 1
      `.catch(() => []);
      if (roomCollision) {
        return bad(`教室【${roomCollision.room_name}】在同时段（${roomCollision.start_time}-${roomCollision.end_time}）已被课程【${roomCollision.title}】占用，不可冲突排课`);
      }
    }

    const [course] = await rawSql`SELECT name FROM course_categories WHERE id = ${courseCategoryId} LIMIT 1`.catch(() => []);
    const title = course?.name || currSession.title;

    await rawSql`
      UPDATE class_sessions
      SET course_category_id = ${courseCategoryId},
          coach_id = ${coachId},
          room_id = ${roomId},
          title = ${title},
          session_date = ${sessionDate},
          start_time = ${startTime},
          end_time = ${endTime},
          capacity = ${capacity},
          updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({ success: true, message: `场次已更新：${sessionDate} ${startTime} ${title}` });
  }

  // 8. 手机管家端：现场为学员开卡（发卡，支持次卡与期限卡，记入真实账目与卡流水）
  if (action === "issue_card") {
    const memberId = Number(body.memberId);
    const cardTypeId = Number(body.cardTypeId);
    if (!memberId || !cardTypeId) return bad("缺少会员或卡类型");

    const [member] = await rawSql`SELECT id, name, status FROM members WHERE id = ${memberId} AND tenant_id = 1`.catch(() => []);
    if (!member) return bad("会员不存在", 404);
    if (member.status === "archived") return bad("该会员已归档，不能开卡");

    const [ct] = await rawSql`SELECT * FROM card_types WHERE id = ${cardTypeId} AND tenant_id = 1 AND is_active = 1`.catch(() => []);
    if (!ct) return bad("所选卡类型不存在或已停用", 404);

    const validFrom = String(body.validFrom || (new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)));
    const customCount = body.customCount != null && body.customCount !== "" ? Number(body.customCount) : null;
    const customDays = body.customDays != null && body.customDays !== "" ? Number(body.customDays) : null;

    let totalCount: number | null = null;
    let remaining: number | null = null;
    let validUntil: string | null = null;

    const days = customDays !== null ? customDays : Number(ct.validity_days || 0);
    if (days > 0) {
      const dt = new Date(Date.now() + 8 * 3600_000 + days * 86400_000);
      validUntil = dt.toISOString().slice(0, 10);
    }

    if (ct.category === "count") {
      totalCount = customCount !== null ? customCount : Number(ct.total_count || 10);
      remaining = totalCount;
      if (totalCount <= 0) return bad("次数卡总次数必须大于0");
    } else {
      // 期限卡
      totalCount = customCount;
      remaining = totalCount;
      if (!validUntil) {
        // 默认 365 天
        const dt = new Date(Date.now() + 8 * 3600_000 + 365 * 86400_000);
        validUntil = dt.toISOString().slice(0, 10);
      }
    }

    const priceCents = Number(ct.price_cents || 0);

    const [newCard] = await rawSql`
      INSERT INTO member_cards (
        tenant_id, member_id, card_type_id, status,
        total_count, remaining_count, valid_from, valid_until,
        purchased_at, price_cents, created_at, updated_at
      ) VALUES (
        1, ${memberId}, ${cardTypeId}, 'active',
        ${totalCount}, ${remaining}, ${validFrom}, ${validUntil},
        ${validFrom}, ${priceCents}, NOW(), NOW()
      )
      RETURNING *
    `;

    // 写入流水
    await rawSql`
      INSERT INTO card_transactions (
        tenant_id, member_card_id, member_id, type, amount,
        balance_after, note, created_at
      ) VALUES (
        1, ${newCard.id}, ${memberId}, 'purchase', ${remaining ?? 0},
        ${remaining}, '管家手机端现场发卡', NOW()
      )
    `.catch(() => {});

    // 写入会员开卡礼盒待通知记录（会员登录/进入小程序自动弹窗送祝福）
    await rawSql`
      INSERT INTO member_card_notices (tenant_id, member_id, member_card_id, is_read, created_at)
      VALUES (1, ${memberId}, ${newCard.id}, 0, NOW())
      ON CONFLICT (member_card_id) DO NOTHING
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      card: newCard,
      message: `已成功为【${member.name}】开通【${ct.name}】${totalCount ? `（${totalCount}次）` : ''}`
    });
  }

  // 10. 新增教练导师
  if (action === "create_coach") {
    const name = String(body.name || "").trim();
    if (!name) return bad("教练姓名必填");
    const roleTitle = String(body.roleTitle || "资深塑形教练").trim();

    const [dup] = await rawSql`
      SELECT id FROM users
      WHERE tenant_id = 1 AND LOWER(TRIM(name)) = LOWER(${name}) AND is_coach = 1 AND status = 'active'
    `;
    if (dup) return bad(`教练「${name}」已在教练库中`, 409);

    const email = `coach-${Date.now()}@laiwu.local`;
    const [createdUser] = await rawSql`
      INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status, avatar_url)
      VALUES (1, ${name}, ${email}, 'disabled', 'coach', 1, 'active', ${body.avatarUrl || '/images/team/team-2.jpg'})
      RETURNING id, name, role, status
    `;

    await rawSql`
      INSERT INTO team_members (tenant_id, name, role_title, avatar_url, is_active, sort_order)
      VALUES (1, ${name}, ${roleTitle}, ${body.avatarUrl || '/images/team/team-2.jpg'}, 1, 50)
      ON CONFLICT DO NOTHING
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      coach: createdUser,
      message: `已成功添加教练导师【${name}】`
    });
  }

  // 11. 切换教练在职/启用状态
  if (action === "toggle_coach") {
    const id = Number(body.id || 0);
    const status = body.status === "inactive" ? "inactive" : "active";
    if (!id) return bad("缺少教练 id");

    await rawSql`UPDATE users SET status = ${status} WHERE id = ${id} AND tenant_id = 1`;
    const [u] = await rawSql`SELECT name FROM users WHERE id = ${id}`;
    if (u?.name) {
      await rawSql`UPDATE team_members SET is_active = ${status === 'active' ? 1 : 0} WHERE name = ${u.name}`.catch(() => {});
    }
    return NextResponse.json({ success: true, message: `已${status === 'active' ? '启用' : '停用'}该教练` });
  }

  // 12. 新建卡种规则
  if (action === "create_card_type") {
    const name = String(body.name || "").trim();
    const category = String(body.category || "count").trim();
    if (!name) return bad("卡种名称必填");
    if (!["count", "period"].includes(category)) return bad("卡类别只能是 count 或 period");
    const priceCents = Math.round(Number(body.price || 0) * 100);
    const totalCount = category === "count" ? Math.max(1, Math.round(Number(body.totalCount || 10))) : null;
    const validityDays = Math.max(1, Math.round(Number(body.validityDays || (category === 'period' ? 365 : 90))));

    const [ct] = await rawSql`
      INSERT INTO card_types (
        tenant_id, name, category, price_cents, total_count, validity_days, is_active, sort_order, created_at
      ) VALUES (
        1, ${name}, ${category}, ${priceCents}, ${totalCount}, ${validityDays}, 1, 10, NOW()
      ) RETURNING *
    `;

    const courseCategoryIds = Array.isArray(body.courseCategoryIds) ? body.courseCategoryIds : [];
    for (const cid of courseCategoryIds) {
      await rawSql`
        INSERT INTO card_type_courses (card_type_id, course_category_id)
        VALUES (${ct.id}, ${cid})
        ON CONFLICT DO NOTHING
      `.catch(() => {});
    }
    return NextResponse.json({ success: true, cardType: ct, message: `已成功创建卡种【${name}】` });
  }

  // 13. 启用/停用卡种
  if (action === "toggle_card_type") {
    const id = Number(body.id || 0);
    const isActive = body.isActive ? 1 : 0;
    if (!id) return bad("缺少 cardTypeId");
    await rawSql`UPDATE card_types SET is_active = ${isActive} WHERE id = ${id} AND tenant_id = 1`;
    return NextResponse.json({ success: true, message: `已${isActive ? '启用' : '停用'}卡种` });
  }

  // 14. 会员卡退卡 / 停卡办理
  if (action === "return_card") {
    const cardId = Number(body.cardId || 0);
    const reason = String(body.reason || "会员申请退卡/停用").trim();
    if (!cardId) return bad("缺少 cardId");

    const [mc] = await rawSql`SELECT * FROM member_cards WHERE id = ${cardId} AND tenant_id = 1`;
    if (!mc) return bad("会员卡不存在", 404);
    if (mc.status !== "active") return bad("该会员卡当前不是有效状态", 409);

    await rawSql`UPDATE member_cards SET status = 'refunded', updated_at = NOW() WHERE id = ${cardId}`;
    await rawSql`
      INSERT INTO card_transactions (
        tenant_id, member_card_id, member_id, type, amount, balance_after, note, created_at
      ) VALUES (
        1, ${cardId}, ${mc.member_id}, 'refund', 0, 0, ${'管家退卡/停用: ' + reason}, NOW()
      )
    `.catch(() => {});

    return NextResponse.json({ success: true, message: "已成功办理退卡/停用" });
  }

  // 15. 新增教室场地
  if (action === "create_room") {
    const name = String(body.name || "").trim();
    const capacity = Math.max(1, Number(body.capacity || 10));
    if (!name) return bad("教室名称必填");
    const [room] = await rawSql`
      INSERT INTO rooms (tenant_id, name, capacity, is_active, created_at)
      VALUES (1, ${name}, ${capacity}, 1, NOW())
      RETURNING *
    `;
    return NextResponse.json({ success: true, room, message: `已成功添加教室【${name}】` });
  }

  // 16. 管家代客约课
  if (action === "book_for_member") {
    const sessionId = Number(body.sessionId || 0);
    const memberId = Number(body.memberId || 0);
    if (!sessionId || !memberId) return bad("缺少场次或学员信息");

    const [sess] = await rawSql`SELECT * FROM class_sessions WHERE id = ${sessionId} AND tenant_id = 1`;
    if (!sess) return bad("场次不存在", 404);
    if (sess.status === "cancelled") return bad("该课程已取消", 409);

    const [existing] = await rawSql`
      SELECT id, status FROM bookings 
      WHERE session_id = ${sessionId} AND member_id = ${memberId} AND tenant_id = 1 AND status IN ('booked', 'attended')
    `;
    if (existing) return bad("该学员已在预约名单中", 409);

    // 检查是否有可用有效卡
    const [card] = await rawSql`
      SELECT mc.id, mc.remaining_count, ct.name as card_name
      FROM member_cards mc
      JOIN card_types ct ON ct.id = mc.card_type_id
      WHERE mc.member_id = ${memberId} AND mc.status = 'active'
        AND (mc.valid_until IS NULL OR mc.valid_until::date >= ${sess.session_date}::date)
        AND (ct.category = 'period' OR mc.remaining_count > 0)
      LIMIT 1
    `;
    if (!card) return bad("该会员没有可用于预约该课程的有效卡项，请先开卡", 409);

    const [booking] = await rawSql`
      INSERT INTO bookings (tenant_id, session_id, member_id, status, booked_at, created_at, updated_at)
      VALUES (1, ${sessionId}, ${memberId}, 'booked', NOW(), NOW(), NOW())
      RETURNING *
    `;

    await rawSql`
      UPDATE class_sessions
      SET booked_count = booked_count + 1, updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    const [m] = await rawSql`SELECT name FROM members WHERE id = ${memberId}`;
    return NextResponse.json({
      success: true,
      booking,
      message: `已成功为【${m?.name || '学员'}】代约本节课（使用卡项：${card.card_name}）`
    });
  }

  return bad("未知 action");
}
