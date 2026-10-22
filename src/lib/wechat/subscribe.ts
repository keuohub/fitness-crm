/**
 * 微信订阅消息发送封装。
 * 模板 ID 必须来自微信公众平台，不存在真实 ID 时只返回 skipped，不伪造发送。
 */
const TEMPLATE_ENV: Record<string, string | undefined> = {
  booking_success: process.env.WX_TEMPLATE_BOOKING_SUCCESS,
  class_reminder: process.env.WX_TEMPLATE_CLASS_REMINDER,
  booking_cancel: process.env.WX_TEMPLATE_CANCEL,
  class_note: process.env.WX_TEMPLATE_NOTE,
};

type SendInput = {
  openid: string;
  templateKey: keyof typeof TEMPLATE_ENV;
  data: Record<string, { value: string }>;
  page?: string;
};

export async function sendSubscribeMessage(input: SendInput) {
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_APPSECRET;
  const templateId = TEMPLATE_ENV[input.templateKey];
  if (!appid || !secret) return { skipped: true, reason: "WECHAT_APPID/WECHAT_APPSECRET 未配置" };
  if (!templateId) return { skipped: true, reason: `模板 ${input.templateKey} 未配置` };
  if (!input.openid) return { skipped: true, reason: "会员没有 openid（未授权）" };

  try {
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`,
      { cache: "no-store" }
    );
    const tokenJson: any = await tokenRes.json();
    if (!tokenJson.access_token) return { skipped: false, error: "获取 access_token 失败", detail: tokenJson.errmsg };

    const sendRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${tokenJson.access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touser: input.openid,
          template_id: templateId,
          page: input.page,
          data: input.data,
          miniprogram_state: process.env.WX_MINIPROGRAM_STATE || "formal",
        }),
      }
    );
    const sendJson: any = await sendRes.json();
    if (sendJson.errcode && sendJson.errcode !== 0) {
      return { skipped: false, error: sendJson.errmsg || "发送失败", errcode: sendJson.errcode };
    }
    return { skipped: false, ok: true };
  } catch (err: any) {
    return { skipped: false, error: String(err?.message || err) };
  }
}
