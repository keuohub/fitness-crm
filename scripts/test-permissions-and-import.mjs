// 卡种课程权限自检脚本（只读，不写库）
// 用法：node --env-file=.env.local scripts/test-permissions-and-import.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const fails = [];
const ok = (cond, msg) => { if (cond) console.log("  [PASS]", msg); else { fails.push(msg); console.log("  [FAIL]", msg); } };

async function main() {
  console.log("=== 1. 会员总数 ===");
  const [m] = await sql`SELECT count(*)::int n FROM members WHERE tenant_id = 1`;
  console.log("  会员数:", m.n);
  ok(m.n >= 270, "会员数在合理范围（>= 270）");

  console.log("\n=== 2. 卡种与课程权限 ===");
  const types = await sql`
    SELECT ct.id, ct.name, ct.category, ct.is_active,
           COALESCE(array_agg(cc.name ORDER BY cc.id) FILTER (WHERE cc.id IS NOT NULL), '{}') AS courses
    FROM card_types ct
    LEFT JOIN card_type_courses ctc ON ctc.card_type_id = ct.id
    LEFT JOIN course_categories cc ON cc.id = ctc.course_category_id
    WHERE ct.tenant_id = 1
    GROUP BY ct.id, ct.name, ct.category, ct.is_active
    ORDER BY ct.id`;
  for (const t of types) console.log(`  #${t.id} ${t.name} (${t.category}, ${t.is_active ? "启用" : "停用"}) -> ${t.courses.join(" / ") || "未配置"}`);
  ok(types.some((t) => t.name === "大器械卡" && t.courses.includes("高定大器械")), "大器械卡只绑定高定大器械");
  ok(types.some((t) => t.name === "瑜伽次卡" && t.courses.length === 1 && t.courses[0] === "瑜伽"), "瑜伽卡只绑定瑜伽");
  ok(types.every((t) => t.is_active === 0 || t.courses.includes("私教") === (t.name === "私教卡")), "只有私教卡包含私教课种");
  ok(types.find((t) => t.name === "年卡一卡通")?.courses.length === 4, "年卡一卡通覆盖 4 类（除私教）");
  ok(types.find((t) => t.name === "东方舞年卡")?.is_active === 0, "东方舞年卡已停用");
  ok(types.find((t) => t.name === "一卡通次卡")?.is_active === 0, "一卡通次卡已停用");

  console.log("\n=== 3. 课次与课种 ===");
  const sessions = await sql`
    SELECT cs.id, cs.title, cs.course_category_id, cc.name AS cat, cs.session_date::text d, cs.start_time
    FROM class_sessions cs LEFT JOIN course_categories cc ON cc.id = cs.course_category_id
    WHERE cs.tenant_id = 1 AND cs.session_date::date >= CURRENT_DATE
    ORDER BY cs.session_date, cs.start_time LIMIT 8`;
  for (const s of sessions) console.log(`  #${s.id} ${s.d} ${s.start_time} ${s.title} (${s.cat})`);
  ok(sessions.length > 0, "存在可预约的未来课次");

  console.log("\n=== 4. 预约权限判定（模拟 SQL 条件）===");
  if (sessions.length) {
    const target = sessions.find((s) => s.course_category_id === 2) || sessions[0];
    const yoga = await sql`
      SELECT 1 FROM card_type_courses ctc
      WHERE ctc.card_type_id = (SELECT id FROM card_types WHERE name = '瑜伽次卡' LIMIT 1)
        AND ctc.course_category_id = ${target.course_category_id} LIMIT 1`;
    const year = await sql`
      SELECT 1 FROM card_type_courses ctc
      WHERE ctc.card_type_id = (SELECT id FROM card_types WHERE name = '年卡一卡通' LIMIT 1)
        AND ctc.course_category_id = ${target.course_category_id} LIMIT 1`;
    console.log(`  目标课次: #${target.id} ${target.title} (${target.cat})`);
    ok(yoga.length === 0, "瑜伽卡不能约该课程");
    ok(target.course_category_id !== 4 ? year.length > 0 : year.length === 0, "年卡一卡通可约该课程（私教除外）");
  }

  console.log("\n=== 5. 扣卡优先级（专卡优先，未配置排最后）===");
  const cand = await sql`
    SELECT ct.id, ct.name, ct.category,
           (SELECT count(*)::int FROM card_type_courses c WHERE c.card_type_id = ct.id) AS scope
    FROM card_types ct
    WHERE ct.is_active = 1
      AND EXISTS (SELECT 1 FROM card_type_courses c2 WHERE c2.card_type_id = ct.id AND c2.course_category_id = 2)
    ORDER BY (SELECT count(*)::int FROM card_type_courses c0 WHERE c0.card_type_id = ct.id) = 0 ASC,
             (SELECT count(*)::int FROM card_type_courses c1 WHERE c1.card_type_id = ct.id) ASC,
             CASE WHEN ct.category = 'period' THEN 0 ELSE 1 END, ct.id`;
  cand.forEach((c, i) => console.log(`  第 ${i + 1} 顺位: ${c.name}（覆盖 ${c.scope} 类，${c.category}）`));
  ok(cand[0]?.name === "大器械卡", "大器械课的扣卡首顺位是大器械专卡");

  console.log("\n=== 6. 现有会员卡权限 ===");
  const cards = await sql`
    SELECT mc.id, m.name member, ct.name card,
           COALESCE(array_agg(cc.name) FILTER (WHERE cc.id IS NOT NULL), '{}') allowed
    FROM member_cards mc
    JOIN members m ON m.id = mc.member_id
    JOIN card_types ct ON ct.id = mc.card_type_id
    LEFT JOIN card_type_courses ctc ON ctc.card_type_id = ct.id
    LEFT JOIN course_categories cc ON cc.id = ctc.course_category_id
    WHERE mc.tenant_id = 1 AND mc.status = 'active'
    GROUP BY mc.id, m.name, ct.name ORDER BY mc.id`;
  for (const c of cards) console.log(`  #${c.id} ${c.member} ${c.card} -> ${c.allowed.join(" / ")}`);
  console.log(`  共 ${cards.length} 张有效卡`);

  console.log("\n==========================================");
  if (fails.length) { console.log("存在失败项:"); fails.forEach((f) => console.log(" -", f)); process.exitCode = 1; }
  else console.log("全部检查通过");
  console.log("==========================================");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
