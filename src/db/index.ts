import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

// Neon requires SSL, and channel_binding=require can cause issues with some pg versions
const cleanUrl = DATABASE_URL.replace("channel_binding=require&", "");

const pool = new Pool({
  connectionString: cleanUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
