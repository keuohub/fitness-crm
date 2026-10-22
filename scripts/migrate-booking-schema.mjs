import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("migrate-booking-schema", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());

await sql`CREATE TABLE IF NOT EXISTS course_categories (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL, name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60, default_capacity INTEGER NOT NULL DEFAULT 6,
  color TEXT, sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_category ON course_categories(tenant_id, key)`;

await sql`CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_name ON rooms(tenant_id, name)`;

await sql`CREATE TABLE IF NOT EXISTS card_types (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'count',
  price_cents INTEGER NOT NULL DEFAULT 0, validity_days INTEGER,
  weekly_limit INTEGER, total_count INTEGER,
  freeze_allowed INTEGER NOT NULL DEFAULT 0, transfer_allowed INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS member_cards (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL, card_type_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', total_count INTEGER, remaining_count INTEGER,
  valid_from TEXT, valid_until TEXT, purchased_at TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_member_cards_member ON member_cards(member_id)`;

await sql`CREATE TABLE IF NOT EXISTS card_transactions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_card_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
  booking_id INTEGER, type TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER, note TEXT, created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_card_tx_member ON card_transactions(member_id)`;

await sql`CREATE TABLE IF NOT EXISTS class_sessions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  course_category_id INTEGER NOT NULL, coach_id INTEGER NOT NULL, room_id INTEGER,
  title TEXT, session_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6, booked_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_sessions_date ON class_sessions(session_date)`;
await sql`CREATE INDEX IF NOT EXISTS idx_sessions_coach ON class_sessions(coach_id, session_date)`;

await sql`CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked', booked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP, cancel_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking ON bookings(session_id, member_id) WHERE status = 'booked'`;
await sql`CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id)`;

await sql`CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER NOT NULL, member_id INTEGER NOT NULL, booking_id INTEGER,
  status TEXT NOT NULL DEFAULT 'attended', marked_by INTEGER,
  marked_at TIMESTAMP NOT NULL DEFAULT NOW(), note TEXT
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance ON attendance(session_id, member_id)`;

await sql`CREATE TABLE IF NOT EXISTS post_class_notes (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER, member_id INTEGER NOT NULL, coach_id INTEGER,
  content TEXT NOT NULL, image_url TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_post_notes_member ON post_class_notes(member_id)`;

await sql`CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL, type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS studio_settings (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL, value TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_studio_setting ON studio_settings(tenant_id, key)`;

await sql`CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  actor_type TEXT, actor_id INTEGER, action TEXT NOT NULL,
  entity_type TEXT, entity_id INTEGER, before_json TEXT, after_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;

// 课程类目（含瑜伽，可扩展）
for (const c of [
  ["pilates", "精品普拉提", 60, 6, 1],
  ["equipment", "高定大器械", 60, 6, 2],
  ["fat_burn", "维密超模班", 60, 10, 3],
  ["private", "私教", 60, 1, 4],
  ["yoga", "瑜伽", 60, 10, 5],
]) {
  await sql`INSERT INTO course_categories (tenant_id, key, name, duration_minutes, default_capacity, sort_order)
    VALUES (1, ${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}, ${c[4]})
    ON CONFLICT (tenant_id, key) DO NOTHING`;
}

// 教室（照约刻实拍）
for (const r of [["瑜伽", 10], ["私教", 1], ["减脂超模班", 10], ["普拉提核心床", 6]]) {
  await sql`INSERT INTO rooms (tenant_id, name, capacity) VALUES (1, ${r[0]}, ${r[1]})
    ON CONFLICT (tenant_id, name) DO NOTHING`;
}

// 卡类型：照约刻实拍 9 种（仅首次为空时写入）
const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM card_types`;
if (n === 0) {
  const cards = [
    ["东方舞年卡", "period", 500000, 365, 3, null],
    ["瑜伽课年卡", "period", 188000, 365, 6, null],
    ["一卡通次卡", "count", 500000, null, null, 30],
    ["瑜伽次卡", "count", 99900, null, null, 10],
    ["季卡", "period", 50000, 90, 6, null],
    ["普拉提月卡", "period", 111100, 30, 0, null],
    ["普拉提次卡", "count", 699900, null, null, 50],
    ["年卡一卡通", "period", 980000, 365, 3, null],
    ["普拉提次卡", "count", 19800, null, null, 2],
  ];
  let i = 0;
  for (const c of cards) {
    await sql`INSERT INTO card_types (tenant_id, name, category, price_cents, validity_days, weekly_limit, total_count, sort_order)
      VALUES (1, ${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}, ${c[4]}, ${c[5]}, ${i++})`;
  }
}

// 预约规则默认值
for (const [k, v] of [
  ["booking_advance_days", "7"],
  ["cancel_cutoff_hours", "2"],
  ["same_day_limit", "2"],
  ["conflict_block", "0"],
  ["waitlist_enabled", "0"],
  ["no_show_deduct", "1"],
]) {
  await sql`INSERT INTO studio_settings (tenant_id, key, value) VALUES (1, ${k}, ${v})
    ON CONFLICT (tenant_id, key) DO NOTHING`;
}

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (
  'course_categories','rooms','card_types','member_cards','card_transactions','class_sessions',
  'bookings','attendance','post_class_notes','follow_ups','studio_settings','audit_logs'
) ORDER BY table_name`;
console.log("created tables:", tables.map((t) => t.table_name).join(", "));
const counts = await sql`SELECT
  (SELECT COUNT(*)::int FROM course_categories) AS categories,
  (SELECT COUNT(*)::int FROM rooms) AS rooms,
  (SELECT COUNT(*)::int FROM card_types) AS cards,
  (SELECT COUNT(*)::int FROM studio_settings) AS settings`;
console.log(counts[0]);
