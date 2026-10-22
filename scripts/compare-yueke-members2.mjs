import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
const rows = JSON.parse(fs.readFileSync("/tmp/yueke-all.json", "utf8"));
const db = await sql`SELECT id,name,phone,member_code,portal_enabled,status FROM members`;
const norm = (s) => (s || "").replace(/\D/g, "");
const byPhone = new Map(), byName = new Map();
for (const m of db) { if (m.phone) byPhone.set(norm(m.phone), m); if (m.name) byName.set(m.name, m); }
let phone=0, nameOnly=0, fresh=0; const freshList=[], nameConf=[];
for (const r of rows) {
  const p = r.phone ? byPhone.get(r.phone) : null;
  const n = r.name ? byName.get(r.name) : null;
  if (p) phone++;
  else if (n) { nameOnly++; nameConf.push({ yueke: r, dbPhone: n.phone, dbId: n.id }); }
  else { fresh++; freshList.push(r); }
}
console.log({ total: rows.length, matchedPhone: phone, matchedNameOnly: nameOnly, fresh, dbTotal: db.length });
console.log("fresh sample:", freshList.slice(0, 15));
console.log("name-only sample:", nameConf.slice(0, 8));
fs.writeFileSync("imports/yueke-compare.json", JSON.stringify({ total: rows.length, matchedPhone: phone, matchedNameOnly: nameOnly, fresh, freshList, nameConf }, null, 2));
