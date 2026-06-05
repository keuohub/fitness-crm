CREATE TABLE `ai_feedback_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`report_type` text NOT NULL,
	`content` text NOT NULL,
	`generated_at` text NOT NULL,
	`questionnaire_data` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE `daily_health_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`log_date` text NOT NULL,
	`weight` real,
	`sleep_hours` real,
	`stress_level` integer,
	`energy_level` integer,
	`pain_areas` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `member_memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`content` text,
	`structured_data` text,
	`memory_type` text DEFAULT 'note' NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_code` text,
	`name` text NOT NULL,
	`gender` text,
	`phone` text,
	`stage` text,
	`tags` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`freeze_status` text DEFAULT 'active',
	`freeze_start` text,
	`freeze_end` text,
	`joined_at` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL, `current_questionnaire_id` integer, birthday text, portal_code TEXT, portal_enabled INTEGER DEFAULT 0, portal_activated_at TEXT, phone_verified INTEGER DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`photo_type` text DEFAULT 'progress' NOT NULL,
	`file_path` text NOT NULL,
	`taken_at` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);
CREATE TABLE `trainings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`coach_id` integer,
	`training_date` text NOT NULL,
	`duration_minutes` integer,
	`type` text DEFAULT 'private' NOT NULL,
	`focus_area` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'coach' NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL, status TEXT DEFAULT 'active',
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE TABLE `questionnaire_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`submitted_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`age` real,
	`height` real,
	`weight` real,
	`avg_sleep` real,
	`name` text NOT NULL,
	`occupation` text,
	`work_status` text,
	`exercise_frequency` text,
	`main_concern` text,
	`edema` text,
	`fatigue` text,
	`shoulder_neck_pain` text,
	`back_pain` text,
	`low_energy` text,
	`constipation` text,
	`sedentary` text,
	`anxiety` text,
	`bedtime` text,
	`breakfast` text,
	`lunch` text,
	`dinner` text,
	`takeout` text,
	`sugary_drinks` text,
	`late_snack` text,
	`binge_time` text,
	`diet_history` text,
	`water_intake` text,
	`cravings` text,
	`menstrual_regular` text,
	`menstrual_binge` text,
	`menstrual_edema` text,
	`desired_state` text,
	`commitment` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `__new_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`member_code` text,
	`name` text NOT NULL,
	`gender` text,
	`phone` text,
	`stage` text,
	`tags` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`freeze_status` text DEFAULT 'active',
	`freeze_start` text,
	`freeze_end` text,
	`joined_at` text,
	`birthday` text,
	`current_questionnaire_id` integer,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_questionnaire_id`) REFERENCES `questionnaire_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			);
CREATE TABLE member_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')), FOREIGN KEY (member_id) REFERENCES members(id));
CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
CREATE TABLE sms_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_member_sessions_token ON member_sessions(token);
CREATE INDEX idx_member_sessions_member_id ON member_sessions(member_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);
