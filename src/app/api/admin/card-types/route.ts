import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { requireCatalogEditor } from "@/lib/auth/catalog-access";
import { db, rawSql } from "@/db";
import { cardTypes, cardTypeCourses } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return bad("需要管理员登录", 401);
  const rows = await db.select().from(cardTypes).orderBy(asc(cardTypes.sortOrder), asc(cardTypes.id));
  
  // 聚合关联课种
  const courses = await rawSql`
    SELECT card_type_id, course_category_id 
    FROM card_type_courses
    ORDER BY course_category_id ASC
  `;
  const courseMap = new Map<number, number[]>();
  for (const c of courses) {
    const list = courseMap.get(c.card_type_id) || [];
    list.push(Number(c.course_category_id));
    courseMap.set(c.card_type_id, list);
  }

  const result = rows.map((r) => ({
    ...r,
    courseCategoryIds: courseMap.get(r.id) || [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const denied = await requireCatalogEditor(request);
  if (denied) return denied;
  const body = await request.json();
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  if (!name) return bad("卡名称必填");
  if (!["count", "period"].includes(category)) return bad("卡类别只能是 count 或 period");
  const priceCents = Math.max(0, Math.round(Number(body.priceCents || 0)));
  const totalCount = category === "count" ? Math.max(1, Math.round(Number(body.totalCount || 0))) : null;
  const validityDays = category === "period" ? Math.max(1, Math.round(Number(body.validityDays || 0))) : (body.validityDays ? Math.max(1, Math.round(Number(body.validityDays))) : null);
  if (category === "count" && !totalCount) return bad("次数卡必须填写总次数");
  if (category === "period" && !validityDays) return bad("期限卡必须填写有效天数");

  const [row] = await db.insert(cardTypes).values({
    tenantId: 1,
    name,
    category,
    priceCents,
    totalCount: totalCount ?? null,
    validityDays: validityDays ?? null,
    weeklyLimit: body.weeklyLimit === "" || body.weeklyLimit == null ? null : Math.max(0, Math.round(Number(body.weeklyLimit))),
    freezeAllowed: body.freezeAllowed ? 1 : 0,
    transferAllowed: body.transferAllowed ? 1 : 0,
    isActive: body.isActive === 0 ? 0 : 1,
    sortOrder: body.sortOrder == null ? 0 : Math.round(Number(body.sortOrder)),
  }).returning();

  const courseCategoryIds = Array.isArray(body.courseCategoryIds)
    ? body.courseCategoryIds.map(Number).filter((n: number) => !isNaN(n) && n > 0)
    : [];

  if (courseCategoryIds.length > 0) {
    for (const cid of courseCategoryIds) {
      await rawSql`
        INSERT INTO card_type_courses (card_type_id, course_category_id)
        VALUES (${row.id}, ${cid})
        ON CONFLICT (card_type_id, course_category_id) DO NOTHING
      `;
    }
  }

  return NextResponse.json({ ...row, courseCategoryIds }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = await requireCatalogEditor(request);
  if (denied) return denied;
  const body = await request.json();
  const id = Number(body.id);
  if (!id) return bad("缺少 id");
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.category !== undefined) {
    if (!["count", "period"].includes(body.category)) return bad("卡类别只能是 count 或 period");
    patch.category = body.category;
  }
  if (body.priceCents !== undefined) patch.priceCents = Math.max(0, Math.round(Number(body.priceCents)));
  if (body.totalCount !== undefined) patch.totalCount = body.totalCount == null || body.totalCount === "" ? null : Math.max(1, Math.round(Number(body.totalCount)));
  if (body.validityDays !== undefined) patch.validityDays = body.validityDays == null || body.validityDays === "" ? null : Math.max(1, Math.round(Number(body.validityDays)));
  if (body.weeklyLimit !== undefined) patch.weeklyLimit = body.weeklyLimit == null || body.weeklyLimit === "" ? null : Math.max(0, Math.round(Number(body.weeklyLimit)));
  if (body.isActive !== undefined) patch.isActive = body.isActive ? 1 : 0;
  if (body.sortOrder !== undefined) patch.sortOrder = Math.round(Number(body.sortOrder));

  let row = null;
  if (Object.keys(patch).length > 0) {
    const [updated] = await db.update(cardTypes).set(patch).where(eq(cardTypes.id, id)).returning();
    row = updated;
  } else {
    const [existing] = await db.select().from(cardTypes).where(eq(cardTypes.id, id));
    row = existing;
  }
  if (!row) return bad("卡类型不存在", 404);

  let courseCategoryIds = body.courseCategoryIds;
  if (Array.isArray(courseCategoryIds)) {
    const validIds = courseCategoryIds.map(Number).filter((n: number) => !isNaN(n) && n > 0);
    await rawSql`DELETE FROM card_type_courses WHERE card_type_id = ${id}`;
    for (const cid of validIds) {
      await rawSql`
        INSERT INTO card_type_courses (card_type_id, course_category_id)
        VALUES (${id}, ${cid})
        ON CONFLICT (card_type_id, course_category_id) DO NOTHING
      `;
    }
    courseCategoryIds = validIds;
  } else {
    const existingCourses = await rawSql`
      SELECT course_category_id FROM card_type_courses WHERE card_type_id = ${id}
    `;
    courseCategoryIds = existingCourses.map((c: any) => Number(c.course_category_id));
  }

  return NextResponse.json({ ...row, courseCategoryIds });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireCatalogEditor(request);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return bad("缺少 id");
  const [existing] = await db.select().from(cardTypes).where(eq(cardTypes.id, id));
  if (!existing) return bad("卡类型不存在", 404);
  const [used] = await rawSql`SELECT COUNT(*)::int AS n FROM member_cards WHERE card_type_id = ${id}`;
  const usedCount = Number(used?.n || 0);
  if (usedCount > 0) return bad(`已有 ${usedCount} 张会员卡引用该卡种，不能删除，请改用停用`, 409);
  await rawSql`DELETE FROM card_type_courses WHERE card_type_id = ${id}`;
  await db.delete(cardTypes).where(eq(cardTypes.id, id));
  return NextResponse.json({ success: true });
}
