-- 租户
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coach',
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_code TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  phone_verified INTEGER DEFAULT 0,
  stage TEXT,
  tags TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  freeze_status TEXT DEFAULT 'active',
  freeze_start TEXT,
  freeze_end TEXT,
  joined_at TEXT,
  birthday TEXT,
  portal_code TEXT UNIQUE,
  portal_enabled INTEGER DEFAULT 0,
  portal_activated_at TEXT,
  current_questionnaire_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员记忆
CREATE TABLE IF NOT EXISTS member_memories (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  content TEXT,
  structured_data TEXT,
  memory_type TEXT NOT NULL DEFAULT 'note',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 每日健康日志
CREATE TABLE IF NOT EXISTS daily_health_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  log_date TEXT NOT NULL,
  weight REAL,
  sleep_hours REAL,
  stress_level INTEGER,
  energy_level INTEGER,
  pain_areas TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 训练记录
CREATE TABLE IF NOT EXISTS trainings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  coach_id INTEGER REFERENCES users(id),
  training_date TEXT NOT NULL,
  duration_minutes INTEGER,
  type TEXT NOT NULL DEFAULT 'private',
  focus_area TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI 反馈报告
CREATE TABLE IF NOT EXISTS ai_feedback_reports (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  report_type TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  questionnaire_data TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 照片
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  photo_type TEXT NOT NULL DEFAULT 'progress',
  file_path TEXT NOT NULL,
  taken_at TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 问卷提交
CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  age REAL,
  height REAL,
  weight REAL,
  avg_sleep REAL,
  name TEXT NOT NULL,
  occupation TEXT,
  work_status TEXT,
  exercise_frequency TEXT,
  main_concern TEXT,
  edema TEXT,
  fatigue TEXT,
  shoulder_neck_pain TEXT,
  back_pain TEXT,
  low_energy TEXT,
  constipation TEXT,
  sedentary TEXT,
  anxiety TEXT,
  bedtime TEXT,
  breakfast TEXT,
  lunch TEXT,
  dinner TEXT,
  takeout TEXT,
  sugary_drinks TEXT,
  late_snack TEXT,
  binge_time TEXT,
  diet_history TEXT,
  water_intake TEXT,
  cravings TEXT,
  menstrual_regular TEXT,
  menstrual_binge TEXT,
  menstrual_edema TEXT,
  desired_state TEXT,
  commitment TEXT
);

-- Portal 使用追踪
CREATE TABLE IF NOT EXISTS portal_usage_logs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  event TEXT NOT NULL,
  page TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员 Session
CREATE TABLE IF NOT EXISTS member_sessions (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 管理员 Session
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 短信验证码
CREATE TABLE IF NOT EXISTS sms_codes (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
