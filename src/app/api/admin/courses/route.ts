import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const rows = await rawSql`SELECT * FROM course_categories WHERE tenant_id = 1 ORDER BY sort_order, id`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const key = String(b.key || "").trim();
  const name = String(b.name || "").trim();
  if (!key || !name) return bad("key 和名称必填");
  if (!/^[a-z0-9_]+$/.test(key)) return bad("key 只能是小写字母、数字、下划线");
  const [dup] = await rawSql`SELECT id FROM course_categories WHERE tenant_id = 1 AND key = ${key}`;
  if (dup) return bad("key 已存在", 409);
  const [row] = await rawSql`
    INSERT INTO course_categories (tenant_id, key, name, duration_minutes, default_capacity, color, category_type, difficulty_stars, cover_image, description, sort_order, is_active)
    VALUES (1, ${key}, ${name}, ${Math.max(1, Number(b.durationMinutes || 60))}, ${Math.max(1, Number(b.defaultCapacity || 6))},
            ${b.color || null}, ${b.categoryType || 'boutique'}, ${Math.min(5, Math.max(1, Number(b.difficultyStars || 3)))},
            ${b.coverImage || ''}, ${b.description || ''}, ${Number(b.sortOrder || 0)}, ${b.isActive === 0 ? 0 : 1})
    RETURNING *`;
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const b = await request.json();
  const id = Number(b.id);
  if (!id) return bad("缺少 id");
  const [existing] = await rawSql`SELECT * FROM course_categories WHERE id = ${id} AND tenant_id = 1`;
  if (!existing) return bad("课程不存在", 404);
  const [row] = await rawSql`
    UPDATE course_categories SET
      name = ${b.name !== undefined ? String(b.name).trim() : existing.name},
      duration_minutes = ${b.durationMinutes !== undefined ? Math.max(1, Number(b.durationMinutes)) : existing.duration_minutes},
      default_capacity = ${b.defaultCapacity !== undefined ? Math.max(1, Number(b.defaultCapacity)) : existing.default_capacity},
      color = ${b.color !== undefined ? (b.color || null) : existing.color},
      category_type = ${b.categoryType !== undefined ? String(b.categoryType).trim() : (existing.category_type || 'boutique')},
      difficulty_stars = ${b.difficultyStars !== undefined ? Math.min(5, Math.max(1, Number(b.difficultyStars))) : (existing.difficulty_stars || 3)},
      cover_image = ${b.coverImage !== undefined ? String(b.coverImage).trim() : (existing.cover_image || '')},
      description = ${b.description !== undefined ? String(b.description).trim() : (existing.description || '')},
      sort_order = ${b.sortOrder !== undefined ? Number(b.sortOrder) : existing.sort_order},
      is_active = ${b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.is_active}
    WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少 id");
  const [used] = await rawSql`SELECT id FROM class_sessions WHERE course_category_id = ${id} LIMIT 1`;
  if (used) return bad("已有课次使用该课种，不能删除；可改为停用", 409);
  const [linked] = await rawSql`SELECT COUNT(*)::int AS n FROM card_type_courses WHERE course_category_id = ${id}`;
  const linkedCount = Number(linked?.n || 0);
  if (linkedCount > 0) return bad(`已有 ${linkedCount} 个卡种勾选该课种，不能删除；可改为停用`, 409);
  const [row] = await rawSql`DELETE FROM course_categories WHERE id = ${id} AND tenant_id = 1 RETURNING *`;
  if (!row) return bad("课程不存在", 404);
  return NextResponse.json({ success: true, row });
}
