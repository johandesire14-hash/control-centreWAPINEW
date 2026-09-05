import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import {
  conversationsTable,
  db,
  garagesTable,
  invoicesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import app from "../../../src/app";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL must target the isolated integration database");

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

type Actor = { id: string; cookie: string };

async function resetDatabase() {
  await db.execute(sql`TRUNCATE TABLE kpay_payments, invoices, conversations, garages, sessions, users RESTART IDENTITY CASCADE`);
}

async function createActor(accountType: "client" | "garage" = "client"): Promise<Actor> {
  const id = `invoice-${accountType}-${randomUUID()}`;
  await db.insert(usersTable).values({ id, email: `${id}@integration.test`, accountType });
  const sid = randomUUID().replaceAll("-", "");
  await db.insert(sessionsTable).values({
    sid,
    sess: { user: { id, email: `${id}@integration.test`, firstName: accountType, lastName: "Test", profileImageUrl: null }, access_token: "integration", provider: "google" },
    expire: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { id, cookie: `sid=${sid}` };
}

async function createGarage(ownerId: string, suffix = "A") {
  const [garage] = await db.insert(garagesTable).values({
    ownerId,
    name: `Garage ${suffix}`,
    neighborhood: "Centre",
    address: `${suffix} rue des Tests`,
    phone: "+242060000001",
  }).returning();
  return garage;
}

async function createConversation(garageId: number, clientId: string) {
  const [conversation] = await db.insert(conversationsTable).values({ garageId, clientId }).returning();
  return conversation;
}

async function request(path: string, init: RequestInit = {}, actor?: Actor) {
  const headers = new Headers(init.headers);
  if (actor) headers.set("cookie", actor.cookie);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  return { response, body };
}

describe("Factures — intégration PostgreSQL", () => {
  before(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Integration server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(resetDatabase);

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await db.$client.end();
  });

  it("crée une facture liée au bon client et au garage émetteur", async () => {
    const garageOwner = await createActor("garage");
    const client = await createActor();
    const garage = await createGarage(garageOwner.id);
    const conversation = await createConversation(garage.id, client.id);

    const { response, body } = await request(`/api/invoices/from-conversation/${conversation.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 24000, description: "Freins" }),
    }, garageOwner);

    assert.equal(response.status, 201);
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, body.invoiceId));
    assert.equal(invoice.clientId, client.id);
    assert.equal(invoice.garageId, garage.id);
    assert.equal(invoice.amount, 24000);
  });

  it("autorise un client à consulter sa propre facture", async () => {
    const garageOwner = await createActor("garage");
    const client = await createActor();
    const garage = await createGarage(garageOwner.id);
    const conversation = await createConversation(garage.id, client.id);
    const created = await request(`/api/invoices/from-conversation/${conversation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 15000, description: "Diagnostic" }) }, garageOwner);

    const { response, body } = await request(`/api/invoices/${created.body.invoiceId}`, {}, client);
    assert.equal(response.status, 200);
    assert.equal(body.invoiceId, created.body.invoiceId);
    assert.equal(body.amount, 15000);
  });

  it("refuse l’accès d’un client à la facture d’un autre client sans fuite", async () => {
    const garageOwner = await createActor("garage");
    const client = await createActor();
    const otherClient = await createActor();
    const garage = await createGarage(garageOwner.id);
    const conversation = await createConversation(garage.id, client.id);
    const created = await request(`/api/invoices/from-conversation/${conversation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 16000, description: "Pneus" }) }, garageOwner);

    const { response, body } = await request(`/api/invoices/${created.body.invoiceId}`, {}, otherClient);
    assert.ok([403, 404].includes(response.status));
    assert.equal(body.invoiceId, undefined);
    assert.equal(body.amount, undefined);
  });

  it("réserve l’annulation au garage émetteur", async () => {
    const garageOwner = await createActor("garage");
    const client = await createActor();
    const otherGarageOwner = await createActor("garage");
    const garage = await createGarage(garageOwner.id, "A");
    await createGarage(otherGarageOwner.id, "B");
    const conversation = await createConversation(garage.id, client.id);
    const created = await request(`/api/invoices/from-conversation/${conversation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 18000, description: "Batterie" }) }, garageOwner);
    const invoiceId = created.body.invoiceId;

    const clientCancel = await request(`/api/invoices/${invoiceId}`, { method: "DELETE" }, client);
    const otherGarageCancel = await request(`/api/invoices/${invoiceId}`, { method: "DELETE" }, otherGarageOwner);
    assert.equal(clientCancel.response.status, 403);
    assert.equal(otherGarageCancel.response.status, 403);

    const ownerCancel = await request(`/api/invoices/${invoiceId}`, { method: "DELETE" }, garageOwner);
    assert.equal(ownerCancel.response.status, 200);
    assert.equal(ownerCancel.body.status, "cancelled");
  });

  it("bloque l’annulation d’une facture déjà payée", async () => {
    const garageOwner = await createActor("garage");
    const client = await createActor();
    const garage = await createGarage(garageOwner.id);
    const conversation = await createConversation(garage.id, client.id);
    const created = await request(`/api/invoices/from-conversation/${conversation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 20000, description: "Entretien" }) }, garageOwner);
    await db.update(invoicesTable).set({ status: "paid", paidAt: new Date() }).where(eq(invoicesTable.id, created.body.invoiceId));

    const cancel = await request(`/api/invoices/${created.body.invoiceId}`, { method: "DELETE" }, garageOwner);
    const modify = await request(`/api/invoices/${created.body.invoiceId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 21000 }) }, garageOwner);
    assert.equal(cancel.response.status, 409);
    assert.ok([404, 409].includes(modify.response.status));
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, created.body.invoiceId));
    assert.equal(invoice.status, "paid");
    assert.equal(invoice.amount, 20000);
  });
});
