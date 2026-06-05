import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";

// ── 租户 ──
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 用户（教练/员工） ──
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("coach"),
  status: text("status").default("active"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 会员 ──
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberCode: text("member_code"),
  name: text("name").notNull(),
  gender: text("gender"),
  phone: text("phone"),
  phoneVerified: integer("phone_verified").default(0),
  stage: text("stage"),
  tags: text("tags"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  freezeStatus: text("freeze_status").default("active"),
  freezeStart: text("freeze_start"),
  freezeEnd: text("freeze_end"),
  joinedAt: text("joined_at"),
  birthday: text("birthday"),
  portalCode: text("portal_code").unique(),
  portalEnabled: integer("portal_enabled").default(0),
  portalActivatedAt: text("portal_activated_at"),
  currentQuestionnaireId: integer("current_questionnaire_id"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 会员记忆 ──
export const memberMemories = pgTable("member_memories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  content: text("content"),
  structuredData: text("structured_data"),
  memoryType: text("memory_type").notNull().default("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 每日健康日志 ──
export const dailyHealthLogs = pgTable("daily_health_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  logDate: text("log_date").notNull(),
  weight: real("weight"),
  sleepHours: real("sleep_hours"),
  stressLevel: integer("stress_level"),
  energyLevel: integer("energy_level"),
  painAreas: text("pain_areas"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 训练记录 ──
export const trainings = pgTable("trainings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  coachId: integer("coach_id").references(() => users.id),
  trainingDate: text("training_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  type: text("type").notNull().default("private"),
  focusArea: text("focus_area"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── AI 反馈报告 ──
export const aiFeedbackReports = pgTable("ai_feedback_reports", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  reportType: text("report_type").notNull(),
  content: text("content").notNull(),
  generatedAt: text("generated_at").notNull(),
  questionnaireData: text("questionnaire_data"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 照片 ──
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  photoType: text("photo_type").notNull().default("progress"),
  filePath: text("file_path").notNull(),
  takenAt: text("taken_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 问卷提交记录 ──
export const questionnaireSubmissions = pgTable("questionnaire_submissions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  submittedAt: timestamp("submitted_at", { mode: "string" }).notNull().defaultNow(),
  age: real("age"),
  height: real("height"),
  weight: real("weight"),
  avgSleep: real("avg_sleep"),
  name: text("name").notNull(),
  occupation: text("occupation"),
  workStatus: text("work_status"),
  exerciseFrequency: text("exercise_frequency"),
  mainConcern: text("main_concern"),
  edema: text("edema"),
  fatigue: text("fatigue"),
  shoulderNeckPain: text("shoulder_neck_pain"),
  backPain: text("back_pain"),
  lowEnergy: text("low_energy"),
  constipation: text("constipation"),
  sedentary: text("sedentary"),
  anxiety: text("anxiety"),
  bedtime: text("bedtime"),
  breakfast: text("breakfast"),
  lunch: text("lunch"),
  dinner: text("dinner"),
  takeout: text("takeout"),
  sugaryDrinks: text("sugary_drinks"),
  lateSnack: text("late_snack"),
  bingeTime: text("binge_time"),
  dietHistory: text("diet_history"),
  waterIntake: text("water_intake"),
  cravings: text("cravings"),
  menstrualRegular: text("menstrual_regular"),
  menstrualBinge: text("menstrual_binge"),
  menstrualEdema: text("menstrual_edema"),
  desiredState: text("desired_state"),
  commitment: text("commitment"),
});

// ── Portal 使用追踪 ──
export const portalUsageLogs = pgTable("portal_usage_logs", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  event: text("event").notNull(),
  page: text("page"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 会员 Session ──
export const memberSessions = pgTable("member_sessions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 管理员 Session ──
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 短信验证码 ──
export const smsCodes = pgTable("sms_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  used: integer("used").default(0),
  expiresAt: text("expires_at").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
