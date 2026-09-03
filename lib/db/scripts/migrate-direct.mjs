/**
 * Direct migration script — bypasses drizzle-kit's TTY requirement.
 * Drops all public tables and recreates them with the current Drizzle schema.
 * Safe because there is no real production data yet.
 */
import pg from "pg";

const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!rawUrl) throw new Error("SUPABASE_DATABASE_URL must be set");

const url = rawUrl.includes("pgbouncer=true")
  ? rawUrl
  : rawUrl.includes("?")
  ? `${rawUrl}&pgbouncer=true`
  : `${rawUrl}?pgbouncer=true`;

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

// ─── Step 1: drop everything in the public schema (CASCADE handles FKs) ──────
const DROP_STATEMENTS = [
  // Old tables (not in current schema)
  `DROP TABLE IF EXISTS "disputes" CASCADE`,
  `DROP TABLE IF EXISTS "drivers" CASCADE`,
  `DROP TABLE IF EXISTS "payouts" CASCADE`,
  `DROP TABLE IF EXISTS "push_notifications" CASCADE`,
  `DROP TABLE IF EXISTS "subscription_plans" CASCADE`,
  `DROP TABLE IF EXISTS "transactions" CASCADE`,
  // Current tables — leaf nodes first, then parents
  `DROP TABLE IF EXISTS "maintenance_records" CASCADE`,
  `DROP TABLE IF EXISTS "garage_momo_accounts" CASCADE`,
  `DROP TABLE IF EXISTS "kpay_payments" CASCADE`,
  `DROP TABLE IF EXISTS "certification_requests" CASCADE`,
  `DROP TABLE IF EXISTS "messages" CASCADE`,
  `DROP TABLE IF EXISTS "conversations" CASCADE`,
  `DROP TABLE IF EXISTS "notifications" CASCADE`,
  `DROP TABLE IF EXISTS "favorites" CASCADE`,
  `DROP TABLE IF EXISTS "reviews" CASCADE`,
  `DROP TABLE IF EXISTS "garage_photos" CASCADE`,
  `DROP TABLE IF EXISTS "garages" CASCADE`,
  `DROP TABLE IF EXISTS "sessions" CASCADE`,
  `DROP TABLE IF EXISTS "users" CASCADE`,
];

