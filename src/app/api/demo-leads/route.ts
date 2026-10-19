import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { demoLeads } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, city, studioName, memberScale } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "姓名和手机号为必填" }, { status: 400 });
    }

    const record = await db.insert(demoLeads).values({
      name,
      phone,
      city: city || null,
      studioName: studioName || null,
      memberScale: memberScale || null,
    }).returning();

    return NextResponse.json({ success: true, id: record[0].id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
