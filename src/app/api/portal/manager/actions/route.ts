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
          m.member_code
        FROM bookings b
        JOIN members m ON b.member_id = m.id
        WHERE b.session_id = ANY(${sessionIds})
          AND b.status IN ('booked', 'attended')
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

    return NextResponse.json({
      success: true,
      card: newCard,
      message: `已成功为【${member.name}】开通【${ct.name}】${totalCount ? `（${totalCount}次）` : ''}`
    });
  }

  return bad("未知 action");
}
