import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getPortalMemberId } from "@/lib/auth/member-session";

/**
 * 把当前已登录会员的微信 openid 绑上来。
 *
 * 为什么不能直接用 /api/portal/wechat-login：
 * 那个接口遇到陌生 openid 会新建一个会员。店里有 275 位已导入的真实会员，
 * 她们第一次点微信登录就会各自多出一个空账号，卡项和陪伴天数全部对不上。
 * 所以绑定必须建立在"已经用邀请码登录成功"的前提上，只补 openid，不动身份。
 *
 * openid 的唯一用途是发订阅消息（上课提醒/取消通知）。没有它，推送发不出去。
 */
export async function POST(request: NextRequest) {
  try {
    const memberId = await getPortalMemberId(request);
    if (!memberId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "缺少 code" }, { status: 400 });
    }

    const appId = process.env.WECHAT_APPID;
    const appSecret = process.env.WECHAT_APPSECRET;
    if (!appId || !appSecret) {
      return NextResponse.json({ ok: false, skipped: true, reason: "微信凭据未配置" });
    }

    let openid = "";
    try {
      const url =
        `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}` +
        `&secret=${appSecret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
      const res = await fetch(url, { cache: "no-store" });
      const data: any = await res.json();
      if (!data.openid) {
        return NextResponse.json(
          { ok: false, error: data.errmsg || "换取 openid 失败", errcode: data.errcode },
          { status: 400 }
        );
      }
      openid = data.openid;
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: "微信服务请求失败" }, { status: 502 });
    }

    // 这个 openid 若已绑在别人身上，绝不覆盖——否则两个会员会互相串号
    const [conflict] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.wechatOpenId, openid), ne(members.id, memberId)))
      .limit(1);

    if (conflict) {
      console.warn(`[bind-openid] openid 已属于会员 ${conflict.id}，拒绝绑定到 ${memberId}`);
      return NextResponse.json({ ok: false, error: "该微信已绑定其他会员" }, { status: 409 });
    }

    await db
      .update(members)
      .set({ wechatOpenId: openid })
      .where(eq(members.id, memberId));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[bind-openid] error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
