import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

await db.execute(`
  CREATE TABLE IF NOT EXISTS deletion_reasons (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    reason VARCHAR(120) NOT NULL,
    reason_detail TEXT,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

console.log("✓ Table deletion_reasons créée (ou déjà existante).");
await pool.end();
