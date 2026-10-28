import pg from "pg";

const url = process.env.DATABASE_URL || "postgres://laiwu:laiwu@127.0.0.1:5432/laiwu_e2e";
const pool = new pg.Pool({ connectionString: url });

function shanghaiToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}
function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE attendance, post_class_notes, bookings, class_sessions, card_transactions, member_cards, card_type_courses, card_types, course_categories, rooms, schedule_templates, body_measurements, import_changes, import_batches, training_feelings, members, admin_sessions, users, studio_settings, tenants RESTART IDENTITY CASCADE");

  const today = shanghaiToday();
  const joinedXiaoqiao = addDays(today, -819);
  await client.query(`INSERT INTO tenants (name, slug) VALUES ('徕舞', 'laiwu')`);
  const owner = await client.query(
    `INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status)
     VALUES (1, '小桥', 'admin@laiwu.fitness', 'laiwu-e2e-pass', 'owner', 1, 'active') RETURNING id`
  );
  const coach = await client.query(
    `INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status)
     VALUES (1, '何老师', 'coach@laiwu.fitness', 'coach-e2e-pass', 'coach', 1, 'active') RETURNING id`
  );
  const ownerId = owner.rows[0].id;
  const coachId = coach.rows[0].id;

  const courses = [
    ["pilates", "精品普拉提", 60, 6, "boutique", 1],
    ["equipment", "高定大器械", 60, 6, "boutique", 2],
    ["fat_burn", "维密超模班", 60, 10, "group", 3],
    ["private", "私教", 60, 1, "private", 4],
    ["yoga", "瑜伽", 60, 10, "group", 5],
  ];
  const courseIds = {};
  for (const [key, name, dur, cap, type, sort] of courses) {
    const r = await client.query(
      `INSERT INTO course_categories (tenant_id, key, name, duration_minutes, default_capacity, category_type, difficulty_stars, sort_order)
       VALUES (1, $1, $2, $3, $4, $5, 3, $6) RETURNING id`,
      [key, name, dur, cap, type, sort]
    );
    courseIds[key] = r.rows[0].id;
  }
  await client.query(`INSERT INTO rooms (tenant_id, name, capacity) VALUES (1,'普拉提核心床',6),(1,'私教',1),(1,'瑜伽',10),(1,'减脂超模班',10)`);
  const room = await client.query(`SELECT id FROM rooms WHERE name = '普拉提核心床'`);
  const roomId = room.rows[0].id;

  const cards = [
    ["东方舞年卡", "period", 500000, 365, null, 0],
    ["瑜伽课年卡", "period", 188000, 365, null, 1],
    ["一卡通次卡", "count", 500000, null, 30, 0],
    ["瑜伽次卡", "count", 99900, null, 10, 1],
    ["季卡", "period", 50000, 90, null, 1],
    ["普拉提月卡", "period", 111100, 30, null, 1],
    ["普拉提次卡", "count", 699900, null, 50, 1],
    ["年卡一卡通", "period", 980000, 365, null, 1],
    ["普拉提次卡", "count", 19800, null, 2, 0],
  ];
  const cardIds = {};
  for (let i = 0; i < cards.length; i++) {
    const [name, category, price, days, total, active] = cards[i];
    const r = await client.query(
      `INSERT INTO card_types (tenant_id, name, category, price_cents, validity_days, total_count, is_active, sort_order)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [name, category, price, days, total, active, i]
    );
    if (!cardIds[name] || active) cardIds[name] = r.rows[0].id;
  }
  const link = async (cardName, keys) => {
    for (const key of keys) {
      await client.query(
        `INSERT INTO card_type_courses (card_type_id, course_category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [cardIds[cardName], courseIds[key]]
      );
    }
  };
  await link("普拉提次卡", ["pilates"]);
  await link("瑜伽次卡", ["yoga"]);
  await link("年卡一卡通", ["pilates", "equipment", "fat_burn", "private", "yoga"]);
  await link("普拉提月卡", ["pilates"]);
  await link("季卡", ["pilates", "yoga"]);

  const members = [
    ["小桥", "15271754857", "XQ880001", "246810", joinedXiaoqiao, "小桥", 1],
    ["王芳", "13800001001", "WF880002", "111111", addDays(today, -400), "何老师", 1],
    ["王芳", "13800001002", "WF880003", "222222", addDays(today, -200), "何老师", 1],
    ["李梅", "13800001003", "LM880004", "333333", addDays(today, -90), "小桥", 1],
    ["周宁", "13800001004", "ZN880005", "444444", addDays(today, -300), "小桥", 1],
    ["赵晴", "13800001005", "ZQ880006", "555555", addDays(today, -60), "何老师", 1],
    ["陈静", null, "CJ880007", "135790", addDays(today, -30), "小桥", 1],
    ["孙悦", "13800001008", "SY880008", "666666", addDays(today, -20), "何老师", 1],
    ["吴婷", "13800001009", "WT880009", "777777", addDays(today, -15), "小桥", 1],
    ["郑琳", "13800001010", "ZL880010", "888888", addDays(today, -10), "小桥", 1],
  ];
  const memberIds = {};
  for (const [name, phone, code, pin, joined, mentor] of members) {
    const r = await client.query(
      `INSERT INTO members (tenant_id, name, phone, portal_code, login_pin, portal_enabled, status, joined_at, mentor_name, gender)
       VALUES (1,$1,$2,$3,$4,1,'active',$5,$6,'female') RETURNING id`,
      [name, phone, code, pin, joined, mentor]
    );
    memberIds[`${name}:${phone || "none"}`] = r.rows[0].id;
  }

  const openCard = async (key, cardName, opts) => {
    const id = memberIds[key];
    await client.query(
      `INSERT INTO member_cards (tenant_id, member_id, card_type_id, status, total_count, remaining_count, valid_from, valid_until, purchased_at, price_cents)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7,$6,0)`,
      [id, cardIds[cardName], opts.status, opts.total ?? null, opts.remaining ?? null, opts.from || today, opts.until || null]
    );
  };
  await openCard("小桥:15271754857", "年卡一卡通", { status: "active", from: joinedXiaoqiao, until: addDays(joinedXiaoqiao, 3650) });
  await openCard("王芳:13800001001", "普拉提次卡", { status: "active", total: 20, remaining: 12, from: addDays(today, -30), until: addDays(today, 150) });
  await openCard("王芳:13800001002", "普拉提月卡", { status: "active", from: today, until: addDays(today, 30) });
  await openCard("李梅:13800001003", "普拉提次卡", { status: "exhausted", total: 10, remaining: 0, from: addDays(today, -60), until: addDays(today, 120) });
  await openCard("周宁:13800001004", "季卡", { status: "active", from: addDays(today, -83), until: addDays(today, 7) });
  await openCard("赵晴:13800001005", "普拉提次卡", { status: "active", total: 10, remaining: 2, from: today, until: addDays(today, 180) });
  await openCard("陈静:none", "瑜伽次卡", { status: "active", total: 8, remaining: 8, from: today, until: addDays(today, 180) });
  await openCard("孙悦:13800001008", "年卡一卡通", { status: "active", from: today, until: addDays(today, 365) });
  await openCard("吴婷:13800001009", "普拉提次卡", { status: "active", total: 10, remaining: 6, from: today, until: addDays(today, 180) });
  await openCard("郑琳:13800001010", "普拉提次卡", { status: "active", total: 10, remaining: 6, from: today, until: addDays(today, 180) });

  const full = await client.query(
    `INSERT INTO class_sessions (tenant_id, course_category_id, coach_id, room_id, session_date, start_time, end_time, capacity, booked_count, status)
     VALUES (1,$1,$2,$3,$4,'19:30','20:30',2,2,'open') RETURNING id`,
    [courseIds.pilates, coachId, roomId, today]
  );
  const open = await client.query(
    `INSERT INTO class_sessions (tenant_id, course_category_id, coach_id, room_id, session_date, start_time, end_time, capacity, booked_count, status)
     VALUES (1,$1,$2,$3,$4,'10:00','11:00',6,0,'open') RETURNING id`,
    [courseIds.pilates, coachId, roomId, addDays(today, 1)]
  );
  const past = await client.query(
    `INSERT INTO class_sessions (tenant_id, course_category_id, coach_id, room_id, session_date, start_time, end_time, capacity, booked_count, status)
     VALUES (1,$1,$2,$3,$4,'09:00','10:00',6,1,'open') RETURNING id`,
    [courseIds.pilates, ownerId, roomId, addDays(today, -7)]
  );
  await client.query(`INSERT INTO bookings (tenant_id, session_id, member_id, status) VALUES (1,$1,$2,'booked'),(1,$1,$3,'booked'),(1,$1,$4,'waitlisted')`, [
    full.rows[0].id,
    memberIds["吴婷:13800001009"],
    memberIds["赵晴:13800001005"],
    memberIds["郑琳:13800001010"],
  ]);
  await client.query(
    `INSERT INTO bookings (tenant_id, session_id, member_id, status) VALUES (1,$1,$2,'attended')`,
    [past.rows[0].id, memberIds["小桥:15271754857"]]
  );
  await client.query(
    `INSERT INTO attendance (tenant_id, session_id, member_id, status) VALUES (1,$1,$2,'attended')`,
    [past.rows[0].id, memberIds["小桥:15271754857"]]
  );
  await client.query(
    `INSERT INTO post_class_notes (tenant_id, session_id, member_id, coach_id, content) VALUES (1,$1,$2,$3,'今天核心更稳，呼吸先放慢。')`,
    [past.rows[0].id, memberIds["小桥:15271754857"], coachId]
  );
  await client.query(
    `INSERT INTO body_measurements (tenant_id, member_id, measured_on, weight_kg, waist_cm, recorded_role)
     VALUES (1,$1,$2,58.4,70,'coach'),(1,$1,$3,57.6,68,'member')`,
    [memberIds["小桥:15271754857"], addDays(today, -28), addDays(today, -7)]
  );
  for (const [k, v] of [["booking_advance_days", "7"], ["cancel_cutoff_hours", "2"], ["same_day_limit", "2"]]) {
    await client.query(`INSERT INTO studio_settings (tenant_id, key, value) VALUES (1,$1,$2)`, [k, v]);
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ today, ownerId, coachId, fullSession: full.rows[0].id, openSession: open.rows[0].id, xiaoqiao: memberIds["小桥:15271754857"] }));
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
