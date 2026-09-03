import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const rawConnectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set. Did you forget to add your Supabase connection string?",
  );
}

// PgBouncer (Supabase transaction-mode pooler, port 6543) doesn't support
// named prepared statements. Adding ?pgbouncer=true instructs the pg driver
// to use the simple query protocol, which is pooler-safe.
const connectionString = rawConnectionString.includes("pgbouncer=true")
  ? rawConnectionString
  : rawConnectionString.includes("?")
    ? `${rawConnectionString}&pgbouncer=true`
    : `${rawConnectionString}?pgbouncer=true`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
