import crypto from "crypto";

function getCoachSecret(): string {
  const secret =
    process.env.COACH_TOKEN_SECRET ||
    process.env.MEMBER_TOKEN_SECRET ||
    process.env.COOKIE_SIGN_KEY;
  if (!secret) {
    throw new Error("Missing COACH_TOKEN_SECRET or MEMBER_TOKEN_SECRET in environment variables");
  }
  return secret;
}

const TTL_MS = 12 * 60 * 60 * 1000;

export function signCoachToken(coachId: number): string {
  const exp = Date.now() + TTL_MS;
  const payload = `coach.${coachId}.${exp}`;
  const sig = crypto.createHmac("sha256", getCoachSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyCoachToken(token: string): { coachId: number } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8").split(".");
    if (raw.length !== 4 || raw[0] !== "coach") return null;
    const [, id, exp, sig] = raw;
    const expected = crypto.createHmac("sha256", getCoachSecret()).update(`coach.${id}.${exp}`).digest("hex");
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Number(exp) < Date.now()) return null;
    return { coachId: Number(id) };
  } catch {
    return null;
  }
}

export function getCoachId(request: Request): number | null {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return verifyCoachToken(auth.slice(7))?.coachId ?? null;
}
