import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/db";
import { compareSync } from "bcryptjs";
import { signManagerToken, getManagerSessionFromRequest } from "@/lib/auth/manager-session";
import { logAdminAction } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "请输入管理员专属账号与登录密码" }, { status: 400 });
    }

    // 检查店主小桥：明确禁止
    const cleanUser = username.toLowerCase();
    if (cleanUser === "xiaoqiao" || cleanUser.includes("小桥") || cleanUser.includes("13788902598")) {
      return NextResponse.json(
        { ok: false, error: "该账号无管理权限（店主小桥后台权限已关闭）" },
        { status: 403 }
      );
    }

    // 在 users 表中按 email 或 username 匹配
    const rows = await rawSql`
      SELECT id, name, email, password_hash, role, status
      FROM users
      WHERE (
        LOWER(email) = LOWER(${username})
        OR LOWER(email) = LOWER(${username} || '@laiwu.fitness')
        OR LOWER(name) = LOWER(${username})
      )
      LIMIT 1
    `.catch(() => []);

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "管理员账号不存在或密码不正确" }, { status: 401 });
    }

    const user = rows[0];

    // 角色与状态校验
    if (user.id === 11 || user.name === "小桥") {
      return NextResponse.json(
        { ok: false, error: "该账号无管理权限（店主小桥后台权限已关闭）" },
        { status: 403 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json({ ok: false, error: "该管理员账号已停用，请联系核心管理员" }, { status: 403 });
    }

    if (!["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ ok: false, error: "该账号没有管理后台权限" }, { status: 403 });
    }

    // 校验口令（bcrypt 哈希）
    let isValid = false;
    if (user.password_hash) {
      try {
        isValid = compareSync(password, user.password_hash);
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.json({ ok: false, error: "管理员账号不存在或密码不正确" }, { status: 401 });
    }

    const adminUsername = user.email.replace(/@.*$/, "");
    const token = signManagerToken({
      adminId: user.id,
      username: adminUsername,
      name: user.name,
      role: user.role,
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    // 记入操作留痕寻迹
    await logAdminAction({
      adminId: user.id,
      adminName: user.name,
      adminUsername,
      action: "manager_login",
      entityType: "users",
      entityId: user.id,
      summary: `管理员【${user.name}】(${adminUsername}) 成功登录手机管家工作台`,
      ip,
    });

    return NextResponse.json({
      ok: true,
      token,
      admin: {
        id: user.id,
        username: adminUsername,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("[manager/auth] login error:", err);
    return NextResponse.json({ ok: false, error: "登录服务异常，请稍后重试" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = getManagerSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录或登录已过期" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    admin: session,
  });
}
