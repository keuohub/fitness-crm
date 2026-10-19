import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

function getSignKey(): string {
  return process.env.COOKIE_SIGN_KEY || process.env.ADMIN_PASSWORD || "CHANGE_ME";
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSignKey())
    .update(payload)
    .digest("hex");
}

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCode = (body.portalCode || body.accessCode || "").trim().toUpperCase();
    const phoneSuffix = (body.phoneSuffix || "").trim().replace(/\D/g, "");

    if (!rawCode) {
      return NextResponse.json({ error: "请输入专属邀请码" }, { status: 400 });
    }

    const allMembers = await db
      .select({
        id: members.id,
        name: members.name,
        phone: members.phone,
        joinedAt: members.joinedAt,
        portalEnabled: members.portalEnabled,
        portalCode: members.portalCode,
      })
      .from(members)
      .where(eq(members.portalEnabled, 1));

    const member = allMembers.find(
      (m) => m.portalCode && m.portalCode.trim().toUpperCase() === rawCode
    );

    if (!member) {
      return NextResponse.json({ error: "未找到该邀请码，请核对或联系小桥" }, { status: 404 });
    }

    // 防串号安全校验：若会员在册手机号存在且长度>=4
    if (member.phone && member.phone.replace(/\D/g, "").length >= 4) {
      const cleanPhone = member.phone.replace(/\D/g, "");
      // 如果会员有登记手机号，必须验证尾号后4位！如果不填或不匹配，坚决拦截
      if (!phoneSuffix) {
        return NextResponse.json({ error: "为保障您的私密档案安全，请输入手机尾号后4位" }, { status: 403 });
      }
      if (!cleanPhone.endsWith(phoneSuffix)) {
        return NextResponse.json({ error: "邀请码与手机尾号不匹配，请核对或联系小桥" }, { status: 403 });
      }
    }

    // 如果会员此前未录入手机号，而本次提供了尾号/手机号，则自动回填
    if (!member.phone && phoneSuffix && phoneSuffix.length === 11) {
      await db.update(members).set({ phone: phoneSuffix }).where(eq(members.id, member.id));
    }

    const response = NextResponse.json({
      memberId: member.id,
      memberName: member.name,
      joinedAt: member.joinedAt,
    });

    const commonOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE,
    };

    // Signed portal_member_id
    const rawId = String(member.id);
    const idSig = sign(rawId);
    response.cookies.set("portal_member_id", rawId, commonOpts);
    response.cookies.set("portal_member_sig", idSig, commonOpts);

    if (member.name) {
      const nonHttpOnly = { ...commonOpts, httpOnly: false };
      response.cookies.set("portal_member_name", encodeURIComponent(member.name), nonHttpOnly);
    }

    if (member.joinedAt) {
      const nonHttpOnly = { ...commonOpts, httpOnly: false };
      response.cookies.set("portal_joined_at", member.joinedAt, nonHttpOnly);
    }

    return response;
  } catch (err) {
    console.error("Portal login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
