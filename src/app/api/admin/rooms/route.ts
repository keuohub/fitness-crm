import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const rows = await rawSql`SELECT * FROM rooms WHERE tenant_id = 1 ORDER BY id`;
  return NextResponse.json(rows);
}
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const b = await request.json();
  const name = String(b.name || "").trim();
  if (!name) return bad("教室名称必填");
  const [dup] = await rawSql`SELECT id FROM rooms WHERE tenant_id = 1 AND name = ${name}`;
  if (dup) return bad("教室已存在", 409);
  const [row] = await rawSql`
    INSERT INTO rooms (tenant_id, name, capacity, is_active)
    VALUES (1, ${name}, ${Math.max(1, Number(b.capacity || 10))}, ${b.isActive === 0 ? 0 : 1})
    RETURNING *`;
  return NextResponse.json(row, { status: 201 });
}
export async function PUT(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const b = await request.json();
  const id = Number(b.id);
  if (!id) return bad("缺少 id");
  const [existing] = await rawSql`SELECT * FROM rooms WHERE id = ${id} AND tenant_id = 1`;
  if (!existing) return bad("教室不存在", 404);
  const [row] = await rawSql`
    UPDATE rooms SET
      name = ${b.name !== undefined ? String(b.name).trim() : existing.name},
      capacity = ${b.capacity !== undefined ? Math.max(1, Number(b.capacity)) : existing.capacity},
      is_active = ${b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.is_active}
    WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  return NextResponse.json(row);
}
export async function DELETE(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少 id");
  const [used] = await rawSql`SELECT id FROM class_sessions WHERE room_id = ${id} LIMIT 1`;
  if (used) return bad("已有课次使用该教室，不能删除；可停用", 409);
  const [row] = await rawSql`UPDATE rooms SET is_active = 0 WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  if (!row) return bad("教室不存在", 404);
  return NextResponse.json({ success: true, row });
}
