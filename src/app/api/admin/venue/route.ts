import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { requireAdmin } from "@/lib/auth/admin-session";
import { db, rawSql } from "@/db";
import { venueItems } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { invalidateCache } from "@/lib/api-cache";

async function ensureVenueSchema() {
  await rawSql`
    CREATE TABLE IF NOT EXISTS venue_items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS name TEXT;`;
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS tag TEXT;`;
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS "desc" TEXT;`;
  // 2026-11-06：一个空间可以放多张实景，JSON 数组，第 1 张是封面
  await rawSql`ALTER TABLE venue_items ADD COLUMN IF NOT EXISTS images TEXT;`;
}

/** 把前端传来的 images 收敛成干净的字符串数组 */
function normalizeImages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v || "").trim())
    .filter((v) => v.length > 0);
}

function parseStored(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw));
    return Array.isArray(arr) ? arr.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();

    const rows = await db
      .select()
      .from(venueItems)
      .orderBy(asc(venueItems.sortOrder), desc(venueItems.id));

    // images 落库是 JSON 字符串，这里解析成数组给前端，省得每个页面各写一遍
    const shaped = rows.map((r: any) => {
      const list = parseStored(r.images);
      const merged = list.length > 0 ? list : r.imageUrl ? [r.imageUrl] : [];
      return {
        ...r,
        images: merged,
        imageUrl: merged[0] || r.imageUrl,
        imageCount: merged.length,
      };
    });

    return noStore(shaped);
  } catch (err: any) {
    console.error("GET /api/admin/venue error:", err);
    return noStore({ error: err.message || "获取场馆空间列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();
    const body = await req.json();
    const { title, name, tag, desc: descText, imageUrl, images, sortOrder, isActive = 1 } = body;

    const incoming = normalizeImages(images);
    const cover = incoming[0] || String(imageUrl || "").trim();

    if (!cover) {
      return noStore({ error: "请先上传至少一张实景图" }, { status: 400 });
    }

    const displayTitle = (title || name || "空间实景").trim();

    // 未指定排序时排到末尾，不用每次手填
    let order = Number(sortOrder);
    if (!Number.isFinite(order) || order <= 0) {
      const [maxRow] = await rawSql`SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM venue_items`;
      order = Number(maxRow?.m || 0) + 1;
    }
    const autoIndex = String(order).padStart(2, "0");
    const displayTag = tag && String(tag).trim() ? String(tag).trim() : `${autoIndex} / 空间实景`;

    const [created] = await db
      .insert(venueItems)
      .values({
        title: displayTitle,
        name: displayTitle,
        tag: displayTag,
        desc: descText || "",
        imageUrl: cover,
        images: JSON.stringify(incoming.length > 0 ? incoming : [cover]),
        sortOrder: order,
        isActive: Number(isActive) || 1,
      })
      .returning();

    invalidateCache("venue");
    return noStore(created);
  } catch (err: any) {
    console.error("POST /api/admin/venue error:", err);
    return noStore({ error: err.message || "创建场馆项目失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    await ensureVenueSchema();
    const body = await req.json();
    const { id, title, name, tag, desc: descText, imageUrl, images, sortOrder, isActive } = body;

    if (!id) {
      return noStore({ error: "ID 为必填项" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = String(title).trim();
      updateData.name = String(title).trim();
    }
    if (name !== undefined && title === undefined) {
      updateData.name = String(name).trim();
      updateData.title = String(name).trim();
    }
    if (tag !== undefined) {
      updateData.tag = String(tag).trim();
    }
    if (descText !== undefined) updateData.desc = descText;

    if (images !== undefined) {
      const list = normalizeImages(images);
      updateData.images = JSON.stringify(list);
      // 封面永远等于第 1 张，避免 image_url 和 images 打架
      updateData.imageUrl = list[0] || "";
    } else if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
      updateData.images = JSON.stringify(imageUrl ? [imageUrl] : []);
    }

    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    const [updated] = await db
      .update(venueItems)
      .set(updateData)
      .where(eq(venueItems.id, Number(id)))
      .returning();

    invalidateCache("venue");
    return noStore(updated);
  } catch (err: any) {
    console.error("PUT /api/admin/venue error:", err);
    return noStore({ error: err.message || "更新场馆项目失败" }, { status: 500 });
  }
}

/**
 * 全量重排：前端把拖拽/上下移之后的 id 顺序整串传上来，
 * 这里按顺序重写成 1..N。比逐条 PUT 更不容易出现重复序号。
 */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map((v: unknown) => Number(v)) : [];
    if (ids.length === 0) {
      return noStore({ error: "缺少排序 ids" }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      if (!Number.isFinite(ids[i])) continue;
      await rawSql`UPDATE venue_items SET sort_order = ${i + 1} WHERE id = ${ids[i]}`;
    }

    invalidateCache("venue");
    return noStore({ success: true, count: ids.length });
  } catch (err: any) {
    console.error("PATCH /api/admin/venue error:", err);
    return noStore({ error: err.message || "排序保存失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return noStore({ error: "ID 为必填项" }, { status: 400 });
    }

    await db.delete(venueItems).where(eq(venueItems.id, Number(id)));

    invalidateCache("venue");
    return noStore({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/venue error:", err);
    return noStore({ error: err.message || "删除场馆项目失败" }, { status: 500 });
  }
}
