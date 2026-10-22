import { neon } from "@neondatabase/serverless";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const sql = neon((env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("migrate-s2-cards", (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
await sql`ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
await sql`ALTER TABLE card_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_member_card_idem
  ON member_cards(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_tx_idem
  ON card_transactions(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`;
console.log("S2 migration done");
