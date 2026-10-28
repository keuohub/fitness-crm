import { rawSql } from "@/db";

let ready: Promise<void> | null = null;

export function ensureGrowthSchema() {
  if (!ready) {
    ready = (async () => {
      await rawSql`
        CREATE TABLE IF NOT EXISTS body_measurements (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL DEFAULT 1,
          member_id INTEGER NOT NULL,
          measured_on TEXT NOT NULL,
          weight_kg REAL,
          waist_cm REAL,
          hip_cm REAL,
          bust_cm REAL,
          thigh_cm REAL,
          note TEXT,
          recorded_by INTEGER,
          recorded_role TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`;
      await rawSql`CREATE INDEX IF NOT EXISTS idx_measurements_member ON body_measurements(member_id, measured_on)`;
      await rawSql`ALTER TABLE members ADD COLUMN IF NOT EXISTS privacy_consent_at TEXT`;
      await rawSql`ALTER TABLE members ADD COLUMN IF NOT EXISTS terms_version TEXT`;
      await rawSql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
