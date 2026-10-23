import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
import {
  DEFAULT_BRAND_SETTINGS,
  mergeBrandSettings,
  sanitizeBrandSettings,
} from "@/lib/brand-settings";

const noStore = (body: unknown, init?: ResponseInit) => {
  const res = NextResponse.json(body, init);
  // 后台读到的是自己刚存的值，同样不能吃缓存，否则保存后刷新看到旧文案。
  res.headers.set("Cache-Control", "private, no-store");
  return res;
};

async function readStored() {
  // 只按 key 取单行，绝不 SELECT *：studio_settings 里还有 cos_secret_id / cos_secret_key。
  const rows = await rawSql`
    SELECT value FROM studio_settings
    WHERE tenant_id = 1 AND key = 'brand_settings'
    LIMIT 1
  `;
  if (!rows || rows.length === 0 || !rows[0].value) return null;
  try {
    return JSON.parse(rows[0].value) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const raw = await readStored();
    // 坏 JSON / 无记录：与会员端一致地降级为默认值，不把异常抛给后台页面
    return noStore(mergeBrandSettings(raw));
  } catch (err: any) {
    console.error("GET /api/admin/brand-settings error:", err);
    return noStore({ ...DEFAULT_BRAND_SETTINGS });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return noStore({ error: "需要管理员登录" }, { status: 401 });
  }
  try {
    const body = await request.json();
    // 白名单 + 长度截断：未知 key（例如误传 cos_secret_key）不会被写进 brand_settings，
    // 也就不会被 /api/portal/brand-settings 原样公开出去。
    const clean = sanitizeBrandSettings(body);
    const jsonStr = JSON.stringify(clean);

    await rawSql`
      INSERT INTO studio_settings (tenant_id, key, value, updated_at)
      VALUES (1, 'brand_settings', ${jsonStr}, NOW())
      ON CONFLICT (tenant_id, key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW();
    `;

    return noStore(clean);
  } catch (err: any) {
    console.error("PUT /api/admin/brand-settings error:", err);
    return noStore({ error: err.message }, { status: 500 });
  }
}
