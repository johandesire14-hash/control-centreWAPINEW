import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("../lib/db/node_modules/pg");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  const duplicateActive = await client.query(`
    SELECT garage_id, client_id, COUNT(*)::int AS count
    FROM invoices
    WHERE status IN ('issued', 'pending')
    GROUP BY garage_id, client_id
    HAVING COUNT(*) > 1
  `);
  if (duplicateActive.rows.length > 0) {
    console.error(JSON.stringify({ error: "duplicate_active_invoices", rows: duplicateActive.rows }));
    process.exitCode = 2;
  } else {
    await client.query("BEGIN");
    await client.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS conversation_id integer");
    await client.query("ALTER TABLE kpay_payments ADD COLUMN IF NOT EXISTS invoice_id uuid");
    await client.query("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS invoice_id uuid");
    await client.query("CREATE INDEX IF NOT EXISTS invoices_conversation_idx ON invoices (conversation_id)");
    await client.query("CREATE INDEX IF NOT EXISTS kpay_payments_invoice_idx ON kpay_payments (invoice_id)");
    await client.query("CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_active_pair_idx ON invoices (garage_id, client_id) WHERE status IN ('issued', 'pending')");
    await client.query("CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_invoice_idx ON reviews (invoice_id) WHERE invoice_id IS NOT NULL");
    await client.query("COMMIT");
    console.log(JSON.stringify({ ok: true, migration: "invoice-flow-additive", duplicateActive: 0 }));
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally {
  await client.end();
}
