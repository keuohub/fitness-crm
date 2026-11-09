import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const categories = await rawSql`
      SELECT id, key, name, short_name, tagline, button_text, image_url, sort_order, is_active, created_at, updated_at
        FROM booking_landing_categories
       ORDER BY sort_order ASC, id ASC;
    `;

    const settingsRows = await rawSql`
      SELECT id, font_family, capsule_style, show_tagline
        FROM booking_landing_settings
       LIMIT 1;
    `;

    const settings = settingsRows[0] || {
      font_family: "song",
      capsule_style: "glass",
      show_tagline: 1,
    };

    return noStore({ categories, settings });
  } catch (err: any) {
    console.error("GET /api/admin/booking-landing error:", err);
    return noStore({ error: err.message || "读取失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 1. 批量调整排序
    if (body.action === "reorder" && Array.isArray(body.orders)) {
      for (const item of body.orders) {
        if (item.id && typeof item.sort_order === "number") {
          await rawSql`
            UPDATE booking_landing_categories
               SET sort_order = ${item.sort_order},
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = ${item.id};
          `;
        }
      }
      return noStore({ success: true, message: "排序更新成功" });
    }

    // 2. 更新全局展示风格配置
    if (body.action === "settings") {
      const { font_family = "song", capsule_style = "glass", show_tagline = 1 } = body;
      const countRes = await rawSql`SELECT count(*) FROM booking_landing_settings;`;
      if (parseInt(countRes[0].count, 10) === 0) {
        await rawSql`
          INSERT INTO booking_landing_settings (font_family, capsule_style, show_tagline)
          VALUES (${font_family}, ${capsule_style}, ${Number(show_tagline)});
        `;
      } else {
        await rawSql`
          UPDATE booking_landing_settings
             SET font_family = ${font_family},
                 capsule_style = ${capsule_style},
                 show_tagline = ${Number(show_tagline)},
                 updated_at = CURRENT_TIMESTAMP;
        `;
      }
      return noStore({ success: true, message: "视觉风格配置已保存" });
    }

    // 3. 更新单个分类
    if (body.id) {
      const { id, name, short_name, tagline = "", button_text = "", image_url, sort_order = 1, is_active = 1 } = body;
      if (!name || !short_name || !image_url) {
        return noStore({ error: "课程全称、胶囊简称、背景图片为必填" }, { status: 400 });
      }

      await rawSql`
        UPDATE booking_landing_categories
           SET name = ${String(name).trim()},
               short_name = ${String(short_name).trim().slice(0, 10)},
               tagline = ${String(tagline || "").trim()},
               button_text = ${String(button_text || `预约${name}`).trim()},
               image_url = ${String(image_url).trim()},
               sort_order = ${Number(sort_order) || 1},
               is_active = ${Number(is_active) ? 1 : 0},
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ${Number(id)};
      `;
      return noStore({ success: true, message: "分类更新成功" });
    }

    // 4. 新增分类
    const { name, short_name, tagline = "", button_text = "", image_url, sort_order = 99, is_active = 1, key } = body;
    if (!name || !short_name || !image_url) {
      return noStore({ error: "课程全称、胶囊简称、背景图片为必填" }, { status: 400 });
    }

    const safeKey = String(key || `cat_${Date.now().toString(36)}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    await rawSql`
      INSERT INTO booking_landing_categories (key, name, short_name, tagline, button_text, image_url, sort_order, is_active)
      VALUES (
        ${safeKey},
        ${String(name).trim()},
        ${String(short_name).trim().slice(0, 10)},
        ${String(tagline || "").trim()},
        ${String(button_text || `预约${name}`).trim()},
        ${String(image_url).trim()},
        ${Number(sort_order) || 99},
        ${Number(is_active) ? 1 : 0}
      );
    `;

    return noStore({ success: true, message: "新增课程分类成功" });
  } catch (err: any) {
    console.error("POST /api/admin/booking-landing error:", err);
    return noStore({ error: err.message || "保存失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return noStore({ error: "缺少 id" }, { status: 400 });

    const totalRes = await rawSql`SELECT count(*) FROM booking_landing_categories;`;
    if (parseInt(totalRes[0].count, 10) <= 1) {
      return noStore({ error: "至少需要保留一个课程分类" }, { status: 400 });
    }

    await rawSql`
      DELETE FROM booking_landing_categories WHERE id = ${Number(id)};
    `;

    return noStore({ success: true, message: "删除成功" });
  } catch (err: any) {
    console.error("DELETE /api/admin/booking-landing error:", err);
    return noStore({ error: err.message || "删除失败" }, { status: 500 });
  }
}
