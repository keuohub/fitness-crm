import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courseBookings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyMemberAccess } from "@/lib/auth/member-ownership";

export async function POST(request: NextRequest) {
  try {
    const { memberId, courseType, bookingDate, bookingTime, notes } = await request.json();

    if (!memberId || !courseType || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: "缺少必填字段：memberId, courseType, bookingDate, bookingTime" },
        { status: 400 }
      );
    }

    const access = await verifyMemberAccess(request, memberId);
    if (!access.allowed) {
      return NextResponse.json({ error: "无权操作" }, { status: 401 });
    }

    const [booking] = await db
      .insert(courseBookings)
      .values({
        tenantId: 1,
        memberId,
        courseType,
        bookingDate,
        bookingTime,
        notes: notes || null,
        status: "pending",
        coachId: 1,
      })
      .returning();

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      courseType: booking.courseType,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      createdAt: booking.createdAt,
    });
  } catch (err) {
    console.error("[course-booking] POST error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");

  if (!memberIdParam) {
    return NextResponse.json({ error: "缺少 memberId" }, { status: 400 });
  }

  const memberId = parseInt(memberIdParam, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId 无效" }, { status: 400 });
  }

  const access = await verifyMemberAccess(request, memberId);
  if (!access.allowed) {
    return NextResponse.json({ error: "无权访问" }, { status: 401 });
  }

  const bookings = await db
    .select()
    .from(courseBookings)
    .where(eq(courseBookings.memberId, memberId))
    .orderBy(desc(courseBookings.bookingDate), desc(courseBookings.createdAt));

  return NextResponse.json(bookings);
}
