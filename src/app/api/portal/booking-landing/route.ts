import { NextRequest } from "next/server";
import { noStore } from "@/lib/http/no-store";
import { rawSql } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const categories = await rawSql`
      SELECT id, key, name, short_name, tagline, button_text, image_url, sort_order
        FROM booking_landing_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC;
    `;

    const settingsRows = await rawSql`
      SELECT font_family, capsule_style, show_tagline
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
    console.error("GET /api/portal/booking-landing error:", err);
    return noStore({ categories: [], settings: { font_family: "song", capsule_style: "glass", show_tagline: 1 } });
  }
}
