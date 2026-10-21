import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { courseOfferings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

const DEFAULT_OFFERINGS = [
  {
    num: "01",
    name: "精选普拉提",
    enName: "CURATED PILATES",
    summary: "垫上核心激活 · 呼吸模式调整 · 脊柱逐节灵动",
    target: "久坐办公肩颈紧绷、初次接触普拉提、需要建立身体深层觉知的练习者。",
    highlight: "垫上核心控制与小工具（普拉提球、弹力阻力圈）紧密结合，循序渐进唤醒腹横肌与盆底肌，改善胸椎灵活性与肋骨外翻。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    num: "02",
    name: "高定大器械",
    enName: "BESPOKE EQUIPMENT",
    summary: "弹簧阻力精准对抗 · 关节减压 · 离心深层雕刻",
    target: "期望精准塑形、改善骨盆倾斜/假胯宽、需要大器械精准辅助发力的会员。",
    highlight: "利用滑行台与各级阻力弹簧，在不稳定支撑面中激活深层肌群，强化核心抗旋转与抗伸展能力，塑造修长紧实无赘肉的线条。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    num: "03",
    name: "维密减脂超模班",
    enName: "RUNWAY SCULPT & BURN",
    summary: "间歇燃脂节律 · 直角肩天鹅颈雕刻 · 臀腿比例重塑",
    target: "备婚出镜、产后减脂塑形、追求紧致挺拔身姿与修长四肢线条的学员。",
    highlight: "将普拉提精细控制与科学燃脂心率结合，集中雕刻锁骨、下颌线、腹斜肌与臀部曲线，高效燃脂同时防止肌肉代偿粗壮。",
    sortOrder: 3,
    isActive: 1,
  },
  {
    num: "04",
    name: "瑜伽",
    enName: "MINDFUL YOGA",
    summary: "经络柔韧舒展 · 正念呼吸引导 · 神经系统深度放松",
    target: "日常工作压力大、关节僵硬、入眠困难或需要身心深度修复的会员。",
    highlight: "沉静平缓的体式流转配合深长腹式呼吸，温和拉伸筋膜群，降低皮质醇水平，让身心在静谧中重获轻盈安宁。",
    sortOrder: 4,
    isActive: 1,
  },
  {
    num: "05",
    name: "私教",
    enName: "PRIVATE MENTORSHIP",
    summary: "一对一定制方案 · 动态体态纠偏 · 全周期身心档案",
    target: "对隐私度与训练效果有极高要求、有产后修复/运动损伤/特殊体态诉求的会员。",
    highlight: "主理导师全程一对一专注观察发力细节，根据当日身体疲劳度与周期生理状态实时微调动作阻力与训练节奏，确保每节课的精准反馈。",
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

export async function GET() {
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
