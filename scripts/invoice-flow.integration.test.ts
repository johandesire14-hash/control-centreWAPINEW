import test from "node:test";
import assert from "node:assert/strict";
import {
  canAcceptInvoicePayment,
  canCreateInvoice,
  canSubmitInvoiceReview,
  getInvoiceExpiry,
  isSuccessfulKpayStatus,
} from "../artifacts/api-server/src/lib/invoiceFlowRules.ts";

const createdAt = new Date("2026-08-21T10:00:00.000Z");
const activeInvoice = {
  status: "pending",
  expiresAt: getInvoiceExpiry(createdAt),
  amount: 25000,
  clientId: "client-jean",
};

test("une facture expire exactement dix minutes après sa création", () => {
  assert.equal(getInvoiceExpiry(createdAt).toISOString(), "2026-08-21T10:10:00.000Z");
  assert.equal(canCreateInvoice(activeInvoice, new Date("2026-08-21T10:09:59.999Z")), false);
  assert.equal(canCreateInvoice(activeInvoice, new Date("2026-08-21T10:10:00.000Z")), true);
});

test("une seconde facture active est refusée mais une facture expirée libère le couple", () => {
  assert.equal(canCreateInvoice(activeInvoice, new Date("2026-08-21T10:05:00.000Z")), false);
  assert.equal(canCreateInvoice({ ...activeInvoice, expiresAt: new Date("2026-08-21T09:59:00.000Z") }, createdAt), true);
  assert.equal(canCreateInvoice(null, createdAt), true);
});

test("le paiement utilise le montant serveur et refuse une facture expirée ou déjà payée", () => {
  assert.deepEqual(canAcceptInvoicePayment(activeInvoice, 25000, new Date("2026-08-21T10:05:00.000Z")), { ok: true });
  assert.deepEqual(canAcceptInvoicePayment(activeInvoice, 100, new Date("2026-08-21T10:05:00.000Z")), { ok: false, reason: "amount_mismatch" });
  assert.deepEqual(canAcceptInvoicePayment(activeInvoice, 25000, new Date("2026-08-21T10:10:00.000Z")), { ok: false, reason: "expired_or_closed" });
  assert.deepEqual(canAcceptInvoicePayment({ ...activeInvoice, status: "paid" }, 25000, new Date("2026-08-21T10:05:00.000Z")), { ok: false, reason: "already_paid" });
});

test("seul le client de la facture payée peut publier un avis une fois", () => {
  const paid = { ...activeInvoice, status: "paid" };
  assert.deepEqual(canSubmitInvoiceReview(paid, "client-jean", false), { ok: true });
  assert.deepEqual(canSubmitInvoiceReview(paid, "client-soeur", false), { ok: false, reason: "not_invoice_client" });
  assert.deepEqual(canSubmitInvoiceReview(activeInvoice, "client-jean", false), { ok: false, reason: "invoice_not_paid" });
  assert.deepEqual(canSubmitInvoiceReview(paid, "client-jean", true), { ok: false, reason: "already_reviewed" });
});

test("les statuts KPay de succès sont reconnus et les autres ne le sont pas", () => {
  assert.equal(isSuccessfulKpayStatus("confirmed"), true);
  assert.equal(isSuccessfulKpayStatus("SUCCESS"), true);
  assert.equal(isSuccessfulKpayStatus("pending"), false);
  assert.equal(isSuccessfulKpayStatus("failed"), false);
});
