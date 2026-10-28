import { NextRequest, NextResponse } from "next/server";
import { getValidAdminSession } from "@/lib/auth/admin-session";
import { rawSql } from "@/db";
import { generatePortalCode, generateLoginPin } from "@/lib/auth/member-credentials";
import { addCalendarDays, shanghaiToday } from "@/lib/shanghai-date";
import {
  MAX_IMPORT_ROWS,
  PlannedRow,
  annotateInFileDuplicates,
  cardIdempotencyKey,
  matchExistingMember,
  normalizePhone,
  planImportRow,
  tableToRecords,
} from "@/lib/member-import";
import { xlsxFirstSheet } from "@/lib/xlsx-lite";
import crypto from "crypto";

function tableToRecordsSafe(table: string[][]) {
  return tableToRecords(table);
}

type DbMember = {
  id: number;
  name: string;
  phone: string | null;
  member_code: string | null;
  portal_code: string | null;
  login_pin: string | null;
  joined_at: string | null;
  notes: string | null;
};

type CardTypeRow = {
  id: number;
  name: string;
  category: string;
  total_count: number | null;
  validity_days: number | null;
  is_active: number;
};

async function requireImporter(request: NextRequest) {
  const session = await getValidAdminSession(request);
  if (!session) return { error: NextResponse.json({ error: "需要管理员登录" }, { status: 401 }) };
  const role = session.role || "owner";
  const rank: Record<string, number> = { owner: 4, admin: 4, manager: 3, coach: 2, viewer: 1 };
  if ((rank[role] ?? 0) < 3) {
    return { error: NextResponse.json({ error: "仅店主或店长可以导入或回滚会员" }, { status: 403 }) };
  }
  return { session };
}

let schemaReady: Promise<void> | null = null;
function ensureImportSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await rawSql`ALTER TABLE members ADD COLUMN IF NOT EXISTS import_batch_id TEXT`;
      await rawSql`ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS import_batch_id TEXT`;
      await rawSql`ALTER TABLE card_transactions ADD COLUMN IF NOT EXISTS import_batch_id TEXT`;
      await rawSql`
        CREATE TABLE IF NOT EXISTS import_batches (
          id TEXT PRIMARY KEY,
          created_by INTEGER,
          summary_json TEXT,
          status TEXT NOT NULL DEFAULT 'applied',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`;
      await rawSql`
        CREATE TABLE IF NOT EXISTS import_changes (
          id SERIAL PRIMARY KEY,
          batch_id TEXT NOT NULL,
          action TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`;
      await rawSql`CREATE INDEX IF NOT EXISTS idx_import_changes_batch ON import_changes(batch_id)`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

function indexMembers(list: DbMember[]) {
  const byPhone = new Map<string, DbMember[]>();
  const byCode = new Map<string, DbMember>();
  const byName = new Map<string, DbMember[]>();
  for (const m of list) {
    const phone = normalizePhone(String(m.phone || "")).phone;
    if (phone) {
      const arr = byPhone.get(phone) || [];
      arr.push(m);
      byPhone.set(phone, arr);
    }
    const code = String(m.member_code || "").trim().toUpperCase();
    if (code) {
      byCode.set(code, m);
      if (!code.startsWith("LW")) byCode.set("LW" + code, m);
    }
    const name = String(m.name || "").trim();
    if (name) {
      const arr = byName.get(name) || [];
      arr.push(m);
      byName.set(name, arr);
    }
  }
  return { byPhone, byCode, byName };
}

async function remember(batchId: string, action: string, payload: Record<string, unknown>) {
  await rawSql`
    INSERT INTO import_changes (batch_id, action, payload_json)
    VALUES (${batchId}, ${action}, ${JSON.stringify(payload)})
  `;
}

