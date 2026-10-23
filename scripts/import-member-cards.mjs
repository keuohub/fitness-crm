// scripts/import-member-cards.mjs
//
// 批量导入会员卡（历史卡基线 / 新会员开卡）。默认 dry-run，只有 --commit 才写库。
//
// 用法：
//   # 1) 先试跑，不改库（把 CSV 换成你的文件）
//   node scripts/import-member-cards.mjs --file imports/会员卡导入.csv
//
//   # 2) 确认清单没问题后真写（必须显式授权，自动备份受影响的行）
//   ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 node scripts/import-member-cards.mjs --file imports/会员卡导入.csv --commit
//
//   # 卡种不存在时自动新建（建议先建好卡种再导，避免卡种重复）
//   ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1 node scripts/import-member-cards.mjs --file x.csv --commit --create-types
//
// CSV 列名支持中英文（顺序不限，多写少写都行）：
//   会员ID/id | 会员编号（LW284 或 QZY684366）| 手机号 | 姓名
//   卡名 | 类别（次卡/期限卡 或 count/period，可留空自动判断）
//   总次数 | 剩余次数 | 生效日 | 到期日 | 有效天数
//
// 规则：
// - 次卡：总次数/剩余次数必填（剩余 ≤ 总数）；期限卡：到期日或有效天数必填
// - 同一张卡重复导入会被幂等键挡住（不会重复开卡）
// - 写库前把 member_cards / card_transactions / card_types 备份到 backups/
// - 结束输出对账 CSV：backups/cards-import-report-*.csv

import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DO_COMMIT = args.includes("--commit");
const CREATE_TYPES = args.includes("--create-types");
const FILE = argOf("--file", "");

function readEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("找不到 .env.local");
  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split("\n").map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
  );
}

// ── 极简 CSV 解析（支持逗号/制表符、双引号转义、UTF-8 BOM）──
function parseTable(text) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n")[0] || "";
  const delim = firstLine.includes("\t") ? "\t" : firstLine.split(",").length >= firstLine.split(";").length ? "," : ";";
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

const ALIASES = {
  memberId: ["会员id", "memberid", "id", "member_id"],
  memberCode: ["会员编号", "编号", "membercode", "member_code", "会员码", "portalcode"],
  phone: ["手机号", "手机", "电话", "phone", "mobile"],
  name: ["姓名", "会员姓名", "名字", "name"],
  cardType: ["卡名", "卡种", "卡类型", "卡类型名称", "cardtype", "cardtype name", "cardname", "卡项"],
  category: ["类别", "卡类别", "类型", "category"],
  total: ["总次数", "总数", "total", "totalcount", "total_count", "总节数"],
  remaining: ["剩余次数", "剩余", "remaining", "remainingcount", "remaining_count", "余次", "剩余节数"],
  validFrom: ["生效日", "生效日期", "开始日期", "validfrom", "valid_from", "start"],
  validUntil: ["到期日", "截止日期", "有效期至", "validuntil", "valid_until", "expire", "过期"],
  days: ["有效天数", "天数", "validitydays", "validity_days"],
};
function normKey(s) { return String(s || "").trim().toLowerCase().replace(/[\s_\-()（）]/g, ""); }
function mapHeaders(headers) {
  return headers.map((h) => {
    const k = normKey(h);
    for (const [field, list] of Object.entries(ALIASES)) {
      if (list.some((a) => normKey(a) === k)) return field;
    }
    return "";
  });
}

