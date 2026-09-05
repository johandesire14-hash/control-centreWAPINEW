import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql, eq } from "drizzle-orm";
import { db, garagesTable, invoicesTable, kpayPaymentsTable, notificationsTable, usersTable } from "@workspace/db";
import app from "../../../src/app";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
const WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET ?? "integration-test-secret";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must point to the isolated PostgreSQL integration database");
}

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      notifications,
      kpay_payments,
      invoices,
      garages,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function createFixture(amount = 12500) {
  const userId = `integration-client-${randomUUID()}`;
  const [user] = await db.insert(usersTable).values({
    id: userId,
    email: `${randomUUID()}@integration.test`,
    firstName: "Client",
    lastName: "Integration",
  }).returning();

  const [garage] = await db.insert(garagesTable).values({
    ownerId: userId,
    name: "Garage Integration",
    neighborhood: "Centre",
    address: "1 rue des Tests",
    phone: "+242060000001",
  }).returning();

  const [invoice] = await db.insert(invoicesTable).values({
    garageId: garage.id,
    clientId: user.id,
    amount,
    currency: "XAF",
    description: "Révision intégration",
    status: "pending",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  }).returning();

  const [payment] = await db.insert(kpayPaymentsTable).values({
    invoiceId: invoice.id,
    externalId: `EXT-${randomUUID()}`,
    amount: String(amount),
    provider: "MTN_MOMO_COG",
    phoneNumber: "+242060000001",
    description: "Révision intégration",
    clientId: user.id,
    garageId: garage.id,
    status: "PENDING",
  }).returning();

  return { invoice, payment };
}

async function postWebhook(payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/kpay/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kpay-webhook-secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as Record<string, unknown>;
  return { response, body };
}

describe("KPay webhook — PostgreSQL integration", { concurrency: false }, () => {
  before(async () => {
    process.env.KPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Integration server did not expose a TCP address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await db.$client.end();
  });

  it("paiement réussi : paie la facture et conserve exactement le montant attendu", async () => {
    const { invoice, payment } = await createFixture(12500);

    const { response, body } = await postWebhook({
      externalId: payment.externalId,
      transactionId: "TX-INTEGRATION-SUCCESS",
      status: "SUCCESS",
      amount: 12500,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(body, { accepted: true, paid: true, invoiceId: invoice.id });

    const [savedInvoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoice.id));
    const [savedPayment] = await db.select().from(kpayPaymentsTable).where(eq(kpayPaymentsTable.id, payment.id));
    assert.equal(savedInvoice.status, "paid");
    assert.equal(savedPayment.status, "SUCCESS");
    assert.equal(Number(savedPayment.amount), 12500);
    assert.equal(savedInvoice.kpayTransactionId, "TX-INTEGRATION-SUCCESS");
  });

  it("paiement refusé : conserve la facture impayée sans notification payée", async () => {
    const { invoice, payment } = await createFixture();

    const { response, body } = await postWebhook({
      externalId: payment.externalId,
      transactionId: "TX-INTEGRATION-FAILED",
      status: "FAILED",
      amount: 12500,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(body, { accepted: true, paid: false });

    const [savedInvoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoice.id));
    const [savedPayment] = await db.select().from(kpayPaymentsTable).where(eq(kpayPaymentsTable.id, payment.id));
    const notifications = await db.select().from(notificationsTable);
    assert.equal(savedInvoice.status, "pending");
    assert.equal(savedPayment.status, "FAILED");
    assert.equal(notifications.length, 0);
  });

  it("webhook dupliqué : ne traite l’événement et les notifications qu’une seule fois", async () => {
    const { invoice, payment } = await createFixture();
    const payload = {
      externalId: payment.externalId,
      transactionId: "TX-INTEGRATION-DUPLICATE",
      status: "SUCCESS",
      amount: 12500,
    };

    const first = await postWebhook(payload);
    const second = await postWebhook(payload);

    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200);
    assert.deepEqual(second.body, { accepted: true, duplicate: true, invoiceId: invoice.id });

    const [savedInvoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoice.id));
    const [savedPayment] = await db.select().from(kpayPaymentsTable).where(eq(kpayPaymentsTable.id, payment.id));
    const notifications = await db.select().from(notificationsTable);
    assert.equal(savedInvoice.status, "paid");
    assert.equal(savedPayment.status, "SUCCESS");
    assert.equal(notifications.length, 0);
  });

  it("montant modifié : rejette le webhook sans accepter silencieusement le paiement", async () => {
    const { invoice, payment } = await createFixture(12500);

    const { response, body } = await postWebhook({
      externalId: payment.externalId,
      transactionId: "TX-INTEGRATION-MISMATCH",
      status: "SUCCESS",
      amount: 13000,
    });

    assert.equal(response.status, 409);
    assert.deepEqual(body, { error: "Paiement confirmé mais facture expirée ou montant incohérent." });

    const [savedInvoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoice.id));
    const [savedPayment] = await db.select().from(kpayPaymentsTable).where(eq(kpayPaymentsTable.id, payment.id));
    const notifications = await db.select().from(notificationsTable);
    assert.equal(savedInvoice.status, "pending");
    assert.equal(savedPayment.status, "FAILED");
    assert.equal(notifications.length, 0);
  });
});
