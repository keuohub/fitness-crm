import { NextResponse } from "next/server";
import { rawSql } from "@/db";
import {
  DEFAULT_BRAND_SETTINGS,
  mergeBrandSettings,
} from "@/lib/brand-settings";

const noStore = (body: unknown) => {
  const res = NextResponse.json(body);
  // 后台改完文案，会员端必须立刻看到，不能被 CDN / 微信 / 浏览器缓存。
  res.headers.set("Cache-Control", "private, no-store");
  return res;
};

export async function GET() {
  try {
    // 只按 key 取，绝不 SELECT *：studio_settings 里还有 cos_secret_id / cos_secret_key。
    const rows = await rawSql`
      SELECT value FROM studio_settings
      WHERE tenant_id = 1 AND key = 'brand_settings'
      LIMIT 1
    `;
    if (rows && rows.length > 0 && rows[0].value) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(rows[0].value);
      } catch {
        // 坏 JSON：退回默认值，不让会员端白屏
        return noStore({ ...DEFAULT_BRAND_SETTINGS });
      }
      return noStore(mergeBrandSettings(parsed));
    }
    return noStore({ ...DEFAULT_BRAND_SETTINGS });
  } catch (err) {
    console.error("GET /api/portal/brand-settings error:", err);
    return noStore({ ...DEFAULT_BRAND_SETTINGS });
  }
}
