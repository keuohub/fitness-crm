// scripts/d5-acceptance.mjs
//
// D5 线上验收：核对本轮（brand 控制中心 / 课程底图 / 课时累加 / 缓存头）是否真的生效。
//
// 默认**只读**，不会写任何数据。
// 用法：
//   D5_PORTAL_CODE=A1132370 D5_MEMBER_PIN=190494 node scripts/d5-acceptance.mjs
//   D5_PORTAL_CODE=... D5_MEMBER_PIN=... node scripts/d5-acceptance.mjs --base http://localhost:3001
//   # 带写库的约课 +1 验证（会真的占座，跑完自动取消）：
//   D5_PORTAL_CODE=... D5_MEMBER_PIN=... node scripts/d5-acceptance.mjs --write
//
// 凭据只从环境变量读，不写进仓库。

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (argOf("--base", process.env.D5_BASE_URL || "https://crm-330905-9-1509862887.sh.run.tcloudbase.com")).replace(/\/$/, "");
const DO_WRITE = args.includes("--write");
const PORTAL_CODE = process.env.D5_PORTAL_CODE || "";
const MEMBER_PIN = process.env.D5_MEMBER_PIN || "";

const results = [];
let failed = 0;

function record(scope, name, ok, detail) {
  results.push({ scope, name, ok, detail: detail ?? "" });
  if (ok === false) failed++;
}

async function req(path, init) {
  const res = await fetch(BASE + path, { ...init, redirect: "manual" });
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, headers: res.headers, body };
}

const JW = () => ({ "Content-Type": "application/json" });