const num = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : Number(String(v).trim()));
function dateOrNull(v) {
  const s = String(v || "").trim().replace(/[./]/g, "-");
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s; // 交给数据库报错，先原样输出，便于人工核对
}
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const env = readEnv();
  if (!FILE) throw new Error("缺少 --file，例如 --file imports/会员卡导入.csv");
  const abs = path.isAbsolute(FILE) ? FILE : path.join(ROOT, FILE);
  if (!fs.existsSync(abs)) throw new Error("文件不存在：" + abs);
  if (DO_COMMIT && (process.env.ALLOW_DB_WRITE !== "1" || process.env.ALLOW_REMOTE_DB_WRITE !== "1")) {
    throw new Error("写库被拒绝：请显式设置 ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1（先跑 dry-run 确认清单）");
  }
  const sql = neon(env.DATABASE_URL);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  // 写库前备份受影响的三张表（可回滚）
  if (DO_COMMIT) {
    const snap = {
      at: new Date().toISOString(),
      file: path.relative(ROOT, abs),
      member_cards: await sql`SELECT * FROM member_cards ORDER BY id`,
      card_transactions: await sql`SELECT * FROM card_transactions ORDER BY id`,
      card_types: await sql`SELECT * FROM card_types ORDER BY id`,
    };
    fs.mkdirSync(path.join(ROOT, "backups"), { recursive: true });
    const bp = path.join(ROOT, "backups", `cards-import-before-${ts}.json`);
    fs.writeFileSync(bp, JSON.stringify(snap, null, 1));
    console.log("备份：", bp, `（会员卡 ${snap.member_cards.length} 张 / 流水 ${snap.card_transactions.length} 条 / 卡种 ${snap.card_types.length} 个）`);
  }

  const table = parseTable(fs.readFileSync(abs, "utf8"));
  if (table.length < 2) throw new Error("CSV 里没有数据行");
  const map = mapHeaders(table[0]);
  const rows = table.slice(1).map((r) => {
    const o = {};
    map.forEach((field, i) => { if (field) o[field] = r[i] === undefined ? "" : String(r[i]).trim(); });
    return o;
  });
  console.log(`文件：${path.relative(ROOT, abs)}｜数据行 ${rows.length}｜模式：${DO_COMMIT ? "写库(--commit)" : "试跑(dry-run)"}`);

  const members = await sql`SELECT id, name, phone, member_code, portal_code FROM members`;
  const byId = new Map(members.map((m) => [String(m.id), m]));
  const byCode = new Map(members.filter((m) => m.member_code).map((m) => [String(m.member_code).toUpperCase(), m]));
  const byPortal = new Map(members.filter((m) => m.portal_code).map((m) => [String(m.portal_code).toUpperCase(), m]));
  const byPhone = new Map(members.filter((m) => m.phone).map((m) => [String(m.phone).trim(), m]));
  const byName = new Map();
  for (const m of members) {
    const k = String(m.name || "").trim();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(m);
  }
  function findMember(row) {
    if (row.memberId && byId.has(String(row.memberId).trim())) return { m: byId.get(String(row.memberId).trim()), how: "会员ID" };
    const code = String(row.memberCode || "").trim();
    if (/^LW\d+$/i.test(code)) {
      const id = code.replace(/^LW/i, "");
      if (byId.has(id)) return { m: byId.get(id), how: "LW编号" };
    }
    if (code && byCode.has(code.toUpperCase())) return { m: byCode.get(code.toUpperCase()), how: "会员编号" };
    if (code && byPortal.has(code.toUpperCase())) return { m: byPortal.get(code.toUpperCase()), how: "登录编号" };
    const phone = String(row.phone || "").trim();
    if (phone && byPhone.has(phone)) return { m: byPhone.get(phone), how: "手机号" };
    const name = String(row.name || "").trim();
    if (name && byName.has(name)) {
      const list = byName.get(name);
      if (list.length === 1) return { m: list[0], how: "姓名" };
      return { error: `姓名「${name}」重名 ${list.length} 人，请改用会员ID/编号/手机号` };
    }
    return { error: "找不到会员" };
  }

  const cardTypes = await sql`SELECT id, name, category, total_count, validity_days FROM card_types`;
  const typeByName = new Map(cardTypes.map((t) => [String(t.name).trim(), t]));
  function findType(name) { return typeByName.get(String(name || "").trim()) || null; }

  const results = [];
  const toCreate = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 2;
    const got = findMember(r);
    if (got.error) { results.push({ line, status: "失败", reason: got.error, member: r.name || r.memberCode || "", card: r.cardType || "" }); continue; }
    const member = got.m;
    const total = num(r.total), remaining = num(r.remaining);
    const validFrom = dateOrNull(r.validFrom) || new Date().toISOString().slice(0, 10);
    let category = String(r.category || "").trim();
    if (!category) category = total !== null && remaining !== null ? "count" : "period";
    if (/次/.test(category)) category = "count";
    if (/期限|时间|月|季|年/.test(category)) category = "period";
    const type = findType(r.cardType);
    let cardTypeId = type ? type.id : null;
    const validityDays = num(r.days) || (type && type.validity_days) || null;
    const validUntil = dateOrNull(r.validUntil) || (validityDays ? new Date(new Date(validFrom).getTime() + validityDays * 86400000).toISOString().slice(0, 10) : null);
    // 校验
    if (!r.cardType) { results.push({ line, status: "失败", reason: "缺少卡名", member: member.name, card: "" }); continue; }
    if (category === "count" && (total === null || remaining === null)) { results.push({ line, status: "失败", reason: "次卡缺少总次数/剩余次数", member: member.name, card: r.cardType }); continue; }
    if (category === "count" && (total < 0 || remaining < 0 || remaining > total)) { results.push({ line, status: "失败", reason: `次数不合理（总数 ${total} / 剩余 ${remaining}）`, member: member.name, card: r.cardType }); continue; }
    if (category === "period" && !validUntil) { results.push({ line, status: "失败", reason: "期限卡缺少到期日或有效天数", member: member.name, card: r.cardType }); continue; }
    if (!cardTypeId) {
      if (!CREATE_TYPES) { results.push({ line, status: "失败", reason: `卡种「${r.cardType}」不存在（可加 --create-types 自动建）`, member: member.name, card: r.cardType }); continue; }
      toCreate.push({ line, name: r.cardType, category, total, validityDays, member, remaining, validFrom, validUntil });
      continue;
    }
    const key = `import-${member.id}-${cardTypeId}-${validFrom}-${validUntil || ""}-${category === "count" ? remaining : 0}`;
    const plan = { line, member, cardTypeId, cardName: r.cardType, category, total, remaining, validFrom, validUntil, key };
    if (!DO_COMMIT) { results.push({ line, status: "将写入", reason: `${member.name} ｜ ${r.cardType} ｜ ${category === "count" ? `余 ${remaining}/${total} 次` : `至 ${validUntil}`}`, member: member.name, card: r.cardType }); continue; }
    const [dup] = await sql`SELECT id FROM member_cards WHERE idempotency_key = ${key} LIMIT 1`;
    if (dup) { results.push({ line, status: "跳过", reason: `已存在（卡 id=${dup.id}）`, member: member.name, card: r.cardType }); continue; }
    const [card] = await sql`
      INSERT INTO member_cards
        (tenant_id, member_id, card_type_id, status, total_count, remaining_count, valid_from, valid_until, purchased_at, price_cents, idempotency_key, created_at, updated_at)
      VALUES
        (1, ${member.id}, ${cardTypeId}, 'active',
         ${category === "count" ? total : null}, ${category === "count" ? remaining : null},
         ${validFrom}, ${validUntil}, ${validFrom}, 0, ${key}, NOW(), NOW())
      RETURNING id`;
    await sql`
      INSERT INTO card_transactions (tenant_id, member_card_id, member_id, type, amount, balance_after, note, created_at)
      VALUES (1, ${card.id}, ${member.id}, 'purchase', ${category === "count" ? total : 0}, ${category === "count" ? remaining : 0}, '历史卡导入（基线）', NOW())`;
    results.push({ line, status: "成功", reason: `开卡 id=${card.id}`, member: member.name, card: r.cardType });
  }

  // --create-types：缺的卡种先建
  if (DO_COMMIT && CREATE_TYPES && toCreate.length) {
    for (const c of toCreate) {
      const [t] = await sql`
        INSERT INTO card_types (tenant_id, name, category, price_cents, validity_days, weekly_limit, total_count, is_active, sort_order, created_at)
        VALUES (1, ${c.name}, ${c.category}, 0, ${c.validityDays}, null, ${c.category === "count" ? c.total : null}, 1, 99, NOW())
        RETURNING id`;
      const key = `import-${c.member.id}-${t.id}-${c.validFrom}-${c.validUntil || ""}-${c.category === "count" ? c.remaining : 0}`;
      const [card] = await sql`
        INSERT INTO member_cards
          (tenant_id, member_id, card_type_id, status, total_count, remaining_count, valid_from, valid_until, purchased_at, price_cents, idempotency_key, created_at, updated_at)
        VALUES (1, ${c.member.id}, ${t.id}, 'active',
          ${c.category === "count" ? c.total : null}, ${c.category === "count" ? c.remaining : null},
          ${c.validFrom}, ${c.validUntil}, ${c.validFrom}, 0, ${key}, NOW(), NOW()) RETURNING id`;
      await sql`
        INSERT INTO card_transactions (tenant_id, member_card_id, member_id, type, amount, balance_after, note, created_at)
        VALUES (1, ${card.id}, ${c.member.id}, 'purchase', ${c.category === "count" ? c.total : 0}, ${c.category === "count" ? c.remaining : 0}, '历史卡导入（基线，新建卡种）', NOW())`;
      results.push({ line: c.line, status: "成功", reason: `新建卡种 id=${t.id}，开卡 id=${card.id}`, member: c.member.name, card: c.name });
    }
  }

  // 汇总 + 对账 CSV
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(`\n结果：成功 ${count("成功")}｜将写入 ${count("将写入")}｜跳过 ${count("跳过")}｜失败 ${count("失败")}`);
  const bad = results.filter((r) => r.status === "失败");
  if (bad.length) { console.log("\n失败明细："); bad.forEach((b) => console.log(`  第 ${b.line} 行 ${b.member} ${b.card} → ${b.reason}`)); }
  fs.mkdirSync(path.join(ROOT, "backups"), { recursive: true });
  const out = path.join(ROOT, "backups", `cards-import-report-${ts}.csv`);
  fs.writeFileSync(out, "\uFEFF" + [["行号", "结果", "会员", "卡名", "说明"].map(esc).join(",")]
    .concat(results.map((r) => [r.line, r.status, r.member, r.card, r.reason].map(esc).join(","))).join("\n"));
  console.log("对账表：", out);
  if (DO_COMMIT) {
    const [c] = await sql`SELECT count(*)::int n FROM member_cards`;
    const [t] = await sql`SELECT count(*)::int n FROM card_transactions`;
    console.log(`写库后：member_cards=${c.n}｜card_transactions=${t.n}`);
  }
}

main().catch((e) => { console.error("导入异常：", e?.message || e); process.exit(1); });
