// 卡种课程权限自检脚本（只读，不写库）
//
// 用法：
//   node --env-file=.env.local scripts/test-permissions-and-import.mjs
//   （没有 --env-file 时脚本会自己读 .env.local）
//
// 设计原则（2026-10 验收版）：
//   - 只做 SELECT，不写库
//   - 卡种断言按 id 匹配，不依赖会被验收改名的 name（例如「瑜伽次卡」会被改成「瑜伽10次卡」）
//   - 课种断言按 course_categories.key 匹配（pilates/equipment/fat_burn/private/yoga），
//     不依赖中文名
//   - 验收期会新增卡种/课种/课次/会员卡，所以「基线行」用 id 白名单断言，
//     非基线新增数据只做 INFO 展示，不判 FAIL
//   - 输出格式保持原样：每项 [PASS]/[FAIL]，最后汇总，有失败退出码 1

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

// ── 连接（优先环境变量，其次 .env.local）────────────────────────
function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envPath = path.resolve(import.meta.dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("找不到 DATABASE_URL：请用 node --env-file=.env.local 运行，或确认 .env.local 存在");
    process.exit(1);
  }
  const m = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.*)$/m);
  if (!m || !m[1].trim()) {
    console.error(".env.local 里没有 DATABASE_URL");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const sql = neon(readDatabaseUrl());

// ── 生产基线（2026-10-25 晚）──────────────────────────────────
// 验收会在这些基础上新增数据；这些 id 本身是稳定的，用它们做断言锚点。
const BASELINE_CARD_TYPE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
const CARD = {
  danceYear: 1, // 东方舞年卡（停用）
  yogaYear: 2, // 瑜伽课年卡
  allInCount: 3, // 一卡通次卡（停用）
  yogaCount: 4, // 瑜伽次卡（验收可能改名「瑜伽10次卡」）
  equipment: 11, // 大器械卡
  private: 12, // 私教卡
  yearAll: 8, // 年卡一卡通
};
const BASELINE_MEMBER_CARD_IDS = [22, 23, 24, 25, 26];
const BASELINE_SESSION_IDS = [50, 51, 52, 53, 54];
const EXPECTED_COUNTS = {
  members: 274,
  card_types: 11,
  card_type_courses: 15,
  course_categories: 5,
  member_cards: 5,
  class_sessions: 5,
  bookings: 0,
};

const fails = [];
const ok = (cond, msg) => {
  if (cond) console.log("  [PASS]", msg);
  else {
    fails.push(msg);
    console.log("  [FAIL]", msg);
  }
};
const info = (msg) => console.log("  [INFO]", msg);

async function main() {
  // ── 1. 会员总数 ──────────────────────────────────────────────
  console.log("=== 1. 会员总数 ===");
  const [m] = await sql`SELECT count(*)::int n FROM members WHERE tenant_id = 1`;
  console.log("  会员数:", m.n);
  if (m.n === EXPECTED_COUNTS.members) {
    ok(true, `会员数等于基线 ${EXPECTED_COUNTS.members}`);
  } else {
    ok(m.n >= 270, "会员数在合理范围（>= 270）");
    info(`会员数 ${m.n} 与基线 ${EXPECTED_COUNTS.members} 不同（验收期新增/清理属正常，回滚后应回到 ${EXPECTED_COUNTS.members}）`);
  }

  // ── 2. 课种表（按 key 匹配）──────────────────────────────────
  console.log("\n=== 2. 课种表（course_categories，按 key 匹配）===");
  const categories = await sql`
    SELECT id, key, name, is_active
    FROM course_categories
    WHERE tenant_id = 1
    ORDER BY sort_order, id`;
  for (const c of categories) console.log(`  #${c.id} ${c.key} ${c.name} (${c.is_active ? "启用" : "停用"})`);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catByKey = new Map(categories.map((c) => [c.key, c]));
  for (const key of ["pilates", "equipment", "fat_burn", "private", "yoga"]) {
    ok(catByKey.has(key), `课种 key=${key} 存在`);
  }
  if (categories.length > 5) {
    const extra = categories.filter((c) => !["pilates", "equipment", "fat_burn", "private", "yoga"].includes(c.key));
    info(`验收期新增课种：${extra.map((c) => `${c.key}(#${c.id})`).join("、")}`);
  }

  // ── 3. 卡种与课程权限（按 id 断言）───────────────────────────
  console.log("\n=== 3. 卡种与课程权限（按 id / 课种 key 断言）===");
  const types = await sql`
    SELECT ct.id, ct.name, ct.category, ct.is_active,
           COALESCE(array_agg(cc.key ORDER BY cc.id) FILTER (WHERE cc.id IS NOT NULL), ARRAY[]::text[]) AS course_keys,
           COALESCE(array_agg(cc.name ORDER BY cc.id) FILTER (WHERE cc.id IS NOT NULL), ARRAY[]::text[]) AS courses
    FROM card_types ct
    LEFT JOIN card_type_courses ctc ON ctc.card_type_id = ct.id
    LEFT JOIN course_categories cc ON cc.id = ctc.course_category_id
    WHERE ct.tenant_id = 1
    GROUP BY ct.id, ct.name, ct.category, ct.is_active
    ORDER BY ct.id`;
  for (const t of types) {
    const baseline = BASELINE_CARD_TYPE_IDS.includes(t.id) ? "基线" : "新增";
    console.log(
      `  #${t.id} ${t.name} (${t.category}, ${t.is_active ? "启用" : "停用"}, ${baseline}) -> ${t.courses.join(" / ") || "未配置"}`
    );
  }
  const byId = new Map(types.map((t) => [t.id, t]));

  // 大器械卡只绑大器械
  const equip = byId.get(CARD.equipment);
  ok(
    !!equip && equip.course_keys.length === 1 && equip.course_keys[0] === "equipment",
    `大器械卡(#${CARD.equipment})只绑定高定大器械（equipment）`
  );

  // 瑜伽卡只绑瑜伽：按 id=4 断言；名称只看前缀（验收会改成「瑜伽10次卡」）
  const yoga = byId.get(CARD.yogaCount);
  ok(
    !!yoga && yoga.course_keys.length === 1 && yoga.course_keys[0] === "yoga",
    `瑜伽卡(#${CARD.yogaCount})只绑定瑜伽课种（不依赖 name，验收改名不影响）`
  );
  if (yoga) {
    ok(yoga.name.startsWith("瑜伽"), `瑜伽卡(#${CARD.yogaCount})名称仍以「瑜伽」开头（当前：${yoga.name}）`);
    info(`瑜伽卡(#${CARD.yogaCount})当前名称：${yoga.name}（验收可能改为「瑜伽10次卡」）`);
  }

  // 只有私教卡包含私教课种（只看基线卡种）
  const privateKey = "private";
  const baselineTypes = types.filter((t) => BASELINE_CARD_TYPE_IDS.includes(t.id));
  const withPrivate = baselineTypes.filter((t) => t.course_keys.includes(privateKey)).map((t) => t.id);
  ok(
    withPrivate.length === 1 && withPrivate[0] === CARD.private,
    `只有私教卡(#${CARD.private})包含私教课种（基线卡种里包含 private 的：${withPrivate.join(",") || "无"}）`
  );

  // 年卡一卡通：覆盖 4 类且不含私教
  const year = byId.get(CARD.yearAll);
  ok(
    !!year && year.course_keys.length === 4 && !year.course_keys.includes(privateKey),
    `年卡一卡通(#${CARD.yearAll})覆盖 4 类且不含私教（当前：${year ? year.course_keys.join(" / ") : "缺失"}）`
  );

  // 停用状态
  ok(byId.get(CARD.danceYear)?.is_active === 0, `东方舞年卡(#${CARD.danceYear})已停用`);
  ok(byId.get(CARD.allInCount)?.is_active === 0, `一卡通次卡(#${CARD.allInCount})已停用`);

  // 新增只读检查：每个启用卡种至少 1 个课种（基线卡种判 FAIL；验收新增卡种只 INFO）
  const baselineActiveNoCourse = baselineTypes.filter((t) => t.is_active === 1 && t.course_keys.length === 0);
  ok(
    baselineActiveNoCourse.length === 0,
    `基线里每个启用卡种都至少配置 1 个课种` +
      (baselineActiveNoCourse.length
        ? `（未配置：${baselineActiveNoCourse.map((t) => `#${t.id} ${t.name}`).join("、")}）`
        : "")
  );
  const newActiveNoCourse = types.filter(
    (t) => !BASELINE_CARD_TYPE_IDS.includes(t.id) && t.is_active === 1 && t.course_keys.length === 0
  );
  for (const t of newActiveNoCourse) {
    info(`验收期新增卡种 #${t.id} ${t.name} 未配置课种（空权限=接口暂时放行，不判 FAIL）`);
  }

  // 校验 card_types 里引用的课种 id 都存在（卡种侧孤儿）
  const typeCourseKeysValid = types.every((t) => t.course_keys.every((k) => catByKey.has(k)));
  ok(typeCourseKeysValid, "卡种绑定的课种 key 都能在 course_categories 里找到");

  // ── 4. 课次与课种 ────────────────────────────────────────────
  console.log("\n=== 4. 课次与课种 ===");
  const sessions = await sql`
    SELECT cs.id, cs.title, cs.course_category_id, cc.key AS cat_key, cc.name AS cat,
           cs.session_date::text d, cs.start_time, cs.status
    FROM class_sessions cs LEFT JOIN course_categories cc ON cc.id = cs.course_category_id
    WHERE cs.tenant_id = 1 AND cs.session_date::date >= CURRENT_DATE
    ORDER BY cs.session_date, cs.start_time`;
  for (const s of sessions.slice(0, 12)) {
    console.log(`  #${s.id} ${s.d} ${s.start_time} ${s.title} (${s.cat_key || s.cat}) [${s.status}]`);
  }
  if (sessions.length > 12) console.log(`  …（共 ${sessions.length} 节未来课次）`);
  ok(sessions.length > 0, "存在可预约的未来课次");
  const sessionIds = new Set(sessions.map((s) => s.id));
  const missingSessions = BASELINE_SESSION_IDS.filter((id) => !sessionIds.has(id));
  ok(missingSessions.length === 0, `基线课次（id ${BASELINE_SESSION_IDS.join(",")}）都还在` + (missingSessions.length ? `（缺 ${missingSessions.join(",")}）` : ""));
  info(`未来课次覆盖课种：${[...new Set(sessions.map((s) => s.cat_key || s.cat))].join("、") || "无"}`);

  // ── 5. 预约权限判定（按课种 key 模拟）────────────────────────
  console.log("\n=== 5. 预约权限判定（模拟 SQL 条件，按课种 key）===");
  const target = sessions.find((s) => s.course_category_id === catByKey.get("equipment")?.id) || sessions[0];
  if (target) {
    const targetKey = catById.get(target.course_category_id)?.key || target.cat_key;
    console.log(`  目标课次: #${target.id} ${target.title}（课种 ${targetKey}）`);
    const canBook = (cardType) => !!cardType && cardType.course_keys.includes(targetKey);
    ok(!canBook(yoga), "瑜伽卡不能约该课程");
    ok(targetKey !== privateKey ? canBook(year) : !canBook(year), "年卡一卡通可约该课程（私教除外）");
    ok(targetKey === privateKey ? canBook(byId.get(CARD.private)) : !canBook(byId.get(CARD.private)), "私教卡只覆盖私教课种");
  } else {
    info("没有未来课次，跳过预约权限判定");
  }

  // ── 6. 扣卡优先级（专卡优先，通卡最后）──────────────────────
  console.log("\n=== 6. 扣卡优先级（专卡优先，未配置排最后）===");
  const equipmentId = catByKey.get("equipment")?.id;
  const candidates = types
    .filter((t) => t.is_active === 1 && t.course_keys.includes("equipment"))
    .sort((a, b) => {
      if (a.course_keys.length !== b.course_keys.length) return a.course_keys.length - b.course_keys.length;
      const ca = a.category === "period" ? 0 : 1;
      const cb = b.category === "period" ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return a.id - b.id;
    });
  candidates.forEach((c, i) => {
    const tag = BASELINE_CARD_TYPE_IDS.includes(c.id) ? "" : "（验收新增，不参与断言）";
    console.log(`  第 ${i + 1} 顺位: #${c.id} ${c.name}（覆盖 ${c.course_keys.length} 类，${c.category}）${tag}`);
  });
  const baselineCandidates = candidates.filter((c) => BASELINE_CARD_TYPE_IDS.includes(c.id));
  ok(
    baselineCandidates[0]?.id === CARD.equipment,
    `大器械课的扣卡首顺位是大器械专卡(#${CARD.equipment})（基线候选：${baselineCandidates.map((c) => `#${c.id}`).join(",")}）`
  );

  // ── 7. 现有会员卡 ────────────────────────────────────────────
  console.log("\n=== 7. 现有会员卡 ===");
  const cards = await sql`
    SELECT mc.id, mc.member_id, mc.card_type_id, mc.status,
           m.name AS member, ct.name AS card
    FROM member_cards mc
    LEFT JOIN members m ON m.id = mc.member_id
    LEFT JOIN card_types ct ON ct.id = mc.card_type_id
    WHERE mc.tenant_id = 1
    ORDER BY mc.id`;
  for (const c of cards) console.log(`  #${c.id} ${c.member ?? "?"} ${c.card ?? "?"} card_type_id=${c.card_type_id} (${c.status})`);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const missingBaselineCards = BASELINE_MEMBER_CARD_IDS.filter((id) => !cardById.has(id));
  ok(
    missingBaselineCards.length === 0,
    `基线 5 张会员卡（id ${BASELINE_MEMBER_CARD_IDS.join(",")}）都还在` +
      (missingBaselineCards.length ? `（缺 ${missingBaselineCards.join(",")}）` : "")
  );
  const baselineCards = BASELINE_MEMBER_CARD_IDS.map((id) => cardById.get(id)).filter(Boolean);
  const baselineAllYoga = baselineCards.length === BASELINE_MEMBER_CARD_IDS.length && baselineCards.every((c) => c.card_type_id === CARD.yogaCount);
  ok(baselineAllYoga, `基线 5 张卡仍挂在瑜伽卡(#${CARD.yogaCount}) 上`);
  const extraCards = cards.filter((c) => !BASELINE_MEMBER_CARD_IDS.includes(c.id));
  info(`会员卡总数 ${cards.length}（基线 5）` + (extraCards.length ? `，新增：id ${extraCards.map((c) => c.id).join(",")}（回滚后应删除）` : ""));
  if (cards.length === EXPECTED_COUNTS.member_cards) {
    ok(true, `会员卡数等于基线 ${EXPECTED_COUNTS.member_cards}`);
  }

  // ── 8. 新增只读检查（验收写数据后容易坏的地方）──────────────
  console.log("\n=== 8. 新增只读检查 ===");
  // 8.1 course_categories.key 唯一
  const dupKeys = await sql`
    SELECT key, count(*)::int AS n
    FROM course_categories WHERE tenant_id = 1
    GROUP BY key HAVING count(*) > 1`;
  ok(dupKeys.length === 0, "course_categories.key 唯一" + (dupKeys.length ? `（重复：${dupKeys.map((d) => d.key).join(",")}）` : ""));

  // 8.2 key 格式（接口要求小写字母/数字/下划线）
  const badKeys = categories.filter((c) => !/^[a-z0-9_]+$/.test(c.key || ""));
  ok(badKeys.length === 0, "course_categories.key 格式合法（小写字母/数字/下划线）" + (badKeys.length ? `（异常：${badKeys.map((c) => c.key).join(",")}）` : ""));

  // 8.3 card_type_courses 没有指向不存在卡种的孤儿行
  const orphanByCardType = await sql`
    SELECT ctc.id, ctc.card_type_id, ctc.course_category_id
    FROM card_type_courses ctc
    LEFT JOIN card_types ct ON ct.id = ctc.card_type_id
    WHERE ct.id IS NULL`;
  ok(
    orphanByCardType.length === 0,
    "card_type_courses 没有指向不存在卡种的孤儿行" +
      (orphanByCardType.length ? `（${orphanByCardType.map((r) => `#${r.id}→卡种${r.card_type_id}`).join("、")}）` : "")
  );

  // 8.4 card_type_courses 没有指向不存在课种的孤儿行
  const orphanByCategory = await sql`
    SELECT ctc.id, ctc.card_type_id, ctc.course_category_id
    FROM card_type_courses ctc
    LEFT JOIN course_categories cc ON cc.id = ctc.course_category_id
    WHERE cc.id IS NULL`;
  ok(
    orphanByCategory.length === 0,
    "card_type_courses 没有指向不存在课种的孤儿行" +
      (orphanByCategory.length ? `（${orphanByCategory.map((r) => `#${r.id}→课种${r.course_category_id}`).join("、")}）` : "")
  );

  // 8.5 会员卡引用的卡种存在（开卡/删除卡种后容易坏）
  const orphanMemberCards = cards.filter((c) => !byId.has(c.card_type_id));
  ok(
    orphanMemberCards.length === 0,
    "member_cards 都指向存在的卡种" +
      (orphanMemberCards.length ? `（异常：${orphanMemberCards.map((c) => `#${c.id}→卡种${c.card_type_id}`).join("、")}）` : "")
  );

  // 8.6 课次引用的课种存在
  const sessionOrphans = await sql`
    SELECT cs.id, cs.course_category_id
    FROM class_sessions cs
    LEFT JOIN course_categories cc ON cc.id = cs.course_category_id
    WHERE cs.tenant_id = 1 AND cc.id IS NULL`;
  ok(
    sessionOrphans.length === 0,
    "class_sessions 都指向存在的课种" +
      (sessionOrphans.length ? `（异常：${sessionOrphans.map((r) => `#${r.id}→课种${r.course_category_id}`).join("、")}）` : "")
  );

  // ── 9. 数据量汇总（回滚时对照）───────────────────────────────
  console.log("\n=== 9. 数据量汇总（回滚时对照）===");
  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM members WHERE tenant_id = 1) AS members,
      (SELECT count(*)::int FROM card_types WHERE tenant_id = 1) AS card_types,
      (SELECT count(*)::int FROM card_type_courses) AS card_type_courses,
      (SELECT count(*)::int FROM course_categories WHERE tenant_id = 1) AS course_categories,
      (SELECT count(*)::int FROM member_cards WHERE tenant_id = 1) AS member_cards,
      (SELECT count(*)::int FROM class_sessions WHERE tenant_id = 1) AS class_sessions,
      (SELECT count(*)::int FROM bookings WHERE tenant_id = 1) AS bookings`;
  const rows = [
    ["members", counts.members],
    ["card_types", counts.card_types],
    ["card_type_courses", counts.card_type_courses],
    ["course_categories", counts.course_categories],
    ["member_cards", counts.member_cards],
    ["class_sessions", counts.class_sessions],
    ["bookings", counts.bookings],
  ];
  for (const [name, actual] of rows) {
    const expected = EXPECTED_COUNTS[name];
    const flag = actual === expected ? "= 基线" : `≠ 基线 ${expected}（验收期正常，回滚后应一致）`;
    console.log(`  ${name.padEnd(20)} ${String(actual).padStart(4)}  ${flag}`);
  }
  if (counts.member_cards !== EXPECTED_COUNTS.member_cards) {
    info(`会员卡 ${counts.member_cards} 张：验收开卡后属正常，回滚断言要求回到 ${EXPECTED_COUNTS.member_cards}`);
  }
  if (counts.bookings !== EXPECTED_COUNTS.bookings) {
    info(`预约 ${counts.bookings} 条：验收预约后属正常，回滚断言要求回到 ${EXPECTED_COUNTS.bookings}`);
  }

  // ── 汇总 ────────────────────────────────────────────────────
  console.log("\n==========================================");
  if (fails.length) {
    console.log("存在失败项:");
    fails.forEach((f) => console.log(" -", f));
    process.exitCode = 1;
  } else {
    console.log("全部检查通过");
  }
  console.log("==========================================");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
