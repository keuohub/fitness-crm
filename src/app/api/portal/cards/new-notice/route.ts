import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const memberId = await getPortalMemberId(request);
    if (!memberId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 1. 查询该会员是否有未读的开卡通知
    let [notice] = await rawSql`
      SELECT mcn.id AS notice_id, mcn.member_card_id, mcn.created_at AS notice_time,
             mc.id AS card_id, mc.total_count, mc.remaining_count, mc.valid_from, mc.valid_until,
             ct.id AS card_type_id, ct.name AS card_name, ct.category,
             m.name AS member_name
      FROM member_card_notices mcn
      JOIN member_cards mc ON mc.id = mcn.member_card_id
      JOIN card_types ct ON ct.id = mc.card_type_id
      JOIN members m ON m.id = mc.member_id
      WHERE mcn.member_id = ${memberId}
        AND mcn.is_read = 0
        AND mc.status = 'active'
      ORDER BY mcn.id DESC
      LIMIT 1
    `.catch(() => []);

    // 2. 兜底策略：如果 notice 表里没有，检查会员在最近 7 天内新开但从未写入过 notice 的 active 卡
    if (!notice) {
      const [recentCard] = await rawSql`
        SELECT mc.id AS card_id, mc.total_count, mc.remaining_count, mc.valid_from, mc.valid_until,
               ct.id AS card_type_id, ct.name AS card_name, ct.category,
               m.name AS member_name
        FROM member_cards mc
        JOIN card_types ct ON ct.id = mc.card_type_id
        JOIN members m ON m.id = mc.member_id
        WHERE mc.member_id = ${memberId}
          AND mc.status = 'active'
          AND mc.created_at >= NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM member_card_notices mcn WHERE mcn.member_card_id = mc.id
          )
        ORDER BY mc.id DESC
        LIMIT 1
      `.catch(() => []);

      if (recentCard) {
        const [insertedNotice] = await rawSql`
          INSERT INTO member_card_notices (tenant_id, member_id, member_card_id, is_read, created_at)
          VALUES (1, ${memberId}, ${recentCard.card_id}, 0, NOW())
          ON CONFLICT (member_card_id) DO NOTHING
          RETURNING id AS notice_id
        `.catch(() => []);
        if (insertedNotice) {
          notice = {
            ...recentCard,
            notice_id: insertedNotice.notice_id,
          };
        }
      }
    }

    if (!notice) {
      return NextResponse.json({ hasNotice: false });
    }

    // 3. 获取该卡种适用的课程类目
    const courses = await rawSql`
      SELECT cc.name
      FROM card_type_courses ctc
      JOIN course_categories cc ON cc.id = ctc.course_category_id
      WHERE ctc.card_type_id = ${notice.card_type_id}
      ORDER BY ctc.course_category_id ASC
    `.catch(() => []);

    const allowedCourses = courses.map((c: any) => c.name);
    const courseScopeText = allowedCourses.length > 0 
      ? allowedCourses.join(" · ") 
      : (notice.category === "period" ? "全馆课程通用（除私教外）" : "全馆通用");

    // 格式化有效期
    const validUntilText = notice.valid_until ? String(notice.valid_until).slice(0, 10) : "长期有效";
    const validFromText = notice.valid_from ? String(notice.valid_from).slice(0, 10) : "今日起生效";

    return NextResponse.json({
      hasNotice: true,
      notice: {
        noticeId: notice.notice_id,
        cardId: notice.card_id,
        cardName: notice.card_name,
        category: notice.category,
        categoryName: notice.category === "count" ? "课时次卡" : "尊享期限卡",
        totalCount: notice.total_count,
        remainingCount: notice.remaining_count,
        validFrom: validFromText,
        validUntil: validUntilText,
        courseScopeText,
        memberName: notice.member_name || "尊贵会员",
        greeting: `亲爱的 ${notice.member_name || "会员"}：`,
        title: "专属卡项已为您尊贵开启",
        blessing: "愿每一次呼吸与伸展，都雕琢出挺拔与从容。在徕舞的每一刻，我们陪伴你的优雅蜕变。",
      }
    });
  } catch (err: any) {
    console.error("[new-notice error]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const memberId = await getPortalMemberId(request);
    if (!memberId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const noticeId = Number(body.noticeId || 0);
    const cardId = Number(body.cardId || 0);

    if (noticeId) {
      await rawSql`
        UPDATE member_card_notices
        SET is_read = 1, read_at = NOW()
        WHERE id = ${noticeId} AND member_id = ${memberId}
      `;
    } else if (cardId) {
      await rawSql`
        UPDATE member_card_notices
        SET is_read = 1, read_at = NOW()
        WHERE member_card_id = ${cardId} AND member_id = ${memberId}
      `;
    }

    return NextResponse.json({ success: true, message: "已确认新卡通知" });
  } catch (err: any) {
    console.error("[ack-notice error]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
