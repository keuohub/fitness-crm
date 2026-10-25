import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireRole } from "@/lib/auth/rbac";
import { rawSql } from "@/db";
import { generatePortalCode, generateLoginPin } from "@/lib/auth/member-credentials";

// 批量导入会员（可同时开卡）
// 一行 = 一个会员；如果填了卡名，就顺便开一张卡。
// 输出每一行的结果与生成的登录凭据，前端可导出 CSV。

const MAX_ROWS = 500;

type RawRow = Record<string, any>;

type ResultRow = {
  line: number;
  status: "created" | "skipped" | "failed";
  name: string;
  portalCode?: string;
  loginPin?: string;
  loginMode?: "phone" | "pin";
  secondFactor?: string;
  cardName?: string;
  cardId?: number;
  reason?: string;
};

function pick(row: RawRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function toDate(v: string): string {
  const s = v.replace(/[./]/g, "-").trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function mapGender(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (["女", "female", "f", "女士"].includes(s)) return "female";
  if (["男", "male", "m", "先生"].includes(s)) return "male";
  return null;
}

export async function POST(request: NextRequest) {
  const admin = await requireRole(request, "manager");
  if (!admin) return NextResponse.json({ error: "权限不足，仅店长或店主可批量导入会员" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const rows: RawRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: "没有可导入的行" }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `一次最多导入 ${MAX_ROWS} 行，请拆成多个文件` }, { status: 400 });

  const cardTypes = await rawSql`SELECT id, name, category, total_count, validity_days FROM card_types WHERE tenant_id = 1 AND is_active = 1`;
  const typeByName = new Map<string, any>(cardTypes.map((t: any) => [String(t.name).trim(), t]));

  // 现有手机号，用于去重
  const existing = await rawSql`SELECT id, phone FROM members WHERE tenant_id = 1 AND phone IS NOT NULL`;
  const phoneOwner = new Map<string, number>(existing.map((m: any) => [String(m.phone).trim(), Number(m.id)]));

  // 生成会员编号（沿用后台新增会员的规则：当前最大数字编号加一）
  const [last] = await rawSql`SELECT member_code FROM members WHERE tenant_id = 1 AND member_code IS NOT NULL ORDER BY member_code DESC LIMIT 1`;
  let nextCodeNum = 1;
  if (last?.member_code && /^\d+$/.test(String(last.member_code))) nextCodeNum = parseInt(String(last.member_code), 10) + 1;

  const results: ResultRow[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;
    const name = pick(row, ["姓名", "会员姓名", "name", "名字"]).slice(0, 30);
    const phone = pick(row, ["手机号", "手机", "电话", "phone", "mobile"]);
    const gender = mapGender(pick(row, ["性别", "gender"]));
    const birthday = toDate(pick(row, ["生日", "birthday"]));
    const joinedAt = toDate(pick(row, ["入会日期", "入会时间", "joinedAt", "joinDate"])) || today;
    const mentorName = pick(row, ["带教导师", "导师", "mentorName", "mentor"]);
    const notes = pick(row, ["备注", "notes", "note"]);
    const cardName = pick(row, ["卡名", "卡种", "卡类型", "cardName", "cardType"]);
    const totalRaw = pick(row, ["总次数", "总数", "total", "totalCount"]);
    const remainRaw = pick(row, ["剩余次数", "剩余", "remaining", "remainingCount"]);
    const validFromRaw = pick(row, ["生效日", "生效日期", "validFrom"]);
    const validUntilRaw = pick(row, ["到期日", "截止日期", "validUntil"]);
    const daysRaw = pick(row, ["有效天数", "validityDays"]);

    if (!name) {
      results.push({ line, status: "failed", name: "（空）", reason: "缺少姓名" });
      continue;
    }
    if (phone && phoneOwner.has(phone)) {
      results.push({ line, status: "skipped", name, reason: "手机号已存在（会员 id " + phoneOwner.get(phone) + "），未重复创建" });
      continue;
    }

    // 生成唯一邀请码
    let portalCode = "";
    for (let t = 0; t < 20; t++) {
      const c = generatePortalCode();
      const [dup] = await rawSql`SELECT id FROM members WHERE portal_code = ${c} LIMIT 1`;
      if (!dup) { portalCode = c; break; }
    }
    const loginPin = generateLoginPin();

    let memberId = 0;
    let memberCode = "";
    try {
      memberCode = String(nextCodeNum).padStart(4, "0");
      nextCodeNum += 1;
      const [created] = await rawSql`
        INSERT INTO members
          (tenant_id, name, phone, gender, member_code, portal_code, login_pin, portal_enabled,
           status, joined_at, birthday, mentor_name, notes, created_at, updated_at)
        VALUES
          (1, ${name}, ${phone || null}, ${gender}, ${memberCode}, ${portalCode}, ${loginPin}, 1,
           'active', ${joinedAt}, ${birthday || null}, ${mentorName || null}, ${notes || null}, NOW(), NOW())
        RETURNING id`;
      memberId = Number(created.id);
      if (phone) phoneOwner.set(phone, memberId);
    } catch (err: any) {
      results.push({ line, status: "failed", name, reason: "建会员失败：" + String(err?.message || err).slice(0, 80) });
      continue;
    }

    // 可选：同一行里开卡
    let cardId: number | undefined;
    let cardReason = "";
    if (cardName) {
      const type = typeByName.get(cardName);
      if (!type) {
        cardReason = `卡种「${cardName}」不存在，会员已建但没开卡`;
      } else {
        const isCount = String(type.category) === "count";
        const total = totalRaw ? Number(totalRaw) : (type.total_count ? Number(type.total_count) : null);
        const remaining = remainRaw ? Number(remainRaw) : total;
        const validFrom = toDate(validFromRaw) || joinedAt || today;
        const validityDays = daysRaw ? Number(daysRaw) : (type.validity_days ? Number(type.validity_days) : null);
        const validUntil = toDate(validUntilRaw) || (validityDays ? addDays(validFrom, validityDays) : null);

        if (isCount && (!total || remaining === null || remaining < 0 || remaining > total)) {
          cardReason = `次卡次数不合理（总 ${total ?? "空"} 余 ${remaining ?? "空"}）`;
        } else if (!isCount && !validUntil) {
          cardReason = "期限卡缺少到期日或有效天数";
        } else {
          const key = `import-${memberId}-${type.id}-${validFrom}-${validUntil || ""}-${isCount ? remaining : 0}`;
          const [dup] = await rawSql`SELECT id FROM member_cards WHERE idempotency_key = ${key} LIMIT 1`;
          if (dup) {
            cardId = Number(dup.id);
            cardReason = "该卡已存在，跳过开卡";
          } else {
            const [card] = await rawSql`
              INSERT INTO member_cards
                (tenant_id, member_id, card_type_id, status, total_count, remaining_count,
                 valid_from, valid_until, purchased_at, price_cents, idempotency_key, created_at, updated_at)
              VALUES
                (1, ${memberId}, ${type.id}, 'active',
                 ${isCount ? total : null}, ${isCount ? remaining : null},
                 ${validFrom}, ${validUntil}, ${validFrom}, 0, ${key}, NOW(), NOW())
              RETURNING id`;
            cardId = Number(card.id);
            await rawSql`
              INSERT INTO card_transactions (tenant_id, member_card_id, member_id, type, amount, balance_after, note, created_at)
              VALUES (1, ${cardId}, ${memberId}, 'purchase', ${isCount ? total : 0}, ${isCount ? remaining : 0}, '批量导入开卡', NOW())`;
          }
        }
      }
    }

    const cleanPhone = (phone || "").replace(/\D/g, "");
    const loginMode: "phone" | "pin" = cleanPhone.length >= 4 ? "phone" : "pin";
    const secondFactor = loginMode === "phone" ? cleanPhone.slice(-4) : loginPin;
    results.push({
      line,
      status: "created",
      name,
      portalCode,
      loginPin,
      loginMode,
      secondFactor,
      cardName: cardName || undefined,
      cardId,
      reason: cardReason || undefined,
    });
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    cardsCreated: results.filter((r) => r.status === "created" && r.cardId).length,
  };

  return NextResponse.json({ summary, results });
}
