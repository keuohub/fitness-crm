-- Extra tables and columns the app reads beyond neon-create-tables.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coach INTEGER NOT NULL DEFAULT 0;

ALTER TABLE members ADD COLUMN IF NOT EXISTS login_pin TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mentor_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS wechat_open_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS total_hours INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS hours_pilates INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS hours_equipment INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS hours_fat_burn INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS hours_private INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS privacy_consent_at TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS terms_version TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS members_wechat_open_id_key ON members(wechat_open_id) WHERE wechat_open_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_categories (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL, name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60, default_capacity INTEGER NOT NULL DEFAULT 6,
  color TEXT, category_type TEXT DEFAULT 'boutique', difficulty_stars INTEGER DEFAULT 3,
  cover_image TEXT DEFAULT '', description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_category ON course_categories(tenant_id, key);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_name ON rooms(tenant_id, name);

CREATE TABLE IF NOT EXISTS card_types (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'count',
  price_cents INTEGER NOT NULL DEFAULT 0, validity_days INTEGER,
  weekly_limit INTEGER, total_count INTEGER,
  freeze_allowed INTEGER NOT NULL DEFAULT 0, transfer_allowed INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_type_courses (
  id SERIAL PRIMARY KEY,
  card_type_id INTEGER NOT NULL,
  course_category_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS card_type_courses_uniq ON card_type_courses(card_type_id, course_category_id);

CREATE TABLE IF NOT EXISTS member_cards (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL, card_type_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', total_count INTEGER, remaining_count INTEGER,
  valid_from TEXT, valid_until TEXT, purchased_at TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0, idempotency_key TEXT, import_batch_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_member_card_idem ON member_cards(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS card_transactions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_card_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
  booking_id INTEGER, type TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER, note TEXT, idempotency_key TEXT, import_batch_id TEXT, created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1, template_id INTEGER,
  course_category_id INTEGER NOT NULL, coach_id INTEGER NOT NULL, room_id INTEGER,
  title TEXT, session_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6, booked_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked', idempotency_key TEXT,
  booked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP, cancel_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking ON bookings(session_id, member_id) WHERE status = 'booked';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_waitlist_booking ON bookings(session_id, member_id) WHERE status = 'waitlisted';

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER NOT NULL, member_id INTEGER NOT NULL, booking_id INTEGER,
  status TEXT NOT NULL DEFAULT 'attended', marked_by INTEGER,
  marked_at TIMESTAMP NOT NULL DEFAULT NOW(), note TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance ON attendance(session_id, member_id);

CREATE TABLE IF NOT EXISTS post_class_notes (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  session_id INTEGER, member_id INTEGER NOT NULL, coach_id INTEGER,
  content TEXT NOT NULL, image_url TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL, type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_settings (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL, value TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_studio_setting ON studio_settings(tenant_id, key);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  actor_type TEXT, actor_id INTEGER, action TEXT NOT NULL,
  entity_type TEXT, entity_id INTEGER, before_json TEXT, after_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_templates (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1,
  course_id INTEGER NOT NULL, coach_id INTEGER NOT NULL, room_id INTEGER,
  weekday INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6, effective_from TEXT, effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_feelings (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id), training_id INTEGER,
  feeling TEXT NOT NULL, xiaoqiao_reply TEXT, ai_draft TEXT,
  reply_status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_stars (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, avatar_url TEXT NOT NULL,
  tag TEXT, quote TEXT, join_days INTEGER, train_count INTEGER, course_type TEXT, journey TEXT,
  sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venue_items (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, name TEXT, tag TEXT, "desc" TEXT,
  image_url TEXT NOT NULL, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, role_title TEXT NOT NULL, avatar_url TEXT NOT NULL,
  bio TEXT, experience TEXT, creds TEXT, quote TEXT,
  sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_offerings (
  id SERIAL PRIMARY KEY, num TEXT NOT NULL, name TEXT NOT NULL, en_name TEXT NOT NULL,
  summary TEXT NOT NULL, target TEXT NOT NULL, highlight TEXT NOT NULL, image_url TEXT,
  sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_comparisons (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  photo_id_1 INTEGER, photo_id_2 INTEGER, analysis TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_leads (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT,
  studio_name TEXT, member_scale TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY, created_by INTEGER, summary_json TEXT,
  status TEXT NOT NULL DEFAULT 'applied', created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS import_changes (
  id SERIAL PRIMARY KEY, batch_id TEXT NOT NULL, action TEXT NOT NULL,
  payload_json TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL DEFAULT 1, member_id INTEGER NOT NULL,
  measured_on TEXT NOT NULL, weight_kg REAL, waist_cm REAL, hip_cm REAL, bust_cm REAL, thigh_cm REAL,
  note TEXT, recorded_by INTEGER, recorded_role TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE photos ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
