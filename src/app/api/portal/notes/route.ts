import { NextRequest, NextResponse } from "next/server";
import { getPortalMemberId } from "@/lib/auth/member-session";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  const memberId = await getPortalMemberId(request);
  if (!memberId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const rows = await rawSql`
    SELECT n.id, n.session_id, n.content, n.image_url, n.created_at,
           s.session_date, s.start_time, s.end_time,
           c.name AS course_name, u.name AS coach_name
    FROM post_class_notes n
    LEFT JOIN class_sessions s ON s.id = n.session_id
    LEFT JOIN course_categories c ON c.id = s.course_category_id
    LEFT JOIN users u ON u.id = n.coach_id
    WHERE n.tenant_id = 1 AND n.member_id = ${memberId}
    ORDER BY n.created_at DESC LIMIT 30`;
  const response = NextResponse.json({ notes: rows });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
