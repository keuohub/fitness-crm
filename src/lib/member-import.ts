import { addCalendarDays, shanghaiToday } from "@/lib/shanghai-date";

export const IMPORT_COLUMNS = [
  "姓名",
  "手机号",
  "性别",
  "生日",
  "入会日期",
  "带教导师",
  "备注",
  "卡名",
  "总次数",
  "剩余次数",
  "生效日",
  "到期日",
  "有效天数",
] as const;

export const MAX_IMPORT_ROWS = 500;

export type ImportStatus = "created" | "skipped" | "failed";

export type PlannedRow = {
  line: number;
  ok: boolean;
  name: string;
  phone: string;
  memberCode: string;
  gender: string | null;
  birthday: string;
  joinedAt: string;
  joinedInferred: boolean;
  joinedLabel?: string;
  mentorName: string;
  notes: string;
  cardName: string;
  isCount: boolean | null;
  total: number | null;
  remaining: number | null;
  validFrom: string;
  validUntil: string | null;
  reason?: string;
  warnings: string[];
};

export function normalizePhone(raw: string): { phone: string; error?: string } {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return { phone: "" };
  let d = digits;
  if (d.startsWith("0086")) d = d.slice(4);
  else if (d.startsWith("86") && d.length === 13) d = d.slice(2);
  if (!/^1\d{10}$/.test(d)) return { phone: "", error: `手机号「${raw}」不是 11 位大陆手机号` };
  return { phone: d };
}

