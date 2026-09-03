-- WapiGarage payment hardening migration
-- Safe to run once on Supabase SQL Editor. It does not delete or rewrite existing rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  client_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','pending','paid','failed','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  kpay_transaction_id VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_garage_idx ON invoices (garage_id);
CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices (client_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status);
CREATE INDEX IF NOT EXISTS invoices_expires_idx ON invoices (expires_at);

ALTER TABLE kpay_payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS kpay_payments_invoice_idx ON kpay_payments (invoice_id);

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_invoice_unique
  ON reviews (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- New application writes require invoice_id. Existing legacy rows are kept nullable
-- until they are reviewed and safely backfilled with real paid invoices.
