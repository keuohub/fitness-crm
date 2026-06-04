import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── 租户 ──
export const tenants = sqliteTable("tenants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 用户（教练/员工） ──
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("coach"),
  status: text("status").default("active"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 会员 ──
export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberCode: text("member_code"), // 对应飞书的 memberCode
  name: text("name").notNull(),
  gender: text("gender"), // male | female
  phone: text("phone"),
  phoneVerified: integer("phone_verified").default(0),
  stage: text("stage"), // 对应飞书的 stage
  tags: text("tags"), // JSON 数组字符串，如 ["腰痛","产后","体态矫正"]
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | inactive | archived
  freezeStatus: text("freeze_status").default("active"), // active | frozen
  freezeStart: text("freeze_start"),
  freezeEnd: text("freeze_end"),
  joinedAt: text("joined_at"),
  birthday: text("birthday"), // YYYY-MM-DD
  portalCode: text("portal_code").unique(),
  portalEnabled: integer("portal_enabled").default(0),
  portalActivatedAt: text("portal_activated_at"),
  currentQuestionnaireId: integer("current_questionnaire_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 会员记忆（叙事记忆 + 结构化记忆） ──
export const memberMemories = sqliteTable("member_memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  content: text("content"), // 叙事记忆：自然语言长文本
  structuredData: text("structured_data"), // 结构化记忆：JSON 字符串，存 key-value
  memoryType: text("memory_type").notNull().default("note"), // note | milestone | preference | ai_summary
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 每日健康日志 ──
export const dailyHealthLogs = sqliteTable("daily_health_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  logDate: text("log_date").notNull(), // YYYY-MM-DD
  weight: real("weight"), // kg
  sleepHours: real("sleep_hours"),
  stressLevel: integer("stress_level"), // 1-5
  energyLevel: integer("energy_level"), // 1-5
  painAreas: text("pain_areas"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 训练记录 ──
export const trainings = sqliteTable("trainings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  coachId: integer("coach_id").references(() => users.id),
  trainingDate: text("training_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  type: text("type").notNull().default("private"), // private | group | assessment
  focusArea: text("focus_area"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── AI 反馈报告 ──
export const aiFeedbackReports = sqliteTable("ai_feedback_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  reportType: text("report_type").notNull(), // initial_assessment | weekly | monthly
  content: text("content").notNull(),
  generatedAt: text("generated_at").notNull(),
  questionnaireData: text("questionnaire_data"), // JSON string
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 照片 ──
export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  photoType: text("photo_type").notNull().default("progress"), // body | posture | progress
  filePath: text("file_path").notNull(),
  takenAt: text("taken_at"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 问卷提交记录 ──
export const questionnaireSubmissions = sqliteTable("questionnaire_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  submittedAt: text("submitted_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  // ── 基本信息（real 类型）──
  age: real("age"),
  height: real("height"),
  weight: real("weight"),
  avgSleep: real("avg_sleep"),
  // ── 问卷文本字段 ──
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
export const portalUsageLogs = sqliteTable("portal_usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  event: text("event").notNull(), // page_view | login | share | feedback
  page: text("page"), // /portal, /portal/growth, etc.
  durationSeconds: integer("duration_seconds"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 会员 Session ──
export const memberSessions = sqliteTable("member_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 管理员 Session ──
export const adminSessions = sqliteTable("admin_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});

// ── 短信验证码 ──
export const smsCodes = sqliteTable("sms_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  used: integer("used").default(0),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
});
