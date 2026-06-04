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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	`birthday` text,
	`current_questionnaire_id` integer,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_questionnaire_id`) REFERENCES `questionnaire_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'coach' NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);