import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachId } from "@/lib/auth/coach-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

async function ownSession(sessionId: number, coachId: number) {
  const [s] = await rawSql`SELECT * FROM class_sessions WHERE id = ${sessionId} AND tenant_id = 1`;
  return s && s.coach_id === coachId ? s : null;
}

export async function GET(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return bad("教练未登录", 401);
  const sessionId = Number(new URL(request.url).searchParams.get("sessionId"));
  if (!sessionId) return bad("缺少 sessionId");
  if (!(await ownSession(sessionId, coachId))) return bad("无权查看该课记录", 403);
  const rows = await rawSql`
    SELECT n.id, n.session_id, n.member_id, n.content, n.image_url, n.created_at,
           m.name AS member_name
    FROM post_class_notes n JOIN members m ON m.id = n.member_id
    WHERE n.tenant_id = 1 AND n.session_id = ${sessionId}
    ORDER BY n.id DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const coachId = await getActiveCoachId(request);
  if (!coachId) return bad("教练未登录", 401);
  const body = await request.json();
  const sessionId = Number(body.sessionId), memberId = Number(body.memberId);
  const content = String(body.content || "").trim();
  if (!sessionId || !memberId) return bad("缺少课次或会员");
  if (!content) return bad("记录内容不能为空");
  if (content.length > 1000) return bad("记录最多 1000 字");
  if (!(await ownSession(sessionId, coachId))) return bad("无权给该课写记录", 403);

  const [att] = await rawSql`
    SELECT a.id, b.status AS booking_status
    FROM attendance a JOIN bookings b ON b.id = a.booking_id
    WHERE a.session_id = ${sessionId} AND a.member_id = ${memberId} AND a.tenant_id = 1`;
  if (!att) return bad("该会员尚未签到，不能写课后记录", 409);

  const [row] = await rawSql`
    INSERT INTO post_class_notes (tenant_id, session_id, member_id, coach_id, content, image_url)
    VALUES (1, ${sessionId}, ${memberId}, ${coachId}, ${content}, ${body.imageUrl || null})
    RETURNING *`;
  return NextResponse.json(row, { status: 201 });
}
