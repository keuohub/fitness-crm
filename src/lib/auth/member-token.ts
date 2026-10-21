import crypto from "crypto";

// 会员身份 token：payload = memberId.exp，HMAC-SHA256 签名。
// 小程序登录成功后下发，之后所有会员接口只认 Authorization: Bearer <token>。
const SECRET =
  process.env.MEMBER_TOKEN_SECRET ||
  process.env.COOKIE_SIGN_KEY ||
  process.env.ADMIN_PASSWORD ||
  "CHANGE_ME";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function signMemberToken(memberId: number): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${memberId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyMemberToken(token: string): { memberId: number } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    const [id, exp, sig] = parts;
    const expected = crypto.createHmac("sha256", SECRET).update(`${id}.${exp}`).digest("hex");
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (!/^\d+$/.test(id) || Number(exp) < Date.now()) return null;
    return { memberId: Number(id) };
  } catch {
    return null;
  }
}
