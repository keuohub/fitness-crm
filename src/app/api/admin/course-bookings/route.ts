import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { db } from "@/db";
import { courseBookings, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-session";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return noStore({ error: "缺少 date 参数 (YYYY-MM-DD)" }, { status: 400 });
  }

  const bookings = await db
    .select({
      id: courseBookings.id,
      memberId: courseBookings.memberId,
      memberName: members.name,
      courseType: courseBookings.courseType,
      bookingDate: courseBookings.bookingDate,
      bookingTime: courseBookings.bookingTime,
      coachId: courseBookings.coachId,
      status: courseBookings.status,
      notes: courseBookings.notes,
      createdAt: courseBookings.createdAt,
    })
    .from(courseBookings)
    .innerJoin(members, eq(courseBookings.memberId, members.id))
    .where(eq(courseBookings.bookingDate, date))
    .orderBy(courseBookings.bookingTime);

  return noStore(bookings);
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return noStore({ error: "缺少 id 或 status" }, { status: 400 });
    }

    if (!["confirmed", "cancelled"].includes(status)) {
      return noStore(
        { error: 'status 只能是 confirmed 或 cancelled' },
        { status: 400 }
      );
    }

    await db
      .update(courseBookings)
      .set({ status })
      .where(eq(courseBookings.id, id));

    return noStore({ id, status, updated: true });
  } catch (err) {
    console.error("[admin/course-bookings] PUT error:", err);
    return noStore({ error: "服务器错误" }, { status: 500 });
  }
}