export function toDate(v: string): string {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s));
    if (n >= 20000 && n <= 80000) return excelSerialToISO(n);
  }
  const norm = s.replace(/[./]/g, "-").replace(/年/g, "-").replace(/月/g, "-").replace(/日/g, "");
  const m = norm.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function excelSerialToISO(serial: number): string {
  const utc = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

export function mapGender(v: string): { gender: string | null; error?: string } {
  const s = v.trim().toLowerCase();
  if (!s) return { gender: null };
  if (["女", "female", "f", "女士"].includes(s)) return { gender: "female" };
  if (["男", "male", "m", "先生"].includes(s)) return { gender: "male" };
  return { gender: null, error: `性别「${v}」无法识别，请填男或女，或留空` };
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseIntField(raw: string): { value: number | null; error?: string } {
  if (!raw) return { value: null };
  if (!/^\d+$/.test(raw)) return { value: null, error: `次数「${raw}」必须是整数` };
  return { value: Number(raw) };
}

export function deduceJoinedAt(
  rawJoined: string,
  notes: string,
  now: Date = new Date()
): { date: string; inferred: boolean; label?: string; error?: string } {
  const todayStr = shanghaiToday(now);

  const explicit = toDate(rawJoined);
  if (rawJoined && explicit) return { date: explicit, inferred: false };
  if (rawJoined && !explicit && /^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(rawJoined.trim())) {
    return { date: todayStr, inferred: false, error: `入会日期「${rawJoined}」不是有效日期` };
  }

  const ym = rawJoined.replace(/[./]/g, "-").trim().match(/^(\d{4})-(\d{1,2})$/);
  if (ym) {
    const y = ym[1];
    const m = String(ym[2]).padStart(2, "0");
    if (Number(m) < 1 || Number(m) > 12) return { date: todayStr, inferred: false, error: `入会年月「${rawJoined}」无效` };
    return { date: `${y}-${m}-01`, inferred: true, label: `${y}年${m}月` };
  }

  const pureNum = rawJoined.trim().match(/^(\d+)$/);
  if (pureNum) {
    const n = parseInt(pureNum[1], 10);
    const yearNow = Number(todayStr.slice(0, 4));
    if (n >= 2010 && n <= yearNow) return { date: `${n}-01-01`, inferred: true, label: `${n}年` };
    if (n > 0 && n <= 15000) return { date: addCalendarDays(todayStr, -(n - 1)), inferred: true, label: `${n}天` };
    return { date: todayStr, inferred: false, error: `入会日期「${rawJoined}」无法识别` };
  }

  const text = `${rawJoined} ${notes}`.trim();
  if (!text) return { date: todayStr, inferred: false };

  const dayMatch = text.match(/(?:约|大概|上了|练了|相伴|已有|来了|天数)?\s*(\d+)\s*天/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days > 0 && days <= 15000) return { date: addCalendarDays(todayStr, -(days - 1)), inferred: true, label: `${days}天` };
  }

  const yearInText = text.match(/(20\d{2})\s*年?/);
  if (yearInText) {
    const y = parseInt(yearInText[1], 10);
    const yearNow = Number(todayStr.slice(0, 4));
    if (y >= 2010 && y <= yearNow) return { date: `${y}-01-01`, inferred: true, label: `${y}年` };
  }

  const halfYearMatch = text.match(/(\d+)\s*年半/);
  if (halfYearMatch) {
    const days = Math.round((parseFloat(halfYearMatch[1]) + 0.5) * 365);
    return { date: addCalendarDays(todayStr, -(days - 1)), inferred: true, label: `${days}天` };
  }
  if (/半年/.test(text)) {
    return { date: addCalendarDays(todayStr, -(182 - 1)), inferred: true, label: "182天" };
  }
  const yearMatch = text.match(/(?:约|大概|上了|练了|相伴|已有|会员)?\s*(\d+(?:\.\d+)?)\s*年/);
  if (yearMatch) {
    const years = parseFloat(yearMatch[1]);
    if (years > 0 && years <= 30) {
      const days = Math.round(years * 365);
      return { date: addCalendarDays(todayStr, -(days - 1)), inferred: true, label: `${days}天` };
    }
  }
  const monthMatch = text.match(/(?:约|大概|上了|练了)?\s*(\d+)\s*个?月/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    if (months > 0 && months < 120) {
      const days = Math.round(months * 30.5);
      return { date: addCalendarDays(todayStr, -(days - 1)), inferred: true, label: `${days}天` };
    }
  }

  if (rawJoined) return { date: todayStr, inferred: false, error: `入会日期「${rawJoined}」无法识别，请填 YYYY-MM-DD 或具体天数` };
  return { date: todayStr, inferred: false };
}

export type MatchableMember = { id: number; name: string; phone: string; memberCode: string };

export function matchExistingMember(
  row: Pick<PlannedRow, "name" | "phone" | "memberCode">,
  members: MatchableMember[]
): { ok: true; member: MatchableMember | null; matchedBy: "phone" | "memberCode" | "name" | "new"; warning?: string } | { ok: false; reason: string } {
  if (row.phone) {
    const hits = members.filter((m) => m.phone === row.phone);
    if (hits.length > 1) return { ok: false, reason: `库内有 ${hits.length} 位会员使用手机号 ${row.phone}，请先在会员档案合并后再导入` };
    if (hits.length === 1) {
      const member = hits[0];
      return {
        ok: true,
        member,
        matchedBy: "phone",
        warning: member.name !== row.name ? `手机号匹配到「${member.name}」，表格姓名是「${row.name}」，沿用库内档案，不会改名` : undefined,
      };
    }
    if (members.some((m) => m.name === row.name)) {
      return { ok: true, member: null, matchedBy: "new", warning: "已有同名会员，但这行有不同手机号，将新建档案，不会并到同名会员上" };
    }
    return { ok: true, member: null, matchedBy: "new" };
  }
  if (row.memberCode) {
    const code = row.memberCode.toUpperCase();
    const member = members.find((m) => m.memberCode.toUpperCase() === code || (!code.startsWith("LW") && `LW${m.memberCode}`.toUpperCase() === code) || m.memberCode.toUpperCase() === code.replace(/^LW/, ""));
    if (!member) return { ok: false, reason: `会员编号 ${row.memberCode} 不存在。新会员请留空编号，用手机号或姓名匹配` };
    return { ok: true, member, matchedBy: "memberCode" };
  }
  const hits = members.filter((m) => m.name === row.name);
  if (hits.length > 1) return { ok: false, reason: `库内有 ${hits.length} 位「${row.name}」，请补手机号或会员编号` };
  if (hits.length === 1) return { ok: true, member: hits[0], matchedBy: "name", warning: "仅凭姓名匹配。若不是同一个人，请补手机号后重新导入" };
  return { ok: true, member: null, matchedBy: "new" };
}

export function cardIdempotencyKey(memberId: number, cardTypeId: number, validFrom: string, validUntil: string | null): string {
  return `import-m${memberId}-t${cardTypeId}-from${validFrom}-until${validUntil || "open"}`;
}

export function planImportRow(row: Record<string, unknown>, line: number, now: Date = new Date()): PlannedRow {
  const warnings: string[] = [];
  const name = pick(row, ["姓名", "会员姓名", "name", "名字"]).slice(0, 30);
  const phoneRaw = pick(row, ["手机号", "手机", "电话", "phone", "mobile"]);
  const phoneParsed = normalizePhone(phoneRaw);
  const memberCode = pick(row, ["会员编号", "卡号", "编号", "memberCode", "code", "member_code"]).toUpperCase();
  const genderParsed = mapGender(pick(row, ["性别", "gender"]));
  const birthdayRaw = pick(row, ["生日", "birthday"]);
  const birthday = birthdayRaw ? toDate(birthdayRaw) : "";
  const rawJoined = pick(row, ["入会日期", "入会时间", "joinedAt", "joinDate", "相伴天数", "来时路天数", "天数", "相伴日子"]);
  const notes = pick(row, ["备注", "notes", "note"]);
  const mentorName = pick(row, ["带教导师", "导师", "mentorName", "mentor"]);
  const deduced = deduceJoinedAt(rawJoined, notes, now);
  const cardName = pick(row, ["卡名", "卡种", "卡类型", "cardName", "cardType"]);
  const totalParsed = parseIntField(pick(row, ["总次数", "总数", "total", "totalCount"]));
  const remainParsed = parseIntField(pick(row, ["剩余次数", "剩余", "remaining", "remainingCount"]));
  const validFromRaw = pick(row, ["生效日", "生效日期", "validFrom"]);
  const validUntilRaw = pick(row, ["到期日", "截止日期", "validUntil"]);
  const daysRaw = pick(row, ["有效天数", "validityDays", "days"]);

  const fail = (reason: string): PlannedRow => ({
    line,
    ok: false,
    name: name || "（空）",
    phone: phoneParsed.phone,
    memberCode,
    gender: genderParsed.gender,
    birthday,
    joinedAt: deduced.date,
    joinedInferred: deduced.inferred,
    joinedLabel: deduced.label,
    mentorName,
    notes,
    cardName,
    isCount: null,
    total: totalParsed.value,
    remaining: remainParsed.value,
    validFrom: "",
    validUntil: null,
    reason,
    warnings,
  });

  if (!name) return fail("缺少姓名");
  if (phoneParsed.error) return fail(phoneParsed.error);
  if (genderParsed.error) return fail(genderParsed.error);
  if (birthdayRaw && !birthday) return fail(`生日「${birthdayRaw}」不是有效日期`);
  if (deduced.error) return fail(deduced.error);
  if (totalParsed.error) return fail(totalParsed.error);
  if (remainParsed.error) return fail(remainParsed.error);
  if (validFromRaw && !toDate(validFromRaw)) return fail(`生效日「${validFromRaw}」不是有效日期`);
  if (validUntilRaw && !toDate(validUntilRaw)) return fail(`到期日「${validUntilRaw}」不是有效日期`);
  if (daysRaw && !/^\d+$/.test(daysRaw)) return fail(`有效天数「${daysRaw}」必须是整数`);

  const validFrom = toDate(validFromRaw) || deduced.date;
  const days = daysRaw ? Number(daysRaw) : null;
  const validUntil = toDate(validUntilRaw) || (days ? addCalendarDays(validFrom, days) : null);
  if (validUntil && validFrom && validUntil < validFrom) return fail("到期日早于生效日");

  if (cardName && remainParsed.value != null && totalParsed.value != null && remainParsed.value > totalParsed.value) {
    return fail(`剩余次数 ${remainParsed.value} 大于总次数 ${totalParsed.value}`);
  }

  if (!rawJoined && !notes) warnings.push("未填入会日期，相伴天数将从今天起算");
  if (deduced.inferred && deduced.label) warnings.push(`相伴起始日按「${deduced.label}」推算为 ${deduced.date}`);

  return {
    line,
    ok: true,
    name,
    phone: phoneParsed.phone,
    memberCode,
    gender: genderParsed.gender,
    birthday,
    joinedAt: deduced.date,
    joinedInferred: deduced.inferred,
    joinedLabel: deduced.label,
    mentorName,
    notes,
    cardName,
    isCount: null,
    total: totalParsed.value,
    remaining: remainParsed.value,
    validFrom,
    validUntil,
    warnings,
  };
}

/** Same-file duplicates. Phone collision fails the later row. Same name without phone fails every such row. */
export function tableToRecords(table: string[][]): Record<string, string>[] {
  if (table.length < 2) return [];
  const headers = table[0].map((h) => String(h || "").trim());
  return table
    .slice(1)
    .map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) o[h] = String(r[i] ?? "").trim();
      });
      return o;
    })
    .filter((o) => Object.values(o).some((v) => v));
}

export function annotateInFileDuplicates(rows: PlannedRow[]): void {
  const phoneLines = new Map<string, number[]>();
  const bareNameLines = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.ok) continue;
    if (row.phone) {
      const list = phoneLines.get(row.phone) || [];
      list.push(row.line);
      phoneLines.set(row.phone, list);
    } else if (!row.memberCode) {
      const list = bareNameLines.get(row.name) || [];
      list.push(row.line);
      bareNameLines.set(row.name, list);
    }
  }
  for (const row of rows) {
    if (!row.ok) continue;
    const phones = row.phone ? phoneLines.get(row.phone) : undefined;
    if (phones && phones.length > 1 && phones[0] !== row.line) {
      row.ok = false;
      row.reason = `本表内手机号与第 ${phones[0]} 行重复`;
    }
    const names = !row.phone && !row.memberCode ? bareNameLines.get(row.name) : undefined;
    if (names && names.length > 1) {
      row.ok = false;
      row.reason = `本表内有 ${names.length} 行同名「${row.name}」且没有手机号或会员编号，无法区分`;
    }
  }
}
