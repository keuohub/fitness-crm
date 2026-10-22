import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db } from "@/db";
import { cardTypes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
  const rows = await db.select().from(cardTypes).orderBy(asc(cardTypes.sortOrder), asc(cardTypes.id));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
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
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAdmin(request)) return bad("需要管理员登录", 401);
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
  if (!Object.keys(patch).length) return bad("没有可更新字段");
  const [row] = await db.update(cardTypes).set(patch).where(eq(cardTypes.id, id)).returning();
  if (!row) return bad("卡类型不存在", 404);
  return NextResponse.json(row);
}
