import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const invoicesRoute = read("artifacts/api-server/src/routes/invoices.ts");
const kpayRoute = read("artifacts/api-server/src/routes/kpay.ts");
const reviewsRoute = read("artifacts/api-server/src/routes/reviews.ts");
const invoiceScreen = read("artifacts/mobile/app/(garage)/invoice.tsx");
const conversationScreen = read("artifacts/mobile/app/conversation/[id].tsx");
const accountScreen = read("artifacts/mobile/app/(tabs)/account.tsx");
const migration = read("lib/db/drizzle/0001_invoice_flow_additive.sql");
const migrationScript = read("scripts/check-and-migrate-invoice-flow.mjs");

test("la facture créée depuis une conversation rattache le client et expire après dix minutes", () => {
  assert.match(invoicesRoute, /from-conversation\/:conversationId/);
  assert.match(invoicesRoute, /getInvoiceExpiry\(now\)/);
  assert.match(invoicesRoute, /clientId: conversation\.conversation\.clientId/);
  assert.match(invoicesRoute, /Une facture est déjà en attente/);
});

test("le paiement KPay recharge le montant depuis invoiceId", () => {
  assert.match(kpayRoute, /const invoiceId = typeof req\.body\?\.invoiceId/);
  assert.match(kpayRoute, /amount: invoice\.amount/);
  assert.doesNotMatch(kpayRoute, /const \{ amount, externalId, description \} = req\.body/);
  assert.match(kpayRoute, /Cette facture a expiré/);
});

test("le webhook est protégé et idempotent", () => {
  assert.match(kpayRoute, /x-kpay-webhook-secret/);
  assert.match(kpayRoute, /duplicate: true/);
  assert.match(kpayRoute, /Number\(payment\.amount\) !== Number\(invoice\.amount\)/);
});

test("un avis exige une facture payée du client", () => {
  assert.match(reviewsRoute, /canSubmitInvoiceReview\(invoice, req\.user\.id/);
  assert.match(reviewsRoute, /invoice_not_paid/);
  assert.match(reviewsRoute, /Un avis existe déjà pour cette facture/);
});

test("le mobile utilise le libellé Pro et ouvre la facture depuis la conversation", () => {
  assert.match(accountScreen, /Passer en mode Pro/);
  assert.doesNotMatch(accountScreen, /Passer en mode Garage/);
  assert.match(conversationScreen, /conversationId: String\(conversationId\)/);
  assert.match(invoiceScreen, /JSON\.stringify\(\{ invoiceId: created\.invoiceId \}\)/);
  assert.doesNotMatch(invoiceScreen, /garageId=\$\{garageId\}.*amount=\$\{amount\}/s);
});

test("la migration protège contre deux factures actives et deux avis pour une facture", () => {
  assert.match(migrationScript, /invoices_one_active_pair_idx/);
  assert.match(migrationScript, /reviews_one_invoice_idx/);
  assert.match(migration, /invoice_id uuid/);
  assert.match(migration, /conversation_id integer/);
});