async function main() {
  console.log(`D5 验收目标：${BASE}`);
  console.log(`模式：${DO_WRITE ? "只读 + 约课写验证" : "只读"}（不写库除非 --write）\n`);

  // ── 1. 健康检查 ──
  {
    const r = await req("/api/health");
    const ok = r.status === 200 && r.body?.ok === true && r.body?.db === "up";
    record("基础", "GET /api/health", ok, `http=${r.status} db=${r.body?.db ?? "?"}`);
  }

  // ── 2. 了解徕舞文案接口 ──
  {
    const r = await req("/api/portal/brand-settings");
    const keys = ["heroTitle", "heroSubtitle", "sec1Title", "sec2Title", "sec3Title"];
    const hasAll = r.status === 200 && keys.every((k) => typeof r.body?.[k] === "string" && r.body[k].length > 0);
    const noStore = /no-store/i.test(r.headers.get("cache-control") || "");
    record("了解徕舞", "GET /api/portal/brand-settings", hasAll, `http=${r.status} heroTitle=${r.body?.heroTitle ?? "?"}`);
    record("了解徕舞", "brand-settings Cache-Control: no-store", noStore, `cache-control=${r.headers.get("cache-control") ?? "(缺失)"}`);
    const leaked = Object.keys(r.body || {}).filter((k) => /secret|cos_|token|password/i.test(k));
    record("安全", "brand-settings 不泄露密钥字段", leaked.length === 0, leaked.length ? `泄露=${leaked}` : "无敏感字段");
  }

  // ── 3. 课程类目 + 实拍底图 ──
  {
    const r = await req("/api/portal/offerings");
    const rows = Array.isArray(r.body) ? r.body : [];
    record("了解徕舞", "GET /api/portal/offerings", r.status === 200 && rows.length > 0, `http=${r.status} 条数=${rows.length}`);
    const missing = rows.filter((x) => !x.imageUrl && !x.image_url);
    record("了解徕舞", "每个类目都带底图 imageUrl", missing.length === 0, missing.length ? `缺图=${missing.map((m) => m.name).join("/")}` : `${rows.length}/${rows.length} 有图`);
    const noStore = /no-store/i.test(r.headers.get("cache-control") || "");
    record("了解徕舞", "offerings Cache-Control: no-store", noStore, `cache-control=${r.headers.get("cache-control") ?? "(缺失)"}`);
    const nums = rows.map((x) => String(x.num ?? ""));
    const sorted = [...nums].sort();
    record("了解徕舞", "类目编号与展示顺序一致", JSON.stringify(nums) === JSON.stringify(sorted), `顺序=${nums.join(",")}`);
  }

  // ── 4. 会员档案 / 课时 ──
  let token = null;
  if (!PORTAL_CODE || !MEMBER_PIN) {
    record("会员端", "登录（跳过）", null, "未提供 D5_PORTAL_CODE / D5_MEMBER_PIN");
  } else {
    const login = await req("/api/portal/login", {
      method: "POST",
      headers: JW(),
      body: JSON.stringify({ portalCode: PORTAL_CODE, phoneSuffix: MEMBER_PIN }),
    });
    token = login.body?.token || null;
    record("会员端", "POST /api/portal/login", login.status === 200 && !!token, `http=${login.status} memberId=${login.body?.memberId ?? "?"}`);

    if (token) {
      const auth = { Authorization: `Bearer ${token}` };
      const me = await req("/api/portal/me", { headers: auth });
      const d = me.body || {};
      record("会员端", "GET /api/portal/me", me.status === 200, `http=${me.status}`);
      const sum = Array.isArray(d.courseCounts) ? d.courseCounts.reduce((s, c) => s + Number(c.count || 0), 0) : NaN;
      record("课时", "totalHours === Σ courseCounts", sum === Number(d.totalHours), `total=${d.totalHours} Σ=${sum}`);
      record("会员端", "下发 gender（尊称渲染用）", "gender" in d, `gender=${JSON.stringify(d.gender)}`);
      record("会员端", "下发 joinDays 且 ≥1", Number(d.joinDays) >= 1, `joinDays=${d.joinDays} joinedAt=${d.joinedAt}`);
      const noStoreMe = /no-store/i.test(me.headers.get("cache-control") || "");
      record("会员端", "me Cache-Control: no-store", noStoreMe, `cache-control=${me.headers.get("cache-control") ?? "(缺失)"}`);

      const cards = await req("/api/portal/cards", { headers: auth });
      const card = cards.body?.cards?.[0];
      record("会员卡", "GET /api/portal/cards", cards.status === 200 && !!card, `http=${cards.status} 余=${card?.remainingCount ?? "?"}`);

      // ── 5. 约课写验证：+1，随即取消回落（需要 --write）──
      if (DO_WRITE) {
        const sched = await req("/api/portal/schedule", { headers: auth });
        const sessions = sched.body?.sessions || [];
        const target = sessions.find((s) => !s.bookedByMe && Number(s.remaining) > 0);
        if (!target) {
          record("约课", "找到可约课次（跳过写验证）", null, "未来 7 天没有余位");
        } else {
          const before = Number((await req("/api/portal/me", { headers: auth })).body?.totalHours ?? 0);
          const bk = await req("/api/portal/bookings", {
            method: "POST",
            headers: { ...JW(), ...auth },
            body: JSON.stringify({ sessionId: target.id, idempotencyKey: `d5-acceptance-${Date.now()}` }),
          });
          const bookingId = bk.body?.booking?.id;
          const afterBook = Number((await req("/api/portal/me", { headers: auth })).body?.totalHours ?? 0);
          record("约课", "预约后总课时 +1", afterBook === before + 1, `${before} → ${afterBook}`);
          if (bookingId) {
            const cancel = await req("/api/portal/bookings/cancel", {
              method: "POST",
              headers: { ...JW(), ...auth },
              body: JSON.stringify({ bookingId, reason: "D5 验收自动取消" }),
            });
            const afterCancel = Number((await req("/api/portal/me", { headers: auth })).body?.totalHours ?? 0);
            record("约课", "取消后总课时回落（cancelled 不计入）", afterCancel === before, `${afterBook} → ${afterCancel}，取消 http=${cancel.status}`);
          } else {
            record("约课", "预约请求成功", false, `http=${bk.status} body=${JSON.stringify(bk.body).slice(0, 160)}`);
          }
        }
      }
    }
  }

  // ── 输出 ──
  let scope = "";
  for (const r of results) {
    if (r.scope !== scope) {
      scope = r.scope;
      console.log(`\n[${scope}]`);
    }
    const mark = r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "SKIP";
    console.log(`  ${mark}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  const total = results.filter((r) => r.ok !== null).length;
  console.log(`\n合计 ${total} 项，失败 ${failed} 项。`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("验收脚本异常：", err?.message || err);
  process.exit(2);
});
