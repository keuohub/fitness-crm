import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
const raw = fs.readFileSync("imports/约刻会员_20261021.csv", "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter(Boolean).slice(1);
const rows = lines.map((line) => {
  const [name, phone] = line.split(",");
  return { name: (name || "").trim(), phone: (phone || "").replace(/\D/g, "") };
}).filter((r) => r.name);
const db = await sql`SELECT id,name,phone,member_code,portal_enabled,status FROM members`;
const norm = (s) => (s || "").replace(/\D/g, "");
const byPhone = new Map(); const byName = new Map();
for (const m of db) { if (m.phone) byPhone.set(norm(m.phone), m); byName.set(m.name, m); }
const seenPhone = new Map(); let dupPhone = 0;
const matchedPhone = [], matchedName = [], newOnes = [], conflicts = [];
for (const r of rows) {
  if (r.phone) { seenPhone.set(r.phone, (seenPhone.get(r.phone) || 0) + 1); if (seenPhone.get(r.phone) > 1) dupPhone++; }
  const p = r.phone ? byPhone.get(r.phone) : null;
  const n = byName.get(r.name);
  if (p) matchedPhone.push(r);
  else if (n) matchedName.push({ ...r, dbPhone: n.phone });
  else newOnes.push(r);
  if ((p && n && p.id !== n.id) || (p && !n) || (n && !p && r.phone)) conflicts.push({ ...r, dbPhone: n?.phone || null, dbId: n?.id || p?.id || null });
}
console.log("约刻 CSV 会员:", rows.length);
console.log("按手机号命中徕舞:", matchedPhone.length);
console.log("按姓名命中（手机号不同/缺失）:", matchedName.length);
console.log("徕舞没有的新会员:", newOnes.length);
console.log("CSV 内重复手机号:", dupPhone);
console.log("需人工确认的冲突:", conflicts.length);
console.log("\n新会员前 12 个:", newOnes.slice(0, 12).map((x) => `${x.name}/${x.phone || "无手机号"}`).join(", "));
console.log("\n按姓名命中但手机号不一致前 8 个:", matchedName.slice(0, 8).map((x) => `${x.name} 约刻:${x.phone || "-"} 徕舞:${x.dbPhone || "-"}`).join(" | "));
fs.mkdirSync("imports", { recursive: true });
fs.writeFileSync("imports/yueke-compare.json", JSON.stringify({ total: rows.length, matchedPhone: matchedPhone.length, matchedName: matchedName.length, newOnes: newOnes.length, conflicts, newMembers: newOnes }, null, 2));
console.log("\n明细写入 imports/yueke-compare.json");
