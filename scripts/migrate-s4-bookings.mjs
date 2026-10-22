import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("migrate-s4-bookings", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_idem
  ON bookings(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`;
console.log("S4 migration done");
