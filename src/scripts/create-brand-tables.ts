import { db, rawSql } from "@/db";
import { requireDbWriteGuard } from "./_db-write-guard";

requireDbWriteGuard("create-brand-tables", process.env.DATABASE_URL);

async function main() {
  console.log("Creating tables: monthly_stars, venue_items, team_members...");

  await rawSql`
    CREATE TABLE IF NOT EXISTS monthly_stars (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      tag TEXT,
      quote TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await rawSql`
    CREATE TABLE IF NOT EXISTS venue_items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await rawSql`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      bio TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  console.log("Tables created successfully in Neon database!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
