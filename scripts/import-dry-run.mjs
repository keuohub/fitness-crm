// 会员导入 dry-run：只读比对模板与 Neon，不写库、不改数据。
// 用法：node scripts/import-dry-run.mjs /tmp/laiwu_members_template.json
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const tplPath = process.argv[2] || "/tmp/laiwu_members_template.json";
const tpl = JSON.parse(fs.readFileSync(tplPath, "utf8"));

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = process.env.DATABASE_URL || pick("DATABASE_URL");
if (!url) { console.error("缺少 DATABASE_URL"); process.exit(1); }
const sql = neon(url);

const normalizePhone = (s) => (s || "").replace(/\D/g, "");

const db = await sql`
  SELECT id, name, phone, member_code, portal_code, joined_at, mentor_name, portal_enabled
  FROM members ORDER BY id`;

const byPhone = new Map();
const byCode = new Map();
const byName = new Map();
for (const m of db) {
  if (m.phone) byPhone.set(normalizePhone(m.phone), m);
  if (m.portal_code) byCode.set(String(m.portal_code).toUpperCase(), m);
  if (m.member_code) byCode.set(String(m.member_code).toUpperCase(), m);
  byName.set(m.name, m);
}

const stats = { phone: 0, code: 0, name: 0, allNew: 0 };
const newMembers = [];
const conflicts = [];
const dupPhones = new Map();

for (const t of tpl) {
  if (t.phone) dupPhones.set(t.phone, (dupPhones.get(t.phone) || 0) + 1);
  const p = t.phone ? byPhone.get(t.phone) : null;
  const c = t.code ? byCode.get(t.code) : null;
  const n = byName.get(t.name);
  if (p) stats.phone++;
  if (c) stats.code++;
  if (n) stats.name++;
  if (!p && !c && !n) { stats.allNew++; newMembers.push(t); }
  if ((p && c && p.id !== c.id) || (p && !c) || (c && !p)) {
    conflicts.push({ name: t.name, code: t.code, phone: t.phone, byPhone: p?.id ?? null, byCode: c?.id ?? null });
  }
}

console.log(`模板会员：${tpl.length} 人 | 数据库现有：${db.length} 人`);
console.log(`命中手机号：${stats.phone} | 命中激活码/卡号：${stats.code} | 命中姓名：${stats.name}`);
console.log(`三键都未命中（全新）：${stats.allNew}`);
console.log(`单键命中、其余不匹配（需人工确认）：${conflicts.length}`);
console.log(`模板内手机号重复：${[...dupPhones.values()].filter((v) => v > 1).length} 个`);
console.log(`模板内无手机号：${tpl.filter((t) => !t.phone).length} 人`);

console.log("\n数据库 portal_code 样例：", db.slice(0, 6).map((m) => m.portal_code || m.member_code || "-").join(", "));
console.log("模板激活码样例：", tpl.slice(0, 6).map((t) => t.code).join(", "));

if (newMembers.length) {
  console.log("\n全新会员前 10 位：");
  for (const m of newMembers.slice(0, 10)) console.log(`  ${m.name} | ${m.code} | ${m.phone || "无手机号"} | ${m.joined}`);
}
if (conflicts.length) {
  console.log("\n需人工确认的冲突前 10 条：");
  for (const c of conflicts.slice(0, 10)) console.log(`  ${c.name} | code=${c.code} | phone=${c.phone || "-"} | DB(phone)=${c.byPhone} DB(code)=${c.byCode}`);
}

// 出生/日期合法性等基础校验
const badDates = tpl.filter((t) => t.joined && !/^\d{4}-\d{2}-\d{2}$/.test(t.joined));
if (badDates.length) console.log("\n入会日期格式异常：", badDates.length, badDates.slice(0, 5).map((t) => `${t.name}:${t.joined}`));
