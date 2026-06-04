import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, memberSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { verifySMSCode } from "@/lib/auth/sms";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || typeof phone !== "string" || !/^\d{11}$/.test(phone.trim())) {
      return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
    }

    // 通过 sms_codes 表验证（开发环境 123456 也通过此流程）
    const isValid = await verifySMSCode(phone.trim(), code.trim());
    if (!isValid) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    // 查 member
    const [member] = await db
      .select({
        id: members.id,
        name: members.name,
        joinedAt: members.joinedAt,
        portalEnabled: members.portalEnabled,
      })
      .from(members)
      .where(and(eq(members.phone, phone.trim()), eq(members.portalEnabled, 1)));

    if (!member) {
      return NextResponse.json({ error: "该手机号未开通 Portal 访问" }, { status: 404 });
    }

    // 生成 session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + MAX_AGE * 1000).toISOString();

    await db.insert(memberSessions).values({
      memberId: member.id,
      token,
      expiresAt,
    });

    // 标记 phone_verified
    await db
      .update(members)
      .set({ phoneVerified: 1 })
      .where(eq(members.id, member.id));

    const response = NextResponse.json({
      memberId: member.id,
      memberName: member.name,
      joinedAt: member.joinedAt,
      loginType: "phone",
    });

    const commonOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE,
    };

    response.cookies.set("member_session", token, commonOpts);

    const nonHttpOnly = { ...commonOpts, httpOnly: false };
    if (member.name) {
      response.cookies.set("portal_member_name", encodeURIComponent(member.name), nonHttpOnly);
    }
    if (member.joinedAt) {
      response.cookies.set("portal_joined_at", member.joinedAt, nonHttpOnly);
    }

    return response;
  } catch (err) {
    console.error("Phone login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
