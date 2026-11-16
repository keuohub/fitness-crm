import crypto from "crypto";
import type { NextRequest } from "next/server";

export interface ManagerSessionPayload {
  adminId: number;
  username: string;
  name: string;
  role: string;
}

function getManagerSecret(): string {
  return (
    process.env.ADMIN_PASSWORD ||
    process.env.MEMBER_TOKEN_SECRET ||
    process.env.COOKIE_SIGN_KEY ||
    "laiwu-manager-default-salt-2026"
  );
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天有效

export function signManagerToken(payload: ManagerSessionPayload): string {
  const exp = Date.now() + TTL_MS;
  const data = JSON.stringify({
    ...payload,
    exp,
  });
  const dataB64 = Buffer.from(data, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getManagerSecret()).update(dataB64).digest("hex");
  return `${dataB64}.${sig}`;
}

export function verifyManagerToken(token: string): ManagerSessionPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const clean = token.replace(/^Bearer\s+/i, "").trim();
    const parts = clean.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, sig] = parts;
    const expected = crypto.createHmac("sha256", getManagerSecret()).update(dataB64).digest("hex");
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    const jsonStr = Buffer.from(dataB64, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.adminId || !parsed.username || !parsed.exp) return null;
    if (Number(parsed.exp) < Date.now()) return null;
    // 明确硬防线：小桥 (id 11) 严禁作为管理权限通过
    if (Number(parsed.adminId) === 11 || parsed.username === "xiaoqiao" || parsed.name === "小桥") {
      return null;
    }

    return {
      adminId: Number(parsed.adminId),
      username: String(parsed.username),
      name: String(parsed.name || "管理员"),
      role: String(parsed.role || "admin"),
    };
  } catch {
    return null;
  }
}

export function getManagerSessionFromRequest(request: NextRequest): ManagerSessionPayload | null {
  // 1. Authorization: Bearer <manager_token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const session = verifyManagerToken(authHeader.slice(7));
    if (session) return session;
  }

  // 2. 自定义请求头 x-manager-token
  const customHeader = request.headers.get("x-manager-token");
  if (customHeader) {
    const session = verifyManagerToken(customHeader);
    if (session) return session;
  }

  // 3. Cookie manager_token
  const cookieToken = request.cookies.get("manager_token")?.value;
  if (cookieToken) {
    const session = verifyManagerToken(cookieToken);
    if (session) return session;
  }

  return null;
}
