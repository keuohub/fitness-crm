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
  loginPin: text("login_pin"),
  portalEnabled: integer("portal_enabled").default(0),
  portalActivatedAt: text("portal_activated_at"),
  currentQuestionnaireId: integer("current_questionnaire_id"),
  wechatOpenId: text("wechat_open_id").unique(),
  avatarUrl: text("avatar_url"),
  totalHours: integer("total_hours"),
  hoursPilates: integer("hours_pilates"),
  hoursEquipment: integer("hours_equipment"),
  hoursFatBurn: integer("hours_fat_burn"),
  hoursPrivate: integer("hours_private"),
  mentorName: text("mentor_name"),
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

// ── 照片对比 ──
export const photoComparisons = pgTable("photo_comparisons", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  photoId1: integer("photo_id_1")
    .references(() => photos.id),
  photoId2: integer("photo_id_2")
    .references(() => photos.id),
  analysis: text("analysis"),
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

// ── Demo 预约线索 ──
export const demoLeads = pgTable("demo_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  city: text("city"),
  studioName: text("studio_name"),
  memberScale: text("member_scale"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 训练感受 ──
export const trainingFeelings = pgTable("training_feelings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  trainingId: integer("training_id").references(() => trainings.id),
  feeling: text("feeling").notNull(),
  /** 小桥本人确认后才会写入这里。AI 生成的内容一律不进这个字段。 */
  xiaoqiaoReply: text("xiaoqiao_reply"),
  /** AI 起草的参考回复，仅后台可见，会员端不下发。 */
  aiDraft: text("ai_draft"),
  /** pending=待小桥回 / replied=小桥已回 / auto_legacy=改造前机器自动回的旧数据 */
  replyStatus: text("reply_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ── 课程预约 ──
export const courseBookings = pgTable("course_bookings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  courseType: text("course_type").notNull(),
  bookingDate: text("booking_date").notNull(),
  bookingTime: text("booking_time").notNull(),
  coachId: integer("coach_id").references(() => users.id).default(1),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 教练课后笔记 ======
export const coachNotes = pgTable("coach_notes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
  trainingId: integer("training_id").references(() => trainings.id),
  tags: text("tags"),          // JSON: ["动作进步","状态好","核心稳了"]
  coachNote: text("coach_note"), // 教练手写备注
  aiMessage: text("ai_message"), // AI生成的人文关怀鼓励语
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 月度之星 (Stars of Laiwu) ======
export const monthlyStars = pgTable("monthly_stars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  tag: text("tag"),
  quote: text("quote"),
  joinDays: integer("join_days"),
  trainCount: integer("train_count"),
  courseType: text("course_type"),
  journey: text("journey"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 场馆空间相册 (Venue & Space) ======
export const venueItems = pgTable("venue_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  name: text("name"),
  tag: text("tag"),
  desc: text("desc"),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 徕舞团队 (Team Laiwu) ======
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleTitle: text("role_title").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  bio: text("bio"),
  experience: text("experience"),
  creds: text("creds"),
  quote: text("quote"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 体系课程类目 (Course Offerings) ======
export const courseOfferings = pgTable("course_offerings", {
  id: serial("id").primaryKey(),
  num: text("num").notNull(),
  name: text("name").notNull(),
  enName: text("en_name").notNull(),
  summary: text("summary").notNull(),
  target: text("target").notNull(),
  highlight: text("highlight").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ====== 约课/会员卡系统（2026-10 新增） ======

export const courseCategories = pgTable("course_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  key: text("key").notNull(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  defaultCapacity: integer("default_capacity").notNull().default(6),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(10),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const cardTypes = pgTable("card_types", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  name: text("name").notNull(),
  category: text("category").notNull().default("count"), // period | count
  priceCents: integer("price_cents").notNull().default(0),
  validityDays: integer("validity_days"),
  weeklyLimit: integer("weekly_limit"),
  totalCount: integer("total_count"),
  freezeAllowed: integer("freeze_allowed").notNull().default(0),
  transferAllowed: integer("transfer_allowed").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const memberCards = pgTable("member_cards", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  memberId: integer("member_id").notNull(),
  cardTypeId: integer("card_type_id").notNull(),
  status: text("status").notNull().default("active"),
  totalCount: integer("total_count"),
  remainingCount: integer("remaining_count"),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  purchasedAt: text("purchased_at"),
  priceCents: integer("price_cents").notNull().default(0),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const cardTransactions = pgTable("card_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  memberCardId: integer("member_card_id").notNull(),
  memberId: integer("member_id").notNull(),
  bookingId: integer("booking_id"),
  type: text("type").notNull(), // purchase | deduct | refund | expire | adjust
  amount: integer("amount").notNull().default(0),
  balanceAfter: integer("balance_after"),
  note: text("note"),
  idempotencyKey: text("idempotency_key"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  templateId: integer("template_id"),
  courseCategoryId: integer("course_category_id").notNull(),
  coachId: integer("coach_id").notNull(),
  roomId: integer("room_id"),
  title: text("title"),
  sessionDate: text("session_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull().default(6),
  bookedCount: integer("booked_count").notNull().default(0),
  status: text("status").notNull().default("open"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  sessionId: integer("session_id").notNull(),
  memberId: integer("member_id").notNull(),
  status: text("status").notNull().default("booked"),
  idempotencyKey: text("idempotency_key"),
  bookedAt: timestamp("booked_at", { mode: "string" }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { mode: "string" }),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  sessionId: integer("session_id").notNull(),
  memberId: integer("member_id").notNull(),
  bookingId: integer("booking_id"),
  status: text("status").notNull().default("attended"),
  markedBy: integer("marked_by"),
  markedAt: timestamp("marked_at", { mode: "string" }).notNull().defaultNow(),
  note: text("note"),
});

export const postClassNotes = pgTable("post_class_notes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  sessionId: integer("session_id"),
  memberId: integer("member_id").notNull(),
  coachId: integer("coach_id"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  memberId: integer("member_id").notNull(),
  type: text("type").notNull(), // low_balance | inactive_30d | expiring | birthday
  status: text("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const studioSettings = pgTable("studio_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  key: text("key").notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  actorType: text("actor_type"),
  actorId: integer("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});


export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  courseId: integer("course_id").notNull(),
  coachId: integer("coach_id").notNull(),
  roomId: integer("room_id"),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull().default(6),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
