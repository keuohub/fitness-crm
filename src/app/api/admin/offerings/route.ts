import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db, rawSql } from "@/db";
import { courseOfferings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

const DEFAULT_OFFERINGS = [
  {
    num: "01",
    name: "精选普拉提",
    enName: "CURATED PILATES",
    summary: "深层核心唤醒 · 脊柱逐节舒展 · 呼吸优雅重构",
    target: "",
    highlight: "沉浸于轻柔专注的呼吸律动中，由内而外唤醒深层盆底肌与腹横肌，释放肩颈与背部日常紧绷，重塑轻盈挺拔的女性仪态与柔韧力量。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    num: "02",
    name: "高定大器械",
    enName: "BESPOKE EQUIPMENT",
    summary: "德国原木核心床 · 弹簧离心雕刻 · 关节零负担延展",
    target: "",
    highlight: "在高精度弹簧阻力的精妙对抗中，精准激活日常难以触及的深层细小肌群，重塑纤细修长线条，重获骨盆中立与挺拔流畅的力学美感。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    num: "03",
    name: "维密减脂超模班",
    enName: "RUNWAY SCULPT & BURN",
    summary: "间歇心率节律 · 天鹅颈直角肩雕刻 · 臀腿比例重塑",
    target: "",
    highlight: "结合普拉提精细控制与轻盈燃脂节律，集中雕琢锁骨线条、天鹅颈与紧致腰腹弧度，提拉紧致下半身线条，收获如超模般舒展挺拔的从容气场。",
    sortOrder: 3,
    isActive: 1,
  },
  {
    num: "04",
    name: "瑜伽",
    enName: "MINDFUL YOGA",
    summary: "经络柔韧流转 · 正念深层觉知 · 身心沉静滋养",
    target: "",
    highlight: "在静谧温润的氛围中跟随呼吸舒展全身筋膜，平复日常繁杂情绪与疲惫，赋予关节深层润泽与舒展，唤醒身体内在的平衡与宁静之美。",
    sortOrder: 4,
    isActive: 1,
  },
  {
    num: "05",
    name: "私教",
    enName: "PRIVATE MENTORSHIP",
    summary: "主理团队全维度定制 · 专属体态档案 · 一对一私享雕琢",
    target: "",
    highlight: "专注你的每一次呼吸节律与发力细节，根据个人身体状态与周期节奏量身定制专属方案，用细腻手感与专业口令，陪伴你见证身体的每一次从容蜕变。",
    sortOrder: 5,
    isActive: 1,
  },
];

async function ensureTableAndSeed() {
  await rawSql`
    CREATE TABLE IF NOT EXISTS course_offerings (
      id SERIAL PRIMARY KEY,
      num TEXT NOT NULL,
      name TEXT NOT NULL,
      en_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      target TEXT NOT NULL,
      highlight TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  const rows = await db.select().from(courseOfferings);
  if (!rows || rows.length === 0) {
    for (const off of DEFAULT_OFFERINGS) {
      await db.insert(courseOfferings).values({
        num: off.num,
        name: off.name,
        enName: off.enName,
        summary: off.summary,
        target: off.target,
        highlight: off.highlight,
        sortOrder: off.sortOrder,
        isActive: off.isActive,
      });
    }
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureTableAndSeed();
    const rows = await db
      .select()
      .from(courseOfferings)
      .orderBy(asc(courseOfferings.sortOrder));
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/admin/offerings error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureTableAndSeed();
    const body = await req.json();
    const { num, name, enName, summary, target, highlight, sortOrder = 0, isActive = 1 } = body;
    if (!name || !summary) {
      return NextResponse.json({ error: "项目名称和核心概要为必填项" }, { status: 400 });
    }

    const [created] = await db
      .insert(courseOfferings)
      .values({
        num: num || "01",
        name,
        enName: enName || name.toUpperCase(),
        summary,
        target: target || "",
        highlight: highlight || "",
        sortOrder: Number(sortOrder) || 0,
        isActive: Number(isActive) || 1,
      })
      .returning();

    invalidateCache("offerings");
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, num, name, enName, summary, target, highlight, sortOrder, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (num !== undefined) updateData.num = num;
    if (name !== undefined) updateData.name = name;
    if (enName !== undefined) updateData.enName = enName;
    if (summary !== undefined) updateData.summary = summary;
    if (target !== undefined) updateData.target = target;
    if (highlight !== undefined) updateData.highlight = highlight;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    const [updated] = await db
      .update(courseOfferings)
      .set(updateData)
      .where(eq(courseOfferings.id, Number(id)))
      .returning();

    invalidateCache("offerings");
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    await db.delete(courseOfferings).where(eq(courseOfferings.id, Number(id)));
    invalidateCache("offerings");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
