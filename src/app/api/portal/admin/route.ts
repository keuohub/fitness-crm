import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function generatePortalCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}

export async function POST(request: NextRequest) {
  // Require admin authentication
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { memberId, action } = await request.json();

    if (!memberId || isNaN(Number(memberId))) {
      return NextResponse.json({ error: "无效的会员ID" }, { status: 400 });
    }

    const id = Number(memberId);

    const [member] = await db.select().from(members).where(eq(members.id, id));
    if (!member) {
      return NextResponse.json({ error: "会员不存在" }, { status: 404 });
    }

    switch (action) {
      case "generate-code": {
        const portalCode = generatePortalCode();
        await db
          .update(members)
          .set({ portalCode, portalEnabled: 1 })
          .where(eq(members.id, id));
        return NextResponse.json({ portalCode });
      }
      case "toggle-enabled": {
        const newState = member.portalEnabled === 1 ? 0 : 1;
        await db
          .update(members)
          .set({ portalEnabled: newState })
          .where(eq(members.id, id));
        return NextResponse.json({ portalEnabled: newState });
      }
      case "get-code": {
        return NextResponse.json({
          portalCode: member.portalCode || null,
          portalEnabled: member.portalEnabled || 0,
          portalActivatedAt: member.portalActivatedAt || null,
        });
      }
      default:
        return NextResponse.json({ error: "无效操作" }, { status: 400 });
    }
  } catch (err) {
    console.error("Portal admin error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
