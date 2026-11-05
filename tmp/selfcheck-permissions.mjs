// tmp/selfcheck-permissions.mjs
// Lead 的写库自测（会写生产库，跑完必须用 rollback-card-config.mjs 回滚）。
// 覆盖：卡种新建/编辑/停用启用/删除、课种新增/停用/删除守卫、权限勾选实时变化、
//       排课、预约拦截与放行、会员端「可约」文案、卡种权限复制（等价 PUT）。
// 用法：node --env-file=.env.local tmp/selfcheck-permissions.mjs

const BASE = "http://localhost:3001";
const fails = [];
const oks = [];
function ok(cond, label, extra = "") {
  if (cond) {
    oks.push(label);
    console.log(`  [PASS] ${label}${extra ? "  —— " + extra : ""}`);
  } else {
    fails.push(label);
    console.log(`  [FAIL] ${label}${extra ? "  —— " + extra : ""}`);
  }
}

async function main() {
  const fs = await import("node:fs");
  const crypto = await import("node:crypto");
  const env = fs.readFileSync(".env.local", "utf8");
  const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim();
  const adminPw = get("ADMIN_PASSWORD");
  const memberSecret = get("MEMBER_TOKEN_SECRET") || get("COOKIE_SIGN_KEY");

  const login = await fetch(BASE + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin", password: adminPw }),
  });
  const cookie = (login.headers.getSetCookie ? login.headers.getSetCookie() : [login.headers.get("set-cookie")])
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  ok(login.status === 200 && !!cookie, "管理员登录");

  const admin = async (path, init = {}) => {
    const r = await fetch(BASE + path, {
      ...init,
      headers: { Cookie: cookie, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };

  const mintMemberToken = (memberId) => {
    const exp = Date.now() + 7 * 86400_000;
    const payload = `${memberId}.${exp}`;
    const sig = crypto.createHmac("sha256", memberSecret).update(payload).digest("hex");
    return Buffer.from(`${payload}.${sig}`).toString("base64url");
  };
  const memberToken = mintMemberToken(10); // 王莉，持瑜伽次卡（id 23 等），portal_enabled=1
  const member = async (path, init = {}) => {
    const r = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${memberToken}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };

  const putCardType = (body) => admin("/api/admin/card-types", { method: "PUT", body: JSON.stringify(body) });
  const getCardTypes = async () => (await admin("/api/admin/card-types")).data;
  const findType = (list, id) => list.find((t) => Number(t.id) === Number(id));

  // ── 1. 新建体验次卡（10 次，瑜伽 + 普拉提） ────────────────────────
  console.log("\n=== 1. 新建卡种「体验次卡」（次数卡 10 次，勾瑜伽 + 普拉提）===");
  const create = await admin("/api/admin/card-types", {
    method: "POST",
    body: JSON.stringify({
      name: "体验次卡",
      category: "count",
      priceCents: 20000,
      totalCount: 10,
      courseCategoryIds: [5, 1],
    }),
  });
  ok(create.status === 201 && create.data.id, "POST 新建卡种返回 201", `id=${create.data.id}`);
  const newTypeId = Number(create.data.id);
  let types = await getCardTypes();
  const created = findType(types, newTypeId);
  ok(!!created && created.name === "体验次卡" && created.category === "count" && created.totalCount === 10, "列表出现体验次卡，类别次数卡 10 次");
  ok(
    JSON.stringify(created?.courseCategoryIds) === JSON.stringify([1, 5]),
    "课种权限落库为 精品普拉提+瑜伽",
    JSON.stringify(created?.courseCategoryIds)
  );

  // ── 2. 编辑卡种：改价、改次数、改每周限次（复用新建字段） ─────────────
  console.log("\n=== 2. 编辑体验次卡：售价 198、总次数 12、每周限 2 次 ===");
  const edit = await putCardType({ id: newTypeId, name: "体验次卡", priceCents: 19800, totalCount: 12, weeklyLimit: 2, courseCategoryIds: [1, 5] });
  ok(edit.status === 200, "PUT 编辑返回 200");
  types = await getCardTypes();
  const edited = findType(types, newTypeId);
  ok(edited?.priceCents === 19800 && edited?.totalCount === 12 && edited?.weeklyLimit === 2, "列表实时反映改价/次数/限次", `¥${edited?.priceCents / 100} ${edited?.totalCount}次 限${edited?.weeklyLimit}`);

  // ── 3. 瑜伽次卡（id 4）改名 + 关掉再打开课种权限 ───────────────────
  console.log("\n=== 3. 瑜伽次卡（id 4）改名、关掉再打开课种权限 ===");
  const rename = await putCardType({ id: 4, name: "瑜伽10次卡" });
  ok(rename.status === 200, "PUT 改名返回 200");
  await putCardType({ id: 4, courseCategoryIds: [5, 1] }); // 先加普拉提，避免清空权限（空权限=放行所有课种的过渡策略）
  types = await getCardTypes();
  ok(findType(types, 4)?.name === "瑜伽10次卡" && JSON.stringify(findType(types, 4)?.courseCategoryIds) === JSON.stringify([1, 5]), "改名与加权限实时生效");
  await putCardType({ id: 4, courseCategoryIds: [1] }); // 关掉瑜伽
  types = await getCardTypes();
  ok(JSON.stringify(findType(types, 4)?.courseCategoryIds) === JSON.stringify([1]), "关掉瑜伽权限后列表实时变化", JSON.stringify(findType(types, 4)?.courseCategoryIds));
  await putCardType({ id: 4, courseCategoryIds: [5, 1] }); // 打开瑜伽
  types = await getCardTypes();
  ok(JSON.stringify(findType(types, 4)?.courseCategoryIds) === JSON.stringify([1, 5]), "再打开瑜伽权限后列表实时变化", JSON.stringify(findType(types, 4)?.courseCategoryIds));

  // ── 4. 停用卡种：开卡下拉消失（接口拒发）── 再启用 ────────────────
  console.log("\n=== 4. 停用「普拉提次卡」(id 7)：新开卡被拒；已有卡不受影响；再启用 ===");
  const off = await putCardType({ id: 7, isActive: 0 });
  types = await getCardTypes();
  ok(off.status === 200 && findType(types, 7)?.isActive === 0, "停用后列表状态为已停用");
  const issueDisabled = await admin("/api/admin/member-cards", {
    method: "POST",
    body: JSON.stringify({ memberId: 10, cardTypeId: 7, totalCount: 10, remainingCount: 10, idempotencyKey: `selfcheck-disabled-${Date.now()}` }),
  });
  ok(issueDisabled.status === 404 && String(issueDisabled.data.error || "").includes("已停用"), "停用卡种无法新开卡", `HTTP ${issueDisabled.status} ${issueDisabled.data.error || ""}`);
  const existingCards = (await admin("/api/admin/member-cards")).data;
  ok(existingCards.filter((c) => Number(c.card_type_id) === 4).length === 5, "已有 5 张瑜伽次卡仍在（停用不影响存量）");
  const on = await putCardType({ id: 7, isActive: 1 });
  types = await getCardTypes();
  ok(on.status === 200 && findType(types, 7)?.isActive === 1, "重新启用成功");

  // ── 5. 新增课种「东方舞」 ────────────────────────────────────────
  console.log("\n=== 5. 新增课种「东方舞」（key 留空由前端自动生成，这里直接给 key）===");
  const newCourse = await admin("/api/admin/courses", {
    method: "POST",
    body: JSON.stringify({ key: "oriental_dance", name: "东方舞", durationMinutes: 60, defaultCapacity: 8, color: "#7C3AED", sortOrder: 6 }),
  });
  ok(newCourse.status === 201 && newCourse.data.id, "POST 新增课种返回 201", `id=${newCourse.data.id}`);
  const courseId = Number(newCourse.data.id);
  let courses = (await admin("/api/admin/courses")).data;
  ok(courses.some((c) => Number(c.id) === courseId && c.name === "东方舞"), "课种列表出现东方舞（卡种配置的课种标签即据此渲染）");

  // ── 6. 给卡种勾东方舞；排课；预约拦截/放行 ──────────────────────────
  console.log("\n=== 6. 给「年卡一卡通」(id 8) 勾上东方舞，排一节东方舞课 ===");
  const grant8 = await putCardType({ id: 8, courseCategoryIds: [1, 2, 3, 5, courseId] });
  types = await getCardTypes();
  ok(grant8.status === 200 && (findType(types, 8)?.courseCategoryIds || []).includes(courseId), "年卡一卡通课种权限包含东方舞", JSON.stringify(findType(types, 8)?.courseCategoryIds));
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const sess = await admin("/api/admin/schedule", {
    method: "POST",
    body: JSON.stringify({ courseCategoryId: courseId, coachId: 11, roomId: 1, sessionDate: tomorrow, startTime: "10:00", capacity: 6 }),
  });
  ok(sess.status === 201 && sess.data.session?.id, "排课：新增东方舞课次成功", `id=${sess.data.session?.id} ${tomorrow} 10:00`);
  const sessionId = Number(sess.data.session?.id);

  console.log("\n=== 7. 会员（王莉，持瑜伽次卡）约东方舞：先被 422 拦截，授权后可约 ===");
  const rejected = await member("/api/portal/bookings", { method: "POST", body: JSON.stringify({ sessionId }) });
  ok(rejected.status === 422 && String(rejected.data.error || "").includes("东方舞"), "无该课种权限时预约返回 422 且文案友好", `HTTP ${rejected.status} ${rejected.data.error || ""}`);
  await putCardType({ id: 4, courseCategoryIds: [5, 1, courseId] }); // 临时授权给瑜伽次卡，用来验证放行
  const accepted = await member("/api/portal/bookings", { method: "POST", body: JSON.stringify({ sessionId }) });
  ok(accepted.status === 201, "勾选东方舞权限后同一会员预约成功", `HTTP ${accepted.status}`);
  const bookingId = Number(accepted.data.booking?.id);
  const portalCards = await member("/api/portal/cards");
  const yogaCard = (portalCards.data.cards || []).find((c) => Number(c.cardTypeId) === 4);
  ok(!!yogaCard, "会员端「我的卡」可读到瑜伽卡");
  console.log("       会员端可约文案：", (yogaCard?.courseCategoryNames || []).join(" · "));

  // ── 8. 删除守卫：被引用课种 / 有会员卡的卡种 ───────────────────────
  console.log("\n=== 8. 删除守卫 ===");
  const delCourseLinked = await admin(`/api/admin/courses?id=${courseId}`, { method: "DELETE" });
  ok(delCourseLinked.status === 409 && String(delCourseLinked.data.error || "").includes("卡种"), "被卡种引用的课种不能删除，提示改用停用", `HTTP ${delCourseLinked.status} ${delCourseLinked.data.error || ""}`);
  const delTypeWithCards = await admin("/api/admin/card-types?id=4", { method: "DELETE" });
  ok(delTypeWithCards.status === 409 && String(delTypeWithCards.data.error || "").includes("会员卡"), "有会员卡的卡种不能删除，提示改用停用", `HTTP ${delTypeWithCards.status} ${delTypeWithCards.data.error || ""}`);

  // ── 9. 发卡后会员端显示「可约：…」；再验证删除卡种 ─────────────────
  console.log("\n=== 9. 给王莉开「体验次卡」，会员端显示可约课种 ===");
  const issue = await admin("/api/admin/member-cards", {
    method: "POST",
    body: JSON.stringify({ memberId: 10, cardTypeId: newTypeId, totalCount: 12, remainingCount: 12, priceCents: 19800, idempotencyKey: `selfcheck-issue-${Date.now()}` }),
  });
  ok(issue.status === 201, "开卡接口返回 201", `memberCardId=${issue.data.id}`);
  const cards2 = await member("/api/portal/cards");
  const experienceCard = (cards2.data.cards || []).find((c) => Number(c.cardTypeId) === newTypeId);
  ok(!!experienceCard, "会员端出现体验次卡");
  const scope = (experienceCard?.courseCategoryNames || []).join(" · ");
  ok(scope === "精品普拉提 · 瑜伽", "会员端「可约」文案与卡种权限一致", scope);
  const delTypeNowUsed = await admin(`/api/admin/card-types?id=${newTypeId}`, { method: "DELETE" });
  ok(delTypeNowUsed.status === 409, "刚开过卡的卡种删除被拒绝", `HTTP ${delTypeNowUsed.status} ${delTypeNowUsed.data.error || ""}`);

  console.log("\n=== 10. 无引用卡种可以真删 ===");
  const throwaway = await admin("/api/admin/card-types", {
    method: "POST",
    body: JSON.stringify({ name: "自测临时卡", category: "count", priceCents: 0, totalCount: 1, courseCategoryIds: [1] }),
  });
  const throwawayId = Number(throwaway.data.id);
  const delThrowaway = await admin(`/api/admin/card-types?id=${throwawayId}`, { method: "DELETE" });
  types = await getCardTypes();
  ok(delThrowaway.status === 200 && !findType(types, throwawayId), "无会员卡引用的卡种可删除", `HTTP ${delThrowaway.status}`);
  const delCourseStillUsed = await admin(`/api/admin/courses?id=${courseId}`, { method: "DELETE" });
  ok(delCourseStillUsed.status === 409, "东方舞仍被卡种引用，删除被拒", `HTTP ${delCourseStillUsed.status}`);

  // ── 11. 停用课种不能排课；恢复并删除东方舞 ─────────────────────────
  console.log("\n=== 11. 停用课种不能排新课；清理东方舞 ===");
  await admin("/api/admin/courses", { method: "PUT", body: JSON.stringify({ id: courseId, isActive: 0 }) });
  const schedStopped = await admin("/api/admin/schedule", {
    method: "POST",
    body: JSON.stringify({ courseCategoryId: courseId, coachId: 11, roomId: 1, sessionDate: tomorrow, startTime: "15:00" }),
  });
  ok(schedStopped.status === 404, "停用课种不能排新课时", `HTTP ${schedStopped.status} ${schedStopped.data.error || ""}`);
  await admin("/api/admin/courses", { method: "PUT", body: JSON.stringify({ id: courseId, isActive: 1 }) });
  // 恢复卡种权限 → 删课次 → 删课种
  await putCardType({ id: 4, courseCategoryIds: [5, 1] });
  await putCardType({ id: 8, courseCategoryIds: [1, 2, 3, 5] });
  if (bookingId) await member("/api/portal/bookings/cancel", { method: "POST", body: JSON.stringify({ bookingId, reason: "自测清理" }) });
  const delSession = await admin(`/api/admin/schedule?id=${sessionId}`, { method: "DELETE" });
  ok(delSession.status === 200 || delSession.status === 204, "删除自测课次", `HTTP ${delSession.status}`);
  const delCourseClean = await admin(`/api/admin/courses?id=${courseId}`, { method: "DELETE" });
  courses = (await admin("/api/admin/courses")).data;
  ok(delCourseClean.status === 200 && !courses.some((c) => Number(c.id) === courseId), "无引用后课种可删除", `HTTP ${delCourseClean.status}`);

  // ── 12. 卡种权限复制（前端等价 PUT：把一卡通权限覆盖到目标卡种）──────
  console.log("\n=== 12. 权限复制（把「年卡一卡通」4 类权限覆盖到体验次卡）===");
  const sourceScope = findType(await getCardTypes(), 8)?.courseCategoryIds || [];
  const copy = await putCardType({ id: newTypeId, courseCategoryIds: sourceScope });
  types = await getCardTypes();
  ok(copy.status === 200 && JSON.stringify(findType(types, newTypeId)?.courseCategoryIds) === JSON.stringify(sourceScope), "复制后目标卡种权限与源一致", JSON.stringify(findType(types, newTypeId)?.courseCategoryIds));

  // ── 汇总 ────────────────────────────────────────────────────────
  console.log("\n==========================================");
  console.log(`PASS ${oks.length} / ${oks.length + fails.length}`);
  if (fails.length) {
    console.log("FAIL 项：");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
  console.log("全部通过（数据未清理，下一步跑 rollback-card-config.mjs 回滚）");
  console.log("自测期间保留：体验次卡(会员卡 1 张)、瑜伽次卡改名「瑜伽10次卡」、权限行被重写");
}

main().catch((e) => {
  console.error("自测脚本失败：", e);
  process.exit(1);
});
