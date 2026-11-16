import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/db";
import { requireAdmin } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));
  const offset = (page - 1) * limit;
  const keyword = (searchParams.get("keyword") || "").trim();
  const actionFilter = (searchParams.get("action") || "").trim();

  let whereClauses: string[] = ["1=1"];
  let params: any[] = [];

  if (keyword) {
    whereClauses.push(`(
      actor_name ILIKE $${params.length + 1} 
      OR actor_username ILIKE $${params.length + 1} 
      OR summary ILIKE $${params.length + 1}
    )`);
    params.push(`%${keyword}%`);
  }

  if (actionFilter) {
    whereClauses.push(`action = $${params.length + 1}`);
    params.push(actionFilter);
  }

  const whereSql = whereClauses.join(" AND ");

  try {
    const logs = await rawSql`
      SELECT id, actor_name, actor_username, action, entity_type, entity_id, summary, after_json, ip, created_at
      FROM audit_logs
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `.catch(() => []);

    const [{ count }] = await rawSql`
      SELECT COUNT(*)::int as count FROM audit_logs
    `.catch(() => [{ count: 0 }]);

    return NextResponse.json({
      logs: logs.map((l: any) => ({
        id: l.id,
        actorName: l.actor_name || "管理员",
        actorUsername: l.actor_username || "admin",
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        summary: l.summary || "操作记录",
        ip: l.ip || "127.0.0.1",
        createdAt: l.created_at,
      })),
      total: count,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("[api/admin/audit-logs] error:", err);
    return NextResponse.json({ error: "读取操作日志失败" }, { status: 500 });
  }
}
