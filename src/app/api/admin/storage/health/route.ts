import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { requireAdmin } from "@/lib/auth/admin-session";
import { checkStorageHealth } from "@/lib/storage";

/**
 * 图片存储健康检查
 *
 * 运营不该在"传完图发现会员端空白"之后才发现存储坏了。
 * 后台进页面就探一次，坏了直接红条。
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  const health = await checkStorageHealth();
  return noStore(health);
}
