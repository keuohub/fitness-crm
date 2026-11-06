import { noStore } from "@/lib/http/no-store";
import { db } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(venueItems)
      .where(eq(venueItems.isActive, 1))
      .orderBy(asc(venueItems.sortOrder), asc(venueItems.id));

    if (rows && rows.length > 0) {
      const formatted = rows.map((r: any, idx: number) => {
        const orderNum = String(r.sortOrder || idx + 1).padStart(2, "0");
        const defaultTag = `${orderNum} / 空间实景`;

        // images 是 JSON 数组（第 1 张为封面）；老数据没有该字段时回退到 imageUrl
        let list: string[] = [];
        if (r.images) {
          try {
            const parsed = JSON.parse(String(r.images));
            if (Array.isArray(parsed)) list = parsed.map((v) => String(v)).filter(Boolean);
          } catch {
            list = [];
          }
        }
        if (list.length === 0 && r.imageUrl) list = [r.imageUrl];

        return {
          id: r.id,
          title: r.title || r.name || "空间实景",
          name: r.name || r.title || "空间实景",
          tag: (r.tag && r.tag.trim()) ? r.tag.trim() : defaultTag,
          desc: r.desc || "",
          imageUrl: list[0] || r.imageUrl,
          images: list,
          imageCount: list.length,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        };
      });
      return noStore(formatted);
    }

    // 空表返回空数组，不自动灌入默认场馆
    return noStore([]);
  } catch (err: any) {
    console.error("GET /api/portal/venue error:", err);
    return noStore([]);
  }
}
