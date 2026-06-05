import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1, // Neon free tier limitation
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
