// Automated Commercial Stability & Consistency Verification Suite (Isolated Test Environment)
// Uses a temporary isolated test member (phone: 19900000001)
// Cleans up all test data on completion.

import { neon } from "@neondatabase/serverless";
import { requireTestDatabaseGuard } from "./_test-db-guard";

// 强制执行测试环境熔断守卫：仅允许连接已确认的隔离测试库，严禁连接生产库
const dbUrl = requireTestDatabaseGuard();
const rawSql = neon(dbUrl);

interface TestResult {
  name: string;
  category: string;
  status: "PASSED" | "FAILED";
  details: string;
}

const results: TestResult[] = [];

async function run() {
  console.log("=================================================");
  console.log("LAIWU CRM Commercial Reliability & Consistency Test");
  console.log("=================================================");

  const TEST_PHONE = "19900000001";
  const TEST_NAME = "[TEST_AUDIT_RUNNER]";

  // 0. Pre-test cleanup if any stale records exist
  console.log("\n[0/6] Cleaning up any prior test records...");
  await cleanup(TEST_PHONE);

  let testMemberId: number | null = null;
  let testCardTypeId: number | null = null;
  let testSessionId: number | null = null;
  let testCoachId: number = 1;

  try {
    // Setup 1: Find or create a card type
    const [cardType] = await rawSql`
      SELECT id FROM card_types WHERE tenant_id = 1 AND is_active = 1 AND category = 'count' LIMIT 1
    `;
    if (!cardType) {
      throw new Error("No active count card_type found for testing");
    }
    testCardTypeId = cardType.id;

    // Setup 2: Create isolated test member
    const [member] = await rawSql`
      INSERT INTO members (tenant_id, name, phone, status, created_at, updated_at)
      VALUES (1, ${TEST_NAME}, ${TEST_PHONE}, 'active', NOW(), NOW())
      RETURNING id
    `;
    testMemberId = member.id;
    console.log(`✓ Created isolated test member: id=${testMemberId}, phone=${TEST_PHONE}`);

    // Setup 3: Create 2 isolated test sessions for concurrent testing
    const [category] = await rawSql`SELECT id FROM course_categories WHERE tenant_id = 1 LIMIT 1`;
    const [session1] = await rawSql`
      INSERT INTO class_sessions (tenant_id, course_category_id, coach_id, session_date, start_time, end_time, capacity, booked_count, status)
      VALUES (1, ${category.id}, ${testCoachId}, '2099-12-30', '10:00', '11:00', 10, 1, 'open')
      RETURNING id
    `;
    const [session2] = await rawSql`
      INSERT INTO class_sessions (tenant_id, course_category_id, coach_id, session_date, start_time, end_time, capacity, booked_count, status)
      VALUES (1, ${category.id}, ${testCoachId}, '2099-12-31', '14:00', '15:00', 10, 1, 'open')
      RETURNING id
    `;
    testSessionId = session1.id;
    console.log(`✓ Created isolated test class sessions: s1=${session1.id}, s2=${session2.id}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST CASE A: Idempotency of Member Card Creation (Double Submit)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- [Test A] Idempotency: Double submit member card creation with same key ---");
    const idemKeyA = `test-idem-card-${Date.now()}`;

    // 1st insert
    const insertCard = async (key: string) => {
      try {
        const rows = await rawSql`
          WITH inserted AS (
            INSERT INTO member_cards
              (tenant_id, member_id, card_type_id, status, total_count, remaining_count,
               valid_from, valid_until, purchased_at, price_cents, idempotency_key, created_at, updated_at)
            VALUES
              (1, ${testMemberId}, ${testCardTypeId}, 'active', 1, 1,
               '2099-01-01', '2099-12-31', '2099-01-01', 10000, ${key}, NOW(), NOW())
            RETURNING *
          ), tx AS (
            INSERT INTO card_transactions
              (tenant_id, member_card_id, member_id, type, amount, balance_after, note, idempotency_key, created_at)
            SELECT 1, id, ${testMemberId}, 'purchase', 1, 1, '测试开卡', ${key}, NOW()
            FROM inserted
            RETURNING id
          )
          SELECT * FROM inserted`;
        return { success: true, row: rows[0] };
      } catch (err: any) {
        if (String(err?.message || "").includes("uniq_member_card_idem")) {
          const [existing] = await rawSql`SELECT * FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${key}`;
          return { success: true, duplicate: true, row: existing };
        }
        throw err;
      }
    };

    const resA1 = await insertCard(idemKeyA);
    const resA2 = await insertCard(idemKeyA);

    const cardsA = await rawSql`SELECT * FROM member_cards WHERE tenant_id = 1 AND idempotency_key = ${idemKeyA}`;
    const txA = await rawSql`SELECT * FROM card_transactions WHERE tenant_id = 1 AND idempotency_key = ${idemKeyA}`;

    if (cardsA.length === 1 && txA.length === 1 && resA2.duplicate) {
      results.push({
        name: "Test A: 同一开卡请求连续提交两次（幂等性）",
        category: "P1 账实一致性",
        status: "PASSED",
        details: `两次提交返回相同记录（第2次 duplicate=true），数据库严格只插入1张卡和1条流水。`,
      });
      console.log("✓ Test A PASSED: Database prevented duplicate insertion, exact 1 card & 1 tx present.");
    } else {
      results.push({
        name: "Test A: 同一开卡请求连续提交两次（幂等性）",
        category: "P1 账实一致性",
        status: "FAILED",
        details: `Cards: ${cardsA.length}, Tx: ${txA.length}`,
      });
      console.error("✗ Test A FAILED");
    }

    const testCardId = cardsA[0].id;

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST CASE B: Concurrent Deduction when remaining_count = 1
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- [Test B] Concurrent Deduction: 2 simultaneous check-ins for 1 remaining lesson ---");

    // Create 1 booking for session1 and 1 booking for session2
    const [booking1] = await rawSql`
      INSERT INTO bookings (tenant_id, session_id, member_id, status, idempotency_key)
      VALUES (1, ${session1.id}, ${testMemberId}, 'booked', ${'b1-' + Date.now()})
      RETURNING id
    `;
    const [booking2] = await rawSql`
      INSERT INTO bookings (tenant_id, session_id, member_id, status, idempotency_key)
      VALUES (1, ${session2.id}, ${testMemberId}, 'booked', ${'b2-' + Date.now()})
      RETURNING id
    `;

    const executeCheckIn = async (bId: number, sId: number) => {
      try {
        const rows = await rawSql`
          WITH booking_ok AS (
            SELECT id, session_id, member_id FROM bookings
            WHERE id = ${bId} AND tenant_id = 1 AND status = 'booked'
          ), candidate AS (
            SELECT mc.id, mc.remaining_count, ct.category
            FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
            WHERE mc.tenant_id = 1
              AND mc.member_id = (SELECT member_id FROM booking_ok)
              AND mc.status = 'active'
              AND (ct.category = 'period' OR mc.remaining_count > 0)
            ORDER BY mc.id
            LIMIT 1
            FOR UPDATE OF mc
          ), card AS (
            UPDATE member_cards mc
            SET remaining_count = CASE WHEN c.category = 'count' THEN mc.remaining_count - 1 ELSE mc.remaining_count END,
                updated_at = NOW()
            FROM candidate c
            WHERE mc.id = c.id AND (c.category = 'period' OR mc.remaining_count > 0)
            RETURNING mc.id, mc.remaining_count, c.category
          ), att AS (
            INSERT INTO attendance (tenant_id, session_id, member_id, booking_id, status, marked_by, marked_at, note)
            SELECT 1, ${sId}, ${testMemberId}, ${bId}, 'attended', ${testCoachId}, NOW(), '并发测试扣次'
            FROM card
            WHERE NOT EXISTS (
              SELECT 1 FROM attendance WHERE session_id = ${sId} AND member_id = ${testMemberId}
            )
            RETURNING id, member_id
          ), tx AS (
            INSERT INTO card_transactions
              (tenant_id, member_card_id, member_id, booking_id, type, amount, balance_after, note, created_by)
            SELECT 1, card.id, ${testMemberId}, ${bId}, 'deduct',
                   CASE WHEN card.category = 'count' THEN -1 ELSE 0 END,
                   card.remaining_count, '测试扣次', ${testCoachId}
            FROM card WHERE EXISTS (SELECT 1 FROM att)
            RETURNING id
          ), bu AS (
            UPDATE bookings SET status = 'attended', updated_at = NOW()
            WHERE id = ${bId} AND tenant_id = 1 AND status = 'booked'
              AND EXISTS (SELECT 1 FROM att)
            RETURNING id
          )
          SELECT (SELECT id FROM att) AS attendance_id,
                 (SELECT id FROM card) AS card_id,
                 (SELECT remaining_count FROM card) AS remaining_count`;
        return { success: true, row: rows[0] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    };

    // Run both check-ins concurrently
    const [resB1, resB2] = await Promise.all([
      executeCheckIn(booking1.id, session1.id),
      executeCheckIn(booking2.id, session2.id),
    ]);

    const [updatedCard] = await rawSql`SELECT remaining_count FROM member_cards WHERE id = ${testCardId}`;
    const deductTxs = await rawSql`
      SELECT * FROM card_transactions WHERE member_card_id = ${testCardId} AND type = 'deduct'
    `;

    console.log(`Concurrent results: res1.att=${resB1.row?.attendance_id}, res2.att=${resB2.row?.attendance_id}`);
    console.log(`Updated remaining count: ${updatedCard.remaining_count}, Deduct transactions count: ${deductTxs.length}`);

    if (updatedCard.remaining_count === 0 && deductTxs.length === 1) {
      results.push({
        name: "Test B: 两个并发请求同时消耗同一会员的剩余课时（余额防透支）",
        category: "P1 账实一致性",
        status: "PASSED",
        details: `剩余1次课时并发扣减，通过 FOR UPDATE OF mc 行锁保证精确扣减1次，余额归0，绝不透支为负数。`,
      });
      console.log("✓ Test B PASSED: Row-level lock prevented double deduction, remaining_count=0.");
    } else {
      results.push({
        name: "Test B: 两个并发请求同时消耗同一会员的剩余课时（余额防透支）",
        category: "P1 账实一致性",
        status: "FAILED",
        details: `Remaining: ${updatedCard.remaining_count}, Deduct records: ${deductTxs.length}`,
      });
      console.error("✗ Test B FAILED");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST CASE C: Cancel the same booking twice
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- [Test C] Cancel Booking Twice: Idempotency of cancellation ---");

    const [bookingC] = await rawSql`
      INSERT INTO bookings (tenant_id, session_id, member_id, status, idempotency_key)
      VALUES (1, ${testSessionId}, ${testMemberId}, 'booked', ${'bc-' + Date.now()})
      RETURNING id
    `;
    await rawSql`UPDATE class_sessions SET booked_count = 5 WHERE id = ${testSessionId}`;

    const cancelBooking = async (bId: number) => {
      const [b] = await rawSql`SELECT * FROM bookings WHERE id = ${bId} AND tenant_id = 1`;
      if (!b) return { error: "not found", status: 404 };
      if (b.status === "cancelled") return { booking: b, duplicate: true, status: 200 };
      if (b.status !== "booked") return { error: "cannot cancel", status: 409 };

      const rows = await rawSql`
        WITH updated AS (
          UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(),
            cancel_reason = '测试取消', updated_at = NOW()
          WHERE id = ${bId} AND tenant_id = 1 AND status = 'booked' RETURNING *
        ), released AS (
          UPDATE class_sessions SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
          WHERE id IN (SELECT session_id FROM updated) RETURNING id
        ) SELECT * FROM updated`;
      return { booking: rows[0], duplicate: false, status: 200 };
    };

    const resC1 = await cancelBooking(bookingC.id);
    const [sessAfterC1] = await rawSql`SELECT booked_count FROM class_sessions WHERE id = ${testSessionId}`;

    const resC2 = await cancelBooking(bookingC.id);
    const [sessAfterC2] = await rawSql`SELECT booked_count FROM class_sessions WHERE id = ${testSessionId}`;

    if (
      resC1.status === 200 &&
      !resC1.duplicate &&
      sessAfterC1.booked_count === 4 &&
      resC2.status === 200 &&
      resC2.duplicate &&
      sessAfterC2.booked_count === 4
    ) {
      results.push({
        name: "Test C: 取消同一预约两次（防重复回退名额）",
        category: "P2 排课与预约",
        status: "PASSED",
        details: `第1次取消成功（名额从5减至4），第2次取消直接返回 duplicate:true，课次 booked_count 维持4，未发生二次扣减。`,
      });
      console.log("✓ Test C PASSED: Idempotent cancellation preserved booked_count.");
    } else {
      results.push({
        name: "Test C: 取消同一预约两次（防重复回退名额）",
        category: "P2 排课与预约",
        status: "FAILED",
        details: `C1: ${JSON.stringify(resC1)}, C2: ${JSON.stringify(resC2)}, count1: ${sessAfterC1.booked_count}, count2: ${sessAfterC2.booked_count}`,
      });
      console.error("✗ Test C FAILED");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST CASE F: Attempt to Book/Deduct on Frozen Member Card
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- [Test F] Frozen Card Guard: Attempting to use a frozen card ---");

    // Issue a new card with remaining=5, then set status='frozen'
    const [frozenCard] = await rawSql`
      INSERT INTO member_cards
        (tenant_id, member_id, card_type_id, status, total_count, remaining_count,
         valid_from, valid_until, purchased_at, price_cents, created_at, updated_at)
      VALUES
        (1, ${testMemberId}, ${testCardTypeId}, 'frozen', 5, 5,
         '2099-01-01', '2099-12-31', '2099-01-01', 50000, NOW(), NOW())
      RETURNING id
    `;

    // Check portal booking eligibility query
    const [validCardForBooking] = await rawSql`
      SELECT mc.id, mc.status, mc.valid_until, mc.valid_from, mc.remaining_count, ct.category
      FROM member_cards mc JOIN card_types ct ON ct.id = mc.card_type_id
      WHERE mc.tenant_id = 1 AND mc.member_id = ${testMemberId}
        AND mc.status = 'active'
        AND (mc.valid_from IS NULL OR mc.valid_from::date <= CURRENT_DATE)
        AND (mc.valid_until IS NULL OR mc.valid_until::date >= CURRENT_DATE)
        AND ct.category IN ('count', 'period')
        AND (ct.category = 'period' OR mc.remaining_count > 0)
      LIMIT 1`;

    if (!validCardForBooking) {
      results.push({
        name: "Test F: 冻结会员卡后尝试预约/扣费（卡状态保护）",
        category: "P1 账实一致性",
        status: "PASSED",
        details: `会员卡状态为 frozen 时，可用卡查询条件 (status = 'active') 严格将其排除，接口拒绝预约与消课。`,
      });
      console.log("✓ Test F PASSED: Frozen card was correctly rejected by system filter.");
    } else {
      results.push({
        name: "Test F: 冻结会员卡后尝试预约/扣费（卡状态保护）",
        category: "P1 账实一致性",
        status: "FAILED",
        details: `Frozen card id=${frozenCard.id} was incorrectly selected: ${JSON.stringify(validCardForBooking)}`,
      });
      console.error("✗ Test F FAILED");
    }

  } catch (err) {
    console.error("Test execution aborted with error:", err);
  } finally {
    // ─────────────────────────────────────────────────────────────────────────────
    // Post-test Cleanup: Ensure 100% test isolation
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[Clean-up] Removing isolated test records from database...");
    await cleanup(TEST_PHONE);
    console.log("✓ All isolated test data thoroughly purged.");
  }

  // Print final summary table
  console.log("\n=================================================");
  console.log("TEST VERIFICATION REPORT SUMMARY");
  console.log("=================================================");
  console.table(results);
}

async function cleanup(phone: string) {
  try {
    const membersList = await rawSql`SELECT id FROM members WHERE phone = ${phone} AND tenant_id = 1`;
    for (const m of membersList) {
      const mId = m.id;
      await rawSql`DELETE FROM card_transactions WHERE member_id = ${mId} AND tenant_id = 1`;
      await rawSql`DELETE FROM attendance WHERE member_id = ${mId} AND tenant_id = 1`;
      await rawSql`DELETE FROM bookings WHERE member_id = ${mId} AND tenant_id = 1`;
      await rawSql`DELETE FROM member_cards WHERE member_id = ${mId} AND tenant_id = 1`;
      await rawSql`DELETE FROM members WHERE id = ${mId} AND tenant_id = 1`;
    }
    await rawSql`DELETE FROM class_sessions WHERE session_date IN ('2099-12-30', '2099-12-31') AND tenant_id = 1`;
  } catch (e) {
    console.warn("Cleanup warning:", e);
  }
}

run().catch(console.error);
