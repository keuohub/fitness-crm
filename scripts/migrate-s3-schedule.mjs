import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("migrate-s3-schedule", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
await sql`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS template_id INTEGER`;
await sql`CREATE INDEX IF NOT EXISTS idx_sessions_template ON class_sessions(template_id)`;
console.log("S3 migration done");
