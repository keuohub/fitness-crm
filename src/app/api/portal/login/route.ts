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
    const { portalCode } = await request.json();

    if (!portalCode || typeof portalCode !== "string" || portalCode.trim().length === 0) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const [member] = await db
      .select({
        id: members.id,
        name: members.name,
        joinedAt: members.joinedAt,
        portalEnabled: members.portalEnabled,
        portalCode: members.portalCode,
      })
      .from(members)
      .where(and(eq(members.portalCode, portalCode.trim()), eq(members.portalEnabled, 1)));

    if (!member) {
      return NextResponse.json({ error: "邀请码无效或未激活" }, { status: 404 });
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
