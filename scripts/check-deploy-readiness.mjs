import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import { execSync } from "node:child_process";

const envText = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const env = Object.fromEntries(
  envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
const results = [];
const add = (name, ok, detail = "") => results.push({ name, ok, detail });

for (const key of ["DATABASE_URL", "ADMIN_PASSWORD", "MEMBER_TOKEN_SECRET"]) {
  add(`env ${key}`, Boolean(env[key]), env[key] ? "已配置" : "缺失");
}
for (const key of ["WECHAT_APPID", "WECHAT_APPSECRET", "WX_TEMPLATE_BOOKING_SUCCESS", "WX_TEMPLATE_CLASS_REMINDER", "WX_TEMPLATE_CANCEL", "WX_TEMPLATE_NOTE"]) {
  add(`env ${key}`, Boolean(env[key]), env[key] ? "已配置" : "未配置（订阅消息会跳过）");
}

let sql = null;
try {
  sql = neon(env.DATABASE_URL);
  await sql`SELECT 1`;
  add("Neon 连接", true, "SELECT 1 成功");
  const tables = ["members", "card_types", "member_cards", "card_transactions", "class_sessions", "bookings", "attendance", "post_class_notes", "follow_ups", "studio_settings", "schedule_templates"];
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY(${tables})`;
  const found = new Set(rows.map((r) => r.table_name));
  add("核心表", tables.every((t) => found.has(t)), `${found.size}/${tables.length} 存在`);
  const cols = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND ((table_name='bookings' AND column_name='idempotency_key') OR (table_name='class_sessions' AND column_name='template_id'))`;
  add("关键迁移列", cols.length === 2, `${cols.length}/2 存在`);
} catch (e) {
  add("Neon 连接", false, String(e.message || e));
}

add("Dockerfile", fs.existsSync("Dockerfile"), fs.existsSync("Dockerfile") ? "存在" : "缺失");
add("备份目录", fs.existsSync("backups"), fs.existsSync("backups") ? "存在" : "不存在（部署前建）");
add("迁移脚本", fs.existsSync("scripts/migrate-booking-schema.mjs"), "booking schema");
add("云托管配置", fs.existsSync("cloudbaserc.json") || fs.existsSync(".cloudbaserc.json"), "未找到 cloudbaserc，需控制台部署");

try {
  const health = execSync("curl -s -o /tmp/laiwu-health.json -w '%{http_code}' http://localhost:3001/api/health", { encoding: "utf8" }).trim();
  add("本地 /api/health", health === "200", `HTTP ${health}`);
} catch {
  add("本地 /api/health", false, "服务未启动");
}

for (const r of results) console.log(`${r.ok ? "PASS" : "WARN"}  ${r.name}  ${r.detail}`);
const requiredFail = results.filter((r) => !r.ok && (r.name.startsWith("env DATABASE_URL") || r.name.startsWith("env ADMIN_PASSWORD") || r.name.startsWith("env MEMBER_TOKEN_SECRET") || r.name === "Neon 连接" || r.name === "核心表" || r.name === "关键迁移列"));
console.log(`\n${requiredFail.length === 0 ? "READY_FOR_DEPLOY_REVIEW" : "BLOCKED"}`);
process.exit(requiredFail.length === 0 ? 0 : 1);
