import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
import crypto from "node:crypto";

const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
const APPLY = process.argv.includes("--apply");
if (APPLY) requireDbWriteGuard("import-yueke-members", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());

function parseCsv(text) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = fs.readFileSync("imports/约刻会员_20261021.csv", "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(raw);
const header = rows.shift();
const yi = header.indexOf("姓名"), pi = header.indexOf("手机号");
const input = rows.map((r) => ({
  name: (r[yi] || "").trim(),
  phone: (r[pi] || "").replace(/\D/g, ""),
})).filter((x) => x.name || x.phone);

const db = await sql`SELECT id, name, phone, member_code, portal_code, portal_enabled, status FROM members`;
const norm = (s) => (s || "").replace(/\D/g, "");
const byPhone = new Map(), byName = new Map();
for (const m of db) { if (m.phone) byPhone.set(norm(m.phone), m); if (m.name) byName.set(m.name, m); }

// 下一个可用 LW 编号
let maxSeq = 8800;
for (const m of db) {
  const t = String(m.member_code || m.portal_code || "");
  const n = Number((t.match(/LW(\d+)/) || [])[1] || 0);
  if (n > maxSeq) maxSeq = n;
}

const plan = { updatePhone: [], skipNameConflict: [], create: [], existingPhone: 0 };
const seen = new Set();
for (const r of input) {
  if (r.phone && seen.has(r.phone)) continue;
  if (r.phone) seen.add(r.phone);
  const p = r.phone ? byPhone.get(r.phone) : null;
  const n = r.name ? byName.get(r.name) : null;
  if (p) { plan.existingPhone++; continue; }
  if (n) {
    if (!norm(n.phone) && r.phone) plan.updatePhone.push({ id: n.id, name: n.name, phone: r.phone });
    else plan.skipNameConflict.push({ id: n.id, name: n.name, yuekePhone: r.phone, dbPhone: n.phone });
    continue;
  }
  if (/^1(2345678901|1111111111|0000000000)$/.test(r.phone)) {
    plan.skipNameConflict.push({ name: r.name, yuekePhone: r.phone, reason: "placeholder" });
    continue;
  }
  plan.create.push({
    name: r.name || ("会员" + (r.phone.slice(-4) || "未知")),
    phone: r.phone || null,
    memberCode: "LW" + String(++maxSeq),
    loginPin: String(crypto.randomInt(100000, 1000000)),
  });
}

console.log("输入有效行:", input.length);
console.log("手机号已存在（跳过）:", plan.existingPhone);
console.log("同名且徕舞无手机号（补手机号）:", plan.updatePhone.length);
console.log("同名但手机号不同（不自动合并）:", plan.skipNameConflict.length);
console.log("新建会员:", plan.create.length);
console.log("前 5 个新建:", plan.create.slice(0, 5).map((x) => `${x.name}/${x.phone || "-"}/${x.memberCode}`));

if (!APPLY) {
  fs.mkdirSync("imports", { recursive: true });
  fs.writeFileSync("imports/yueke-import-plan.json", JSON.stringify(plan, null, 2));
  console.log("\n[dry-run] 计划写入 imports/yueke-import-plan.json；确认后执行 --apply");
  process.exit(0);
}

// 备份现有会员关键字段
fs.mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `backups/members-before-yueke-import-${stamp}.json`;
fs.writeFileSync(backup, JSON.stringify(db, null, 2));
console.log("备份:", backup);

// 同名会员的手机号不自动写入，避免同名不同人；导出待确认清单
fs.writeFileSync("imports/待确认手机号.csv", "\ufeff姓名,徕舞会员ID,约刻手机号\n" + plan.updatePhone.map(u => `${u.name},${u.id},${u.phone}`).join("\n"));
console.log("待确认手机号（未写入）:", plan.updatePhone.length);

// 新建会员
let created = 0;
for (const m of plan.create) {
  const dup = m.phone ? await sql`SELECT id FROM members WHERE phone = ${m.phone} LIMIT 1` : [];
  if (dup.length) continue;
  await sql`INSERT INTO members
    (tenant_id, name, phone, phone_verified, member_code, portal_code, login_pin,
     portal_enabled, status, mentor_name, joined_at, created_at, updated_at)
    VALUES
    (1, ${m.name}, ${m.phone}, ${m.phone ? 1 : 0}, ${m.memberCode}, ${m.memberCode}, ${m.loginPin},
     1, 'active', '导师 小桥', NULL, NOW(), NOW())`;
  created++;
}
console.log("已新建会员:", created);

// 导出 PIN 清单（只含本次新建）
const pinCsv = "imports/徕舞新会员_登录PIN.csv";
const lines = ["姓名,手机号,邀请码,登录PIN"];
for (const m of plan.create) lines.push(`${m.name},${m.phone || ""},${m.memberCode},${m.loginPin}`);
fs.writeFileSync(pinCsv, "\ufeff" + lines.join("\n"));
console.log("PIN 清单:", pinCsv);

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM members WHERE portal_enabled = 1 AND status <> 'archived'`;
console.log("当前可登录会员:", n);