// ─── Step 2: create all tables with the correct Drizzle schema ────────────────
const CREATE_STATEMENTS = [
  // ── sessions (Replit Auth) ────────────────────────────────────────────────
  `CREATE TABLE "sessions" (
    "sid"    varchar PRIMARY KEY,
    "sess"   jsonb   NOT NULL,
    "expire" timestamp NOT NULL
  )`,
  `CREATE INDEX "IDX_session_expire" ON "sessions" ("expire")`,

  // ── users ─────────────────────────────────────────────────────────────────
  // id = varchar so Google's numeric sub (e.g. "116957685274997982199") fits
  `CREATE TABLE "users" (
    "id"                    varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "email"                 varchar UNIQUE,
    "first_name"            varchar,
    "last_name"             varchar,
    "profile_image_url"     varchar,
    "phone"                 varchar,
    "account_type"          varchar NOT NULL DEFAULT 'client',
    "onboarding_completed"  boolean NOT NULL DEFAULT false,
    "created_at"            timestamptz NOT NULL DEFAULT now(),
    "updated_at"            timestamptz NOT NULL DEFAULT now()
  )`,

  // ── garages ───────────────────────────────────────────────────────────────
  `CREATE TABLE "garages" (
    "id"                   serial PRIMARY KEY,
    "owner_id"             varchar NOT NULL UNIQUE REFERENCES "users"("id"),
    "name"                 varchar NOT NULL,
    "neighborhood"         varchar NOT NULL,
    "address"              varchar NOT NULL,
    "phone"                varchar NOT NULL,
    "whatsapp"             varchar,
    "description"          text,
    "cover_image_url"      varchar,
    "avatar_image_url"     varchar,
    "certified"            boolean NOT NULL DEFAULT false,
    "specialties"          jsonb NOT NULL DEFAULT '[]'::jsonb,
    "emergency_available"  boolean NOT NULL DEFAULT false,
    "average_repair_delay" varchar,
    "years_experience"     integer NOT NULL DEFAULT 0,
    "mechanics_count"      integer NOT NULL DEFAULT 0,
    "accepted_brands"      jsonb NOT NULL DEFAULT '[]'::jsonb,
    "opening_hours"        jsonb NOT NULL DEFAULT '[]'::jsonb,
    "created_at"           timestamptz NOT NULL DEFAULT now(),
    "updated_at"           timestamptz NOT NULL DEFAULT now()
  )`,

  // ── garage_photos ─────────────────────────────────────────────────────────
  `CREATE TABLE "garage_photos" (
    "id"         serial PRIMARY KEY,
    "garage_id"  integer NOT NULL REFERENCES "garages"("id") ON DELETE CASCADE,
    "url"        varchar NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,

  // ── reviews ───────────────────────────────────────────────────────────────
  `CREATE TABLE "reviews" (
    "id"                 serial PRIMARY KEY,
    "garage_id"          integer NOT NULL REFERENCES "garages"("id") ON DELETE CASCADE,
    "user_id"            varchar NOT NULL REFERENCES "users"("id"),
    "rating"             integer NOT NULL,
    "comment"            text,
    "quality_rating"     integer NOT NULL,
    "honesty_rating"     integer NOT NULL,
    "punctuality_rating" integer NOT NULL,
    "value_rating"       integer NOT NULL,
    "created_at"         timestamptz NOT NULL DEFAULT now()
  )`,

  // ── favorites ─────────────────────────────────────────────────────────────
  `CREATE TABLE "favorites" (
    "id"         serial PRIMARY KEY,
    "user_id"    varchar NOT NULL REFERENCES "users"("id"),
    "garage_id"  integer NOT NULL REFERENCES "garages"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("user_id", "garage_id")
  )`,

  // ── notifications ─────────────────────────────────────────────────────────
  `CREATE TABLE "notifications" (
    "id"         serial PRIMARY KEY,
    "user_id"    varchar NOT NULL REFERENCES "users"("id"),
    "type"       varchar NOT NULL,
    "target"     varchar NOT NULL DEFAULT 'client',
    "content"    text NOT NULL,
    "related_id" integer,
    "read"       boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,

  // ── conversations ─────────────────────────────────────────────────────────
  `CREATE TABLE "conversations" (
    "id"                   serial PRIMARY KEY,
    "garage_id"            integer NOT NULL REFERENCES "garages"("id") ON DELETE CASCADE,
    "client_id"            varchar NOT NULL REFERENCES "users"("id"),
    "last_message"         text,
    "last_message_at"      timestamptz,
    "client_unread_count"  integer NOT NULL DEFAULT 0,
    "garage_unread_count"  integer NOT NULL DEFAULT 0,
    "created_at"           timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("garage_id", "client_id")
  )`,

  // ── messages ──────────────────────────────────────────────────────────────
  `CREATE TABLE "messages" (
    "id"              serial PRIMARY KEY,
    "conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "sender_id"       varchar NOT NULL REFERENCES "users"("id"),
    "type"            varchar NOT NULL DEFAULT 'text',
    "content"         text NOT NULL,
    "created_at"      timestamptz NOT NULL DEFAULT now(),
    "read_at"         timestamptz
  )`,

  // ── certification_requests ────────────────────────────────────────────────
  `CREATE TABLE "certification_requests" (
    "id"            serial PRIMARY KEY,
    "user_id"       varchar NOT NULL REFERENCES "users"("id"),
    "document_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "status"        varchar NOT NULL DEFAULT 'pending',
    "created_at"    timestamptz NOT NULL DEFAULT now()
  )`,

  // ── kpay_payments ─────────────────────────────────────────────────────────
  `CREATE TABLE "kpay_payments" (
    "id"                    serial PRIMARY KEY,
    "external_id"           varchar NOT NULL UNIQUE,
    "transaction_id"        varchar,
    "status"                varchar NOT NULL DEFAULT 'PENDING',
    "amount"                numeric(12,2) NOT NULL,
    "provider"              varchar NOT NULL,
    "phone_number"          varchar NOT NULL,
    "description"           text NOT NULL,
    "client_id"             varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "garage_id"             integer REFERENCES "garages"("id") ON DELETE SET NULL,
    "paid_at"               timestamptz,
    "raw_webhook_payload"   jsonb,
    "gross_amount"          integer,
    "commission_amount"     integer DEFAULT 500,
    "net_amount"            integer,
    "payout_status"         text DEFAULT 'PENDING',
    "payout_transaction_id" text,
    "created_at"            timestamptz NOT NULL DEFAULT now(),
    "updated_at"            timestamptz NOT NULL DEFAULT now()
  )`,

  // ── garage_momo_accounts ──────────────────────────────────────────────────
  `CREATE TABLE "garage_momo_accounts" (
    "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "garage_id"    integer NOT NULL REFERENCES "garages"("id") ON DELETE CASCADE,
    "provider"     text NOT NULL,
    "phone_number" text NOT NULL,
    "is_verified"  boolean NOT NULL DEFAULT false,
    "verified_at"  timestamptz,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    "updated_at"   timestamptz NOT NULL DEFAULT now()
  )`,

  // ── maintenance_records ───────────────────────────────────────────────────
  `CREATE TABLE "maintenance_records" (
    "id"          serial PRIMARY KEY,
    "client_id"   varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "garage_id"   integer REFERENCES "garages"("id") ON DELETE SET NULL,
    "payment_id"  integer NOT NULL REFERENCES "kpay_payments"("id") ON DELETE CASCADE,
    "description" text NOT NULL,
    "amount"      numeric(12,2) NOT NULL,
    "recorded_at" timestamptz NOT NULL DEFAULT now(),
    "created_at"  timestamptz NOT NULL DEFAULT now()
  )`,
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("── Step 1: dropping old tables ──────────────────────────");
    for (const sql of DROP_STATEMENTS) {
      const name = sql.match(/"(\w+)"/)?.[1] ?? "?";
      process.stdout.write(`  DROP ${name} ... `);
      await client.query(sql);
      console.log("✓");
    }

    console.log("\n── Step 2: creating tables with correct schema ──────────");
    for (const sql of CREATE_STATEMENTS) {
      const name = sql.match(/"(\w+)"/)?.[1] ?? "?";
      process.stdout.write(`  CREATE ${name} ... `);
      await client.query(sql);
      console.log("✓");
    }

    // Verify key columns
    const check = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users','garages')
        AND column_name IN ('id','owner_id')
      ORDER BY table_name, column_name
    `);
    console.log("\n── Verification ─────────────────────────────────────────");
    console.log(JSON.stringify(check.rows, null, 2));
    console.log("\n✅ Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
