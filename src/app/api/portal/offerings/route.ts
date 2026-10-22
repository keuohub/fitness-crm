import { NextResponse } from "next/server";
import { db } from "@/db";
import { courseOfferings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const noStore = (body: unknown) => {
  const res = NextResponse.json(body);
  // 后台改了类目/底图，会员端必须立刻看到，不能被 CDN 缓存。
  res.headers.set("Cache-Control", "private, no-store");
  return res;
};

export async function GET() {
  try {
    // 这里原本每次请求都跑 CREATE TABLE / ALTER TABLE，
    // 相当于会员每打开一次「了解徕舞」就对 course_offerings 加一次 ACCESS EXCLUSIVE 锁。
    // 建表与补列统一收在后台 /api/admin/offerings 的 ensureTableAndSeed()，读路径保持纯读。
    const rows = await db
      .select()
      .from(courseOfferings)
      .where(eq(courseOfferings.isActive, 1))
      .orderBy(asc(courseOfferings.sortOrder));

    return noStore(rows);
  } catch (err: any) {
    console.error("portal/offerings error:", err);
    return noStore([]);
  }
}
