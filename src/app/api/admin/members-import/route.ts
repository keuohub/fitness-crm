import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { rawSql } from "@/db";
import { generatePortalCode, generateLoginPin } from "@/lib/auth/member-credentials";

// 批量导入会员与会员卡（支持新会员建档 + 老会员补卡）
// 匹配优先级：手机号 -> 会员编号 -> 唯一姓名（重名报错拒绝猜测）
const MAX_ROWS = 500;

type RawRow = Record<string, any>;

type ResultRow = {
  line: number;
  status: "created" | "skipped" | "failed";
  name: string;
  matchedBy?: "phone" | "memberCode" | "name" | "new";
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

// 智能推算入会起始日（来时路）
// 优先识别具体天数（如"820天"、"大概800天"、"相伴600天"或纯数字"820"），保证小程序端今天精准呈现该天数，且后续每天自然+1天
function deduceJoinedAt(rawJoined: string, notes: string): { date: string; inferred: boolean; label?: string } {
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // 1. 明确的完整日期 (YYYY-MM-DD / YYYY.M.D / YYYY/M/D)
  const explicit = toDate(rawJoined);
  if (explicit) return { date: explicit, inferred: false };

  // 2. 年月 (如 2023-05, 2023.5)
  const ymMatch = rawJoined.replace(/[./]/g, "-").trim().match(/^(\d{4})-(\d{1,2})$/);
  if (ymMatch) {
    const y = ymMatch[1];
    const m = String(ymMatch[2]).padStart(2, "0");
    return { date: `${y}-${m}-01`, inferred: true, label: `${y}年${m}月` };
  }

  // 3. 纯数字判断：若是 2010-当前年份 视为年份(如 2022)；其他正整数(如 820, 500, 300) 视为具体相伴天数！
  const pureNum = rawJoined.trim().match(/^(\d+)$/);
  if (pureNum) {
    const n = parseInt(pureNum[1], 10);
    if (n >= 2010 && n <= now.getFullYear()) {
      return { date: `${n}-01-01`, inferred: true, label: `${n}年` };
    } else if (n > 0 && n <= 15000) {
      const pastTime = new Date(now.getTime() - (n - 1) * 86400000);
      return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${n}天` };
    }
  }

  // 4. 扫描文本（合并入会日期与备注）
  const text = `${rawJoined} ${notes}`.trim();
  if (!text) return { date: todayStr, inferred: false };

  // 4.0 核心优先：识别具体天数（如 "820天", "大概800天", "来了750天", "相伴600天"）
  const dayMatch = text.match(/(?:约|大概|上了|练了|相伴|已有|来了|天数)?\s*(\d+)\s*天/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days > 0 && days <= 15000) {
      const pastTime = new Date(now.getTime() - (days - 1) * 86400000);
      return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${days}天` };
    }
  }

  // 4.1 识别具体年份：如 "2021年", "2022老会员", "2020年来莱芜"
  const yearInText = text.match(/(20\d{2})\s*年?/);
  if (yearInText) {
    const y = parseInt(yearInText[1], 10);
    if (y >= 2010 && y <= now.getFullYear()) {
      return { date: `${y}-01-01`, inferred: true, label: `${y}年` };
    }
  }

  // 4.2 识别年数并换算为具体天数（避免模糊描述，小程序端均以具体天数呈现）
  const halfYearMatch = text.match(/(\d+)\s*年半/);
  if (halfYearMatch) {
    const years = parseFloat(halfYearMatch[1]) + 0.5;
    const days = Math.round(years * 365);
    const pastTime = new Date(now.getTime() - (days - 1) * 86400000);
    return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${days}天` };
  }

  if (/半年/.test(text)) {
    const days = 182;
    const pastTime = new Date(now.getTime() - (days - 1) * 86400000);
    return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${days}天` };
  }

  const yearMatch = text.match(/(?:约|大概|上了|练了|相伴|已有|会员)?\s*(\d+(?:\.\d+)?)\s*年/);
  if (yearMatch) {
    const years = parseFloat(yearMatch[1]);
    if (years > 0 && years <= 30) {
      const days = Math.round(years * 365);
      const pastTime = new Date(now.getTime() - (days - 1) * 86400000);
      return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${days}天` };
    }
  }

  // 4.3 识别月份并换算为具体天数
  const monthMatch = text.match(/(?:约|大概|上了|练了)?\s*(\d+)\s*个?月/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    if (months > 0 && months < 120) {
      const days = Math.round(months * 30.5);
      const pastTime = new Date(now.getTime() - (days - 1) * 86400000);
      return { date: pastTime.toISOString().slice(0, 10), inferred: true, label: `${days}天` };
    }
  }

  return { date: todayStr, inferred: false };
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

  // 加载全量有效会员用于优先级匹配：1. 手机号 2. 会员编号 3. 姓名唯一
  const allExisting = await rawSql`
    SELECT id, name, phone, member_code, portal_code, login_pin, portal_enabled 
    FROM members WHERE tenant_id = 1
  `;
  const phoneOwner = new Map<string, any>();
  const codeOwner = new Map<string, any>();
  const nameOwner = new Map<string, any[]>();

  for (const m of allExisting) {
    if (m.phone && String(m.phone).trim()) {
      phoneOwner.set(String(m.phone).trim(), m);
    }
    if (m.member_code && String(m.member_code).trim()) {
      const code = String(m.member_code).trim();
      codeOwner.set(code.toUpperCase(), m);
      codeOwner.set(("LW" + code).toUpperCase(), m);
    }
    const nm = String(m.name || "").trim();
    if (nm) {
      const list = nameOwner.get(nm) || [];
      list.push(m);
      nameOwner.set(nm, list);
    }
  }

  // 生成新会员编号（获取当前最大数字编号加一）
  const [last] = await rawSql`
    SELECT member_code FROM members 
    WHERE tenant_id = 1 AND member_code IS NOT NULL AND member_code ~ '^[0-9]+$'
    ORDER BY member_code::int DESC LIMIT 1
  `;
  let nextCodeNum = 1;
  if (last?.member_code) nextCodeNum = parseInt(String(last.member_code), 10) + 1;

  const results: ResultRow[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;
    const name = pick(row, ["姓名", "会员姓名", "name", "名字"]).slice(0, 30);
    const phone = pick(row, ["手机号", "手机", "电话", "phone", "mobile"]);
    const memberCodeInput = pick(row, ["会员编号", "卡号", "编号", "memberCode", "code"]).toUpperCase();
    const gender = mapGender(pick(row, ["性别", "gender"]));
    const birthday = toDate(pick(row, ["生日", "birthday"]));
    const rawJoined = pick(row, ["入会日期", "入会时间", "joinedAt", "joinDate"]);
    const mentorName = pick(row, ["带教导师", "导师", "mentorName", "mentor"]);
    const notes = pick(row, ["备注", "notes", "note"]);
    const deduced = deduceJoinedAt(rawJoined, notes);
    const joinedAt = deduced.date;
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

    let memberId = 0;
    let isExistingMember = false;
    let matchedBy: "phone" | "memberCode" | "name" | "new" = "new";
    let portalCode = "";
    let loginPin = "";
    let activePhone = phone;

    // 匹配优先级：1. 手机号 -> 2. 会员编号 -> 3. 唯一姓名
    if (phone && phoneOwner.has(phone)) {
      const existing = phoneOwner.get(phone);
      memberId = Number(existing.id);
      isExistingMember = true;
      matchedBy = "phone";
      portalCode = existing.portal_code || "";
      loginPin = existing.login_pin || "";
      activePhone = existing.phone || phone;
    } else if (memberCodeInput && codeOwner.has(memberCodeInput)) {
      const existing = codeOwner.get(memberCodeInput);
      memberId = Number(existing.id);
      isExistingMember = true;
      matchedBy = "memberCode";
      portalCode = existing.portal_code || "";
      loginPin = existing.login_pin || "";
      activePhone = existing.phone || phone;
    } else if (name && nameOwner.has(name)) {
      const matches = nameOwner.get(name)!;
      if (matches.length === 1) {
        const existing = matches[0];
        memberId = Number(existing.id);
        isExistingMember = true;
        matchedBy = "name";
        portalCode = existing.portal_code || "";
        loginPin = existing.login_pin || "";
        activePhone = existing.phone || phone;
      } else if (!phone && !memberCodeInput) {
        // 重名且无辅助信息，拒绝盲猜，直接报错拦截
        results.push({
          line,
          status: "failed",
          name,
          reason: `重名（库中存在 ${matches.length} 位同名会员），请补手机号或会员编号`,
        });
        continue;
      }
    }

    // 新老会员更新逻辑
    let memberUpdated = false;
    if (!isExistingMember) {
      // 重新生成唯一 8 位邀请码
      for (let t = 0; t < 20; t++) {
        const c = generatePortalCode();
        const [dup] = await rawSql`SELECT id FROM members WHERE portal_code = ${c} LIMIT 1`;
        if (!dup) { portalCode = c; break; }
      }
      loginPin = generateLoginPin();

      try {
        const memberCode = String(nextCodeNum).padStart(4, "0");
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
        const newMemberObj = { id: memberId, name, phone, member_code: memberCode, portal_code: portalCode, login_pin: loginPin };
        if (phone) phoneOwner.set(phone, newMemberObj);
        codeOwner.set(memberCode, newMemberObj);
        const nl = nameOwner.get(name) || [];
        nl.push(newMemberObj);
        nameOwner.set(name, nl);
      } catch (err: any) {
        results.push({ line, status: "failed", name, reason: "建会员失败：" + String(err?.message || err).slice(0, 80) });
        continue;
      }
    } else {
      // 老会员：如果提供了入会时间/推算出相伴起始日，或提供了备注，回填更新到会员档案
      try {
        if (deduced.inferred || rawJoined || notes) {
          if ((deduced.inferred || rawJoined) && notes) {
            await rawSql`UPDATE members SET joined_at = ${joinedAt}, notes = ${notes}, updated_at = NOW() WHERE id = ${memberId}`;
            memberUpdated = true;
          } else if (deduced.inferred || rawJoined) {
            await rawSql`UPDATE members SET joined_at = ${joinedAt}, updated_at = NOW() WHERE id = ${memberId}`;
            memberUpdated = true;
          } else if (notes) {
            await rawSql`UPDATE members SET notes = ${notes}, updated_at = NOW() WHERE id = ${memberId}`;
            memberUpdated = true;
          }
        }
      } catch (e) {
        // 回填失败不阻断后续开卡
      }
    }

    // 开卡逻辑（新会员与老会员统一执行）
    let cardId: number | undefined;
    let cardReason = "";
    let isDuplicateCard = false;

    if (cardName) {
      const type = typeByName.get(cardName);
      if (!type) {
        cardReason = `卡种「${cardName}」不存在，会员${isExistingMember ? "已匹配" : "已建"}但未开卡`;
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
            cardReason = "该卡此前已开通，跳过重复开卡";
            isDuplicateCard = true;
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
              INSERT INTO card_transactions (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, created_at)
              VALUES (1, ${cardId}, ${memberId}, 'purchase', ${isCount ? total : 0}, ${isCount ? remaining : 0}, '批量导入开卡', ${key}, NOW())`;
          }
        }
      }
    } else {
      // 未填卡名：不开卡
      if (isExistingMember) {
        if (memberUpdated) {
          cardReason = `老会员档案已更新相伴起始日（${joinedAt}${deduced.label ? " · " + deduced.label : ""}，未开卡）`;
        } else {
          cardReason = "老会员未填写开卡卡名，跳过开卡";
        }
      } else {
        cardReason = `已建档并生成相伴旅程（起始日：${joinedAt}${deduced.label ? " · " + deduced.label : ""}，未开卡）`;
      }
    }

    const cleanPhone = (activePhone || "").replace(/\D/g, "");
    const loginMode: "phone" | "pin" = cleanPhone.length >= 4 ? "phone" : "pin";
    const secondFactor = loginMode === "phone" ? cleanPhone.slice(-4) : loginPin;

    let rowStatus: "created" | "skipped" | "failed" = "created";
    if (isExistingMember) {
      if (cardId && !isDuplicateCard) {
        rowStatus = "created"; // 成功补卡
      } else if (memberUpdated) {
        rowStatus = "created"; // 成功更新老会员相伴资料
      } else {
        rowStatus = "skipped"; // 老会员无新卡开通且无资料更新
      }
    }

    results.push({
      line,
      status: rowStatus,
      name,
      matchedBy,
      portalCode,
      loginPin,
      loginMode,
      secondFactor,
      cardName: cardName || undefined,
      cardId,
      reason: cardReason || (isExistingMember && cardId && !isDuplicateCard ? "已成功为老会员补开卡" : undefined),
    });
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    cardsCreated: results.filter((r) => r.cardId && r.reason !== "该卡此前已开通，跳过重复开卡").length,
    membersCreated: results.filter((r) => r.matchedBy === "new" && r.status === "created").length,
    cardsSupplemented: results.filter((r) => r.matchedBy !== "new" && r.status === "created").length,
  };

  return NextResponse.json({ summary, results });
}