export async function POST(request: NextRequest) {
  const auth = await requireImporter(request);
  if ("error" in auth && auth.error) return auth.error;
  const session = auth.session!;

  const body = await request.json().catch(() => ({}));
  if (body.action === "parse") return parseWorkbook(body);
  if (body.action === "rollback") return rollbackBatch(String(body.batchId || ""));

  const dryRun = Boolean(body.dryRun);
  const rows: Record<string, unknown>[] = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: "没有可导入的行" }, { status: 400 });
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `一次最多导入 ${MAX_IMPORT_ROWS} 行，请拆成多个文件` }, { status: 400 });
  }

  try {
    await ensureImportSchema();
  } catch (err) {
    console.error("[members-import] schema", err);
    return NextResponse.json({ error: "导入表结构初始化失败，请稍后重试" }, { status: 500 });
  }

  const now = new Date();
  const today = shanghaiToday(now);
  const planned = rows.map((row, i) => planImportRow(row, i + 1, now));
  annotateInFileDuplicates(planned);

  const cardTypes = (await rawSql`
    SELECT id, name, category, total_count, validity_days, is_active
    FROM card_types WHERE tenant_id = 1
  `) as CardTypeRow[];
  const existing = (await rawSql`
    SELECT id, name, phone, member_code, portal_code, login_pin, joined_at, notes
    FROM members WHERE tenant_id = 1
  `) as DbMember[];
  const idx = indexMembers(existing);

  const [last] = await rawSql`
    SELECT member_code FROM members
    WHERE tenant_id = 1 AND member_code IS NOT NULL AND member_code ~ '^[0-9]+$'
    ORDER BY member_code::int DESC LIMIT 1
  `;
  let nextCodeNum = last?.member_code ? parseInt(String(last.member_code), 10) + 1 : 1;

  const batchId = dryRun ? null : `imp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
  const results: Record<string, unknown>[] = [];

  for (const row of planned) {
    if (!row.ok) {
      results.push({ line: row.line, status: "failed", name: row.name, reason: row.reason, warnings: row.warnings });
      continue;
    }
    const outcome = await applyRow({
      row,
      idx,
      cardTypes,
      dryRun,
      batchId,
      today,
      nextCodeNum,
      actorId: session.userId,
    });
    if (outcome.nextCodeNum) nextCodeNum = outcome.nextCodeNum;
    results.push(outcome.result);
  }

  const summary = {
    dryRun,
    batchId,
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    membersCreated: results.filter((r) => r.memberAction === "create").length,
    cardsCreated: results.filter((r) => r.cardAction === "create").length,
  };

  if (!dryRun && batchId) {
    await rawSql`
      INSERT INTO import_batches (id, created_by, summary_json, status)
      VALUES (${batchId}, ${session.userId}, ${JSON.stringify(summary)}, 'applied')
    `;
  }

  return NextResponse.json({ summary, results });
}

async function parseWorkbook(body: { xlsxBase64?: string }) {
  if (!body.xlsxBase64) return NextResponse.json({ error: "缺少 xlsx 文件" }, { status: 400 });
  try {
    const buf = Buffer.from(String(body.xlsxBase64), "base64");
    if (buf.length > 5 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过 5MB" }, { status: 400 });
    const table = xlsxFirstSheet(buf);
    const rows = tableToRecordsSafe(table);
    if (!rows.length) return NextResponse.json({ error: "工作表是空的，或第一行不是表头" }, { status: 400 });
    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "无法读取 xlsx";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

async function applyRow(args: {
  row: PlannedRow;
  idx: ReturnType<typeof indexMembers>;
  cardTypes: CardTypeRow[];
  dryRun: boolean;
  batchId: string | null;
  today: string;
  nextCodeNum: number;
  actorId: number;
}): Promise<{ result: Record<string, unknown>; nextCodeNum?: number }> {
  const { row, idx, cardTypes, dryRun, today } = args;
  let nextCodeNum = args.nextCodeNum;
  const warnings = [...row.warnings];

  const indexed: { id: number; name: string; phone: string; memberCode: string; row: DbMember }[] = [];
  for (const list of idx.byPhone.values()) {
    for (const m of list) {
      if (!indexed.some((x) => x.id === m.id)) indexed.push({ id: m.id, name: m.name, phone: normalizePhone(String(m.phone || "")).phone, memberCode: String(m.member_code || ""), row: m });
    }
  }
  for (const list of idx.byName.values()) {
    for (const m of list) {
      if (!indexed.some((x) => x.id === m.id)) indexed.push({ id: m.id, name: m.name, phone: normalizePhone(String(m.phone || "")).phone, memberCode: String(m.member_code || ""), row: m });
    }
  }
  const matched = matchExistingMember(row, indexed);
  if (!matched.ok) return { result: { line: row.line, status: "failed", name: row.name, reason: matched.reason, warnings } };
  if (matched.warning) warnings.push(matched.warning);
  let member: DbMember | null = matched.member ? indexed.find((x) => x.id === matched.member!.id)?.row || null : null;
  let matchedBy = matched.matchedBy;

  let cardPlan: { type: CardTypeRow; total: number | null; remaining: number | null; validFrom: string; validUntil: string | null; status: string } | { error: string } | null = null;
  if (row.cardName) {
    const matches = cardTypes.filter((t) => String(t.name).trim() === row.cardName);
    if (!matches.length) {
      return { result: { line: row.line, status: "failed", name: row.name, matchedBy, reason: `卡种「${row.cardName}」不存在。请先在「会员卡」建好同名卡种，或把卡名留空`, warnings } };
    }
    if (matches.length > 1) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: `有 ${matches.length} 个卡种都叫「${row.cardName}」，请先改名区分`, warnings } };
    }
    const type = matches[0];
    if (Number(type.is_active) !== 1) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: `卡种「${row.cardName}」已停用。请先启用，或改用在用卡种`, warnings } };
    }
    const isCount = String(type.category) === "count";
    const total = isCount ? (row.total ?? (type.total_count != null ? Number(type.total_count) : null)) : null;
    const remaining = isCount ? (row.remaining ?? total) : null;
    let validUntil = row.validUntil;
    if (!isCount && !validUntil && type.validity_days) validUntil = addCalendarDays(row.validFrom, Number(type.validity_days));
    if (isCount && (total == null || remaining == null)) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: "次卡必须有总次数（表格填写，或卡种上已有默认次数）", warnings } };
    }
    if (isCount && remaining != null && total != null && (remaining < 0 || remaining > total)) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: `次卡次数不合理（总 ${total}，余 ${remaining}）`, warnings } };
    }
    if (!isCount && !validUntil) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: "期限卡必须填写到期日或有效天数", warnings } };
    }
    let status = "active";
    if (validUntil && validUntil < today) status = "expired";
    else if (isCount && remaining === 0) status = "exhausted";
    cardPlan = { type, total, remaining, validFrom: row.validFrom, validUntil, status };
  }

  const memberAction = member ? "match" : "create";
  let cardAction: "create" | "skip" | "none" = cardPlan ? "create" : "none";
  let cardId: number | undefined;
  let cardReason = "";

  if (member && cardPlan && !("error" in cardPlan)) {
    const key = cardIdempotencyKey(member.id, cardPlan.type.id, cardPlan.validFrom, cardPlan.validUntil);
    const [dup] = await rawSql`SELECT id, remaining_count, status FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key} LIMIT 1`;
    if (dup) {
      cardAction = "skip";
      cardId = Number(dup.id);
      cardReason = "该卡此前已开通，未重复开卡";
      if (cardPlan.remaining != null && Number(dup.remaining_count) !== cardPlan.remaining) {
        warnings.push(`库内剩余 ${dup.remaining_count} 次，表格是 ${cardPlan.remaining} 次。重导不会改余额，请到会员卡页面调整`);
      }
    }
  }

  let willTouchMember = false;
  if (member) {
    const joined = member.joined_at ? String(member.joined_at).slice(0, 10) : "";
    if (!joined && row.joinedAt) willTouchMember = true;
    else if (joined && joined !== row.joinedAt) warnings.push(`库内相伴起始日是 ${joined}，表格是 ${row.joinedAt}，未覆盖`);
    if (!member.notes && row.notes) willTouchMember = true;
    else if (member.notes && row.notes && member.notes !== row.notes) warnings.push("库内已有备注，未覆盖");
  }

  if (dryRun) {
    const status = !member || cardAction === "create" || willTouchMember ? "created" : "skipped";
    const reason = [
      member ? `将匹配已有会员（${matchedBy === "phone" ? "手机号" : matchedBy === "memberCode" ? "会员编号" : "姓名"}）` : "将新建会员并生成邀请码",
      cardAction === "create" ? `将开通「${row.cardName}」` : cardAction === "skip" ? cardReason : "不开卡",
      willTouchMember ? "将补相伴起始日或备注" : "",
    ].filter(Boolean).join("；");
    return {
      result: {
        line: row.line,
        status,
        name: row.name,
        matchedBy,
        memberAction,
        cardAction,
        cardName: row.cardName || undefined,
        cardId,
        portalCode: member?.portal_code || "（正式导入时生成）",
        loginPin: member?.login_pin || "",
        loginMode: row.phone ? "phone" : "pin",
        secondFactor: row.phone ? row.phone.slice(-4) : "（正式导入时生成）",
        reason,
        warnings,
      },
    };
  }

  const batchId = args.batchId!;
  if (!member) {
    let portalCode = "";
    for (let t = 0; t < 20; t++) {
      const c = generatePortalCode();
      const [dup] = await rawSql`SELECT id FROM members WHERE portal_code = ${c} LIMIT 1`;
      if (!dup) { portalCode = c; break; }
    }
    if (!portalCode) {
      return { result: { line: row.line, status: "failed", name: row.name, reason: "邀请码生成失败，请重试这一行", warnings } };
    }
    const loginPin = generateLoginPin();
    const memberCode = String(nextCodeNum).padStart(4, "0");
    nextCodeNum += 1;
    try {
      const [created] = await rawSql`
        INSERT INTO members
          (tenant_id, name, phone, gender, member_code, portal_code, login_pin, portal_enabled,
           status, joined_at, birthday, mentor_name, notes, import_batch_id, created_at, updated_at)
        VALUES
          (1, ${row.name}, ${row.phone || null}, ${row.gender}, ${memberCode}, ${portalCode}, ${loginPin}, 1,
           'active', ${row.joinedAt}, ${row.birthday || null}, ${row.mentorName || null}, ${row.notes || null},
           ${batchId}, NOW(), NOW())
        RETURNING id, name, phone, member_code, portal_code, login_pin, joined_at, notes
      `;
      member = created as DbMember;
      matchedBy = "new";
      await remember(batchId, "insert_member", { memberId: member.id });
      if (row.phone) {
        const arr = idx.byPhone.get(row.phone) || [];
        arr.push(member);
        idx.byPhone.set(row.phone, arr);
      }
      const names = idx.byName.get(row.name) || [];
      names.push(member);
      idx.byName.set(row.name, names);
      idx.byCode.set(memberCode, member);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { result: { line: row.line, status: "failed", name: row.name, reason: "建会员失败：" + msg.slice(0, 120), warnings }, nextCodeNum };
    }
  } else if (willTouchMember) {
    const before = { joined_at: member.joined_at, notes: member.notes };
    const joined = member.joined_at ? String(member.joined_at).slice(0, 10) : "";
    const nextJoined = joined || row.joinedAt;
    const nextNotes = member.notes || row.notes || null;
    await rawSql`
      UPDATE members SET joined_at = ${nextJoined}, notes = ${nextNotes}, updated_at = NOW()
      WHERE id = ${member.id}
    `;
    await remember(batchId, "update_member", { memberId: member.id, before });
    member.joined_at = nextJoined;
    member.notes = nextNotes;
  }

  if (cardPlan && !("error" in cardPlan) && member && cardAction === "create") {
    const key = cardIdempotencyKey(member.id, cardPlan.type.id, cardPlan.validFrom, cardPlan.validUntil);
    const [dup] = await rawSql`SELECT id, remaining_count FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key} LIMIT 1`;
    if (dup) {
      cardAction = "skip";
      cardId = Number(dup.id);
      cardReason = "该卡此前已开通，未重复开卡";
    } else {
      const [card] = await rawSql`
        INSERT INTO member_cards
          (tenant_id, member_id, card_type_id, status, total_count, remaining_count,
           valid_from, valid_until, purchased_at, price_cents, idempotency_key, import_batch_id, created_at, updated_at)
        VALUES
          (1, ${member.id}, ${cardPlan.type.id}, ${cardPlan.status},
           ${cardPlan.total}, ${cardPlan.remaining},
           ${cardPlan.validFrom}, ${cardPlan.validUntil}, ${cardPlan.validFrom}, 0, ${key}, ${batchId}, NOW(), NOW())
        RETURNING id
      `;
      cardId = Number(card.id);
      await rawSql`
        INSERT INTO card_transactions
          (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, import_batch_id, created_by, created_at)
        VALUES
          (1, ${cardId}, ${member.id}, 'purchase', ${cardPlan.total ?? 0}, ${cardPlan.remaining ?? 0},
           '批量导入开卡', ${key}, ${batchId}, ${args.actorId}, NOW())
      `;
      await remember(batchId, "insert_card", { cardId, memberId: member.id });
      cardReason = cardPlan.status === "active" ? "已开卡" : `已开卡（状态 ${cardPlan.status === "expired" ? "已过期" : "已用完"}）`;
    }
  } else if (!row.cardName) {
    cardReason = member && matchedBy !== "new" ? "未填写卡名，不开卡" : `已建档，相伴从 ${row.joinedAt} 起算，未开卡`;
  }

  const phoneDigits = normalizePhone(String(member?.phone || row.phone || "")).phone;
  const loginMode = phoneDigits ? "phone" : "pin";
  const loginPin = member?.login_pin || "";
  const changed = matchedBy === "new" || cardAction === "create" || willTouchMember;
  return {
    nextCodeNum,
    result: {
      line: row.line,
      status: changed ? "created" : "skipped",
      name: row.name,
      matchedBy,
      memberAction,
      cardAction,
      portalCode: member?.portal_code || "",
      loginPin,
      loginMode,
      secondFactor: loginMode === "phone" ? phoneDigits.slice(-4) : loginPin,
      cardName: row.cardName || undefined,
      cardId,
      reason: cardReason || undefined,
      warnings,
    },
  };
}

async function rollbackBatch(batchId: string) {
  if (!/^imp_[a-z0-9_]+$/i.test(batchId)) {
    return NextResponse.json({ error: "批次号不正确" }, { status: 400 });
  }
  await ensureImportSchema();
  const [batch] = await rawSql`SELECT id, status FROM import_batches WHERE id = ${batchId}`;
  if (!batch) return NextResponse.json({ error: "找不到这批导入" }, { status: 404 });
  if (batch.status === "rolled_back") {
    return NextResponse.json({ ok: true, already: true, message: "这批已经回滚过" });
  }

  const changes = await rawSql`
    SELECT action, payload_json FROM import_changes WHERE batch_id = ${batchId} ORDER BY id DESC
  `;
  const blocked: string[] = [];
  let cardsRemoved = 0;
  let membersRemoved = 0;
  let membersRestored = 0;

  for (const change of changes) {
    const payload = JSON.parse(String(change.payload_json || "{}"));
    if (change.action === "insert_card") {
      const cardId = Number(payload.cardId);
      const [foreign] = await rawSql`
        SELECT COUNT(*)::int AS n FROM card_transactions
        WHERE member_card_id = ${cardId}
          AND (import_batch_id IS DISTINCT FROM ${batchId} OR type <> 'purchase')
      `;
      if (Number(foreign?.n || 0) > 0) {
        blocked.push(`会员卡 #${cardId} 已有消课或其他流水，未删除`);
        continue;
      }
      await rawSql`DELETE FROM card_transactions WHERE member_card_id = ${cardId} AND import_batch_id = ${batchId}`;
      await rawSql`DELETE FROM member_cards WHERE id = ${cardId} AND import_batch_id = ${batchId}`;
      cardsRemoved += 1;
    }
  }

  for (const change of changes) {
    const payload = JSON.parse(String(change.payload_json || "{}"));
    if (change.action === "update_member") {
      const before = payload.before || {};
      await rawSql`
        UPDATE members SET joined_at = ${before.joined_at ?? null}, notes = ${before.notes ?? null}, updated_at = NOW()
        WHERE id = ${Number(payload.memberId)}
      `;
      membersRestored += 1;
    }
  }

  for (const change of changes) {
    const payload = JSON.parse(String(change.payload_json || "{}"));
    if (change.action !== "insert_member") continue;
    const memberId = Number(payload.memberId);
    const [use] = await rawSql`
      SELECT
        (SELECT COUNT(*)::int FROM member_cards WHERE member_id = ${memberId}) AS cards,
        (SELECT COUNT(*)::int FROM bookings WHERE member_id = ${memberId}) AS bookings,
        (SELECT COUNT(*)::int FROM attendance WHERE member_id = ${memberId}) AS attendance
    `;
    if (Number(use?.cards || 0) + Number(use?.bookings || 0) + Number(use?.attendance || 0) > 0) {
      blocked.push(`会员 #${memberId} 已有卡、预约或出勤，未删除档案`);
      continue;
    }
    await rawSql`DELETE FROM members WHERE id = ${memberId} AND import_batch_id = ${batchId}`;
    membersRemoved += 1;
  }

  const status = blocked.length ? "rolled_back_partial" : "rolled_back";
  await rawSql`UPDATE import_batches SET status = ${status} WHERE id = ${batchId}`;
  return NextResponse.json({
    ok: blocked.length === 0,
    batchId,
    cardsRemoved,
    membersRemoved,
    membersRestored,
    blocked,
    message: blocked.length ? "已回滚能安全撤销的部分，下面这些请人工处理" : "这批导入已撤回",
  });
}
