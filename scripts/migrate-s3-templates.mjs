import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("migrate-s3-templates", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
await sql`CREATE TABLE IF NOT EXISTS schedule_templates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  course_id INTEGER NOT NULL,
  coach_id INTEGER NOT NULL,
  room_id INTEGER,
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6,
  effective_from TEXT,
  effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_templates_weekday ON schedule_templates(tenant_id, weekday)`;
console.log("schedule_templates created");
