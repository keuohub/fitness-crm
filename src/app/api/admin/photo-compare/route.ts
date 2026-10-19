import { NextRequest, NextResponse } from "next/server";
import { db, rawSql } from "@/db";
import { photos, members } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  try {
    const { memberId, photoId1, photoId2, analysis: manualAnalysis } = await request.json();
    if (!memberId || !photoId1 || !photoId2) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    const [member] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.id, memberId));
    if (!member) return NextResponse.json({ error: "会员不存在" }, { status: 404 });

    const photoRows = await db.select().from(photos).where(inArray(photos.id, [photoId1, photoId2]));
    if (photoRows.length !== 2) return NextResponse.json({ error: "照片不存在" }, { status: 404 });

    const p1 = photoRows[0], p2 = photoRows[1];
    const prompt = `你是小桥，请分析会员${member.name}的两张体态照片变化。\n照片1(${p1.takenAt} 类型:${p1.photoType}): ${p1.notes||"无备注"}\n照片2(${p2.takenAt} 类型:${p2.photoType}): ${p2.notes||"无备注"}\n\n用温暖具体的语言写一段分析，不超过200字。指出可见变化，如看不出变化则强调坚持的力量。永远用"你"称呼。不提AI/系统/数据/算法。署名：小桥`;

    // 小桥手写的评价优先；没写才让 AI 起草
    let analysis = typeof manualAnalysis === "string" ? manualAnalysis.trim() : "";
    if (!analysis) {
      const apiKey = process.env.DEEPSEEK_API_KEY || "";
      if (apiKey) {
        const res = await fetch(DEEPSEEK_API_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: "你是小桥" },{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 500 }) });
        if (res.ok) { const d = await res.json(); analysis = d.choices?.[0]?.message?.content?.trim() || ""; }
      }
    }

    const result = await rawSql`INSERT INTO photo_comparisons (tenant_id, member_id, photo_id_1, photo_id_2, analysis) VALUES (1, ${memberId}, ${photoId1}, ${photoId2}, ${analysis}) RETURNING id`;

    return NextResponse.json({ id: result[0].id, analysis, photo1: { date: p1.takenAt, type: p1.photoType }, photo2: { date: p2.takenAt, type: p2.photoType } });
  } catch (err) { console.error("photo-compare error:", err); return NextResponse.json({ error: "服务器错误" }, { status: 500 }); }
}

export async function GET(request: NextRequest) {
  const admin = getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  try {
    const rows = memberId 
      ? await rawSql`SELECT * FROM photo_comparisons WHERE member_id = ${parseInt(memberId)} ORDER BY created_at DESC LIMIT 10`
      : await rawSql`SELECT * FROM photo_comparisons ORDER BY created_at DESC LIMIT 20`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error("admin photo-compare error:", err);
    return NextResponse.json([]);
  }
}
