import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function getSignKey(): string {
  return process.env.COOKIE_SIGN_KEY || process.env.ADMIN_PASSWORD || "CHANGE_ME";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSignKey()).update(payload).digest("hex");
}

const MAX_AGE = 60 * 60 * 24 * 30; // 30天

export async function POST(request: NextRequest) {
  try {
    const { code, nickName, avatarUrl } = await request.json();

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "缺少登录凭证 code" }, { status: 400 });
    }

    const appId = process.env.WECHAT_APPID;
    const appSecret = process.env.WECHAT_APPSECRET;

    if (!appId || !appSecret) {
      console.error("[wechat-login] WECHAT_APPID 或 WECHAT_APPSECRET 未配置");
      return NextResponse.json({ error: "微信登录暂未配置" }, { status: 503 });
    }

    // 1. 调用微信接口换取 openid
    const wxUrl =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    let wxData: { openid?: string; errcode?: number; errmsg?: string };
    try {
      const wxRes = await fetch(wxUrl);
      wxData = await wxRes.json();
    } catch {
      return NextResponse.json({ error: "微信服务请求失败" }, { status: 502 });
    }

    if (wxData.errcode || !wxData.openid) {
      console.error("[wechat-login] 换取 openid 失败:", wxData);
      return NextResponse.json(
        { error: wxData.errmsg || "微信登录失败" },
        { status: 400 }
      );
    }

    const openid = wxData.openid;
    let isNewMember = false;

    // 2. 查找已有会员
    const [existingMember] = await db
      .select({
        id: members.id,
        name: members.name,
        joinedAt: members.joinedAt,
      })
      .from(members)
      .where(eq(members.wechatOpenId, openid))
      .limit(1);

    let memberId: number;
    let memberName: string;
    let joinedAt: string | null;

    if (existingMember) {
      // 老会员，直接登录
      memberId = existingMember.id;
      memberName = existingMember.name || "你";
      joinedAt = existingMember.joinedAt || null;
    } else {
      // 新会员，创建
      const name = nickName || "微信用户";
      const [newMember] = await db
        .insert(members)
        .values({
          tenantId: 1,
          name,
          wechatOpenId: openid,
          avatarUrl: avatarUrl || null,
          status: "active",
          portalEnabled: 1,
          portalCode: "WX" + openid.slice(-8).toUpperCase(),
          joinedAt: new Date().toISOString().slice(0, 10),
        })
        .returning();

      memberId = newMember.id;
      memberName = name;
      joinedAt = newMember.joinedAt || null;
      isNewMember = true;
    }

    // 3. 设置 Cookie（与邀请码登录保持一致）
    const response = NextResponse.json({
      memberId,
      memberName,
      joinedAt,
      isNewMember,
    });

    const commonOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE,
    };

    const rawId = String(memberId);
    const idSig = sign(rawId);
    response.cookies.set("portal_member_id", rawId, commonOpts);
    response.cookies.set("portal_member_sig", idSig, commonOpts);

    if (memberName) {
      response.cookies.set("portal_member_name", encodeURIComponent(memberName), {
        ...commonOpts,
        httpOnly: false,
      });
    }

    if (joinedAt) {
      response.cookies.set("portal_joined_at", joinedAt, {
        ...commonOpts,
        httpOnly: false,
      });
    }

    return response;
  } catch (err) {
    console.error("[wechat-login] 服务器错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
