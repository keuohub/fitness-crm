import { noStore } from "@/lib/http/no-store";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, 1))
      .orderBy(asc(teamMembers.sortOrder));

    if (rows && rows.length > 0) {
      return noStore(rows);
    }

    // 空表返回空数组，不自动灌入默认导师
    return noStore([]);
  } catch (err) {
    console.error("portal/team error:", err);
    return noStore([]);
  }
}
