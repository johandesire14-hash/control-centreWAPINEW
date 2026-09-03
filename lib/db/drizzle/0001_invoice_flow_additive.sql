-- WapiGarage: flux demande -> facture -> paiement -> avis
-- Exécuter dans le SQL Editor Supabase après vérification des doublons actifs.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS conversation_id integer;
ALTER TABLE kpay_payments ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS invoice_id uuid;

CREATE INDEX IF NOT EXISTS invoices_conversation_idx ON invoices (conversation_id);
CREATE INDEX IF NOT EXISTS kpay_payments_invoice_idx ON kpay_payments (invoice_id);

-- Une seule facture active par couple pro-client.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_active_pair_idx
  ON invoices (garage_id, client_id)
  WHERE status IN ('issued', 'pending');

-- Un seul avis par facture.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_invoice_idx
  ON reviews (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Liens référentiels ajoutés uniquement si absents.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_conversation_id_fk') THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_conversation_id_fk
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpay_payments_invoice_id_fk') THEN
    ALTER TABLE kpay_payments
      ADD CONSTRAINT kpay_payments_invoice_id_fk
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_invoice_id_fk') THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_invoice_id_fk
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
  END IF;
END $$;
