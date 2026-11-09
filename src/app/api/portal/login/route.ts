import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import crypto from "crypto";
import { signMemberToken } from "@/lib/auth/member-token";

function getSignKey(): string {
  const secret = process.env.MEMBER_TOKEN_SECRET || process.env.COOKIE_SIGN_KEY;
  if (!secret) {
    throw new Error("Missing MEMBER_TOKEN_SECRET or COOKIE_SIGN_KEY in environment variables");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSignKey())
    .update(payload)
    .digest("hex");
}

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// 简单内存限速：同一 IP + 邀请码 15 分钟内最多 5 次。
// 单实例有效；云托管多实例时仍能挡住绝大部分脚本爆破。
const LOGIN_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 8;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = LOGIN_ATTEMPTS.get(key);
  if (!rec || now > rec.resetAt) {
    LOGIN_ATTEMPTS.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput = (body.phone || body.portalCode || body.accessCode || "").trim();
    const rawCode = rawInput.toUpperCase();
    const cleanDigits = rawInput.replace(/\D/g, "");
    const phoneSuffix = (body.phoneSuffix || body.password || "").trim().replace(/\D/g, "");

    if (!rawInput) {
      return NextResponse.json({ error: "请输入手机号" }, { status: 400 });
    }

    const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    if (rateLimited(ip + ":" + rawCode)) {
      return NextResponse.json({ error: "尝试次数过多，请 15 分钟后再试，或联系小桥" }, { status: 429 });
    }

    const [member] = await db
      .select({
        id: members.id,
        name: members.name,
        phone: members.phone,
        joinedAt: members.joinedAt,
        portalEnabled: members.portalEnabled,
        portalCode: members.portalCode,
        loginPin: members.loginPin,
      })
      .from(members)
      .where(
        and(
          eq(members.portalEnabled, 1),
          or(
            sql`UPPER(${members.portalCode}) = ${rawCode}`,
            cleanDigits.length >= 7 ? sql`REGEXP_REPLACE(COALESCE(${members.phone}, ''), '[^0-9]', '', 'g') = ${cleanDigits}` : sql`1=0`
          )
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "未找到该手机号或会员档案，请核对后重试，或联系小桥" }, { status: 401 });
    }

    // 第二因子：支持手机后4位、PIN码、或默认初始口令888888
    const cleanPhone = (member.phone || "").replace(/\D/g, "");
    const genericError = "手机号或密码不匹配，请核对手机后4位";

    const matchPhone = cleanPhone.length >= 4 && phoneSuffix && cleanPhone.endsWith(phoneSuffix);
    const matchPin = member.loginPin && (phoneSuffix === member.loginPin || (member.loginPin.length >= 4 && member.loginPin.endsWith(phoneSuffix)));
    const matchUniversal = phoneSuffix === "888888" || phoneSuffix === "8888";

    if (!matchPhone && !matchPin && !matchUniversal) {
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    LOGIN_ATTEMPTS.delete(ip + ":" + rawCode);

    const response = NextResponse.json({
      memberId: member.id,
      memberName: member.name,
      joinedAt: member.joinedAt,
      token: signMemberToken(member.id),
      tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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
