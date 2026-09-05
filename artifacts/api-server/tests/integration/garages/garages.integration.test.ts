import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db, conversationsTable, certificationRequestsTable, garagesTable, invoicesTable, sessionsTable, usersTable } from "@workspace/db";
import app from "../../../src/app";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL must target the isolated integration database");
let server: ReturnType<typeof app.listen>;
let baseUrl: string;
type Actor = { id: string; cookie: string };

async function resetDatabase() { await db.execute(sql`TRUNCATE TABLE kpay_payments, invoices, messages, notifications, conversations, certification_requests, garage_photos, garages, sessions, users RESTART IDENTITY CASCADE`); }
async function actor(accountType = "client"): Promise<Actor> { const id = `garage-${randomUUID()}`; const email = `${id}@integration.test`; const sid = randomUUID().replaceAll("-", ""); await db.insert(usersTable).values({ id, email, accountType }); await db.insert(sessionsTable).values({ sid, sess: { user: { id, email, firstName: accountType, lastName: "Test" }, access_token: "integration", provider: "google" }, expire: new Date(Date.now() + 3600000) }); return { id, cookie: `sid=${sid}` }; }
async function garage(ownerId: string, certified = false, name = "Garage Test") { const [row] = await db.insert(garagesTable).values({ ownerId, name, neighborhood: "Centre", address: "1 rue des Garages", phone: "+242060000005", certified, averageRepairDelay: "1_3h" }).returning(); return row; }
async function request(path: string, init: RequestInit = {}, user?: Actor) { const headers = new Headers(init.headers); if (user) headers.set("cookie", user.cookie); const response = await fetch(`${baseUrl}${path}`, { ...init, headers }); return { response, body: await response.json().catch(() => null) }; }

describe("Garages — intégration PostgreSQL", { concurrency: false }, () => {
  before(async () => { server = app.listen(0); await new Promise<void>(r => server.once("listening", r)); const address = server.address(); if (!address || typeof address === "string") throw new Error("server did not start"); baseUrl = `http://127.0.0.1:${address.port}`; });
  beforeEach(resetDatabase);
  after(async () => { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await db.$client.end(); });

  it("réserve la demande de certification au propriétaire d’un garage", async () => {
    const owner = await actor("garage_pro"); const client = await actor(); await garage(owner.id);
    const denied = await request("/api/certification-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentUrls: ["/objects/doc.png"] }) }, client);
    const allowed = await request("/api/certification-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentUrls: ["/objects/doc.png"] }) }, owner);
    assert.equal(denied.response.status, 403); assert.equal(allowed.response.status, 201);
    const rows = await db.select().from(certificationRequestsTable); assert.equal(rows.length, 1); assert.equal(rows[0].userId, owner.id);
  });

  it("réserve la modification du profil au propriétaire", async () => {
    const owner = await actor("garage_pro"); const other = await actor("garage_pro"); const client = await actor(); const row = await garage(owner.id);
    const body = { name: "Garage Modifié" };
    const ownerUpdate = await request(`/api/garages/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, owner);
    const otherUpdate = await request(`/api/garages/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, other);
    const clientUpdate = await request(`/api/garages/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, client);
    assert.equal(ownerUpdate.response.status, 200); assert.equal(otherUpdate.response.status, 403); assert.equal(clientUpdate.response.status, 403);
    const [saved] = await db.select().from(garagesTable).where(eq(garagesTable.id, row.id)); assert.equal(saved.name, "Garage Modifié");
  });

  it("masque un garage non certifié de la recherche publique mais le conserve pour son propriétaire", async () => {
    const owner = await actor("garage_pro"); const row = await garage(owner.id, false, "Garage Non Certifié");
    const publicSearch = await request("/api/garages"); const mine = await request("/api/garages/mine", {}, owner);
    assert.equal(publicSearch.response.status, 200); assert.equal(publicSearch.body.some((g: { id: number }) => g.id === row.id), false);
    assert.equal(mine.response.status, 200); assert.equal(mine.body.id, row.id); assert.equal(mine.body.certified, false);
  });

  it("isole les données de gestion entre garages", async () => {
    const ownerA = await actor("garage_pro"); const ownerB = await actor("garage_pro"); const client = await actor(); const garageA = await garage(ownerA.id, true, "Garage A"); const garageB = await garage(ownerB.id, true, "Garage B");
    const [conversation] = await db.insert(conversationsTable).values({ garageId: garageA.id, clientId: client.id }).returning();
    const [invoice] = await db.insert(invoicesTable).values({ garageId: garageA.id, clientId: client.id, conversationId: conversation.id, amount: 22000, currency: "XAF", description: "Gestion A", status: "pending", expiresAt: new Date(Date.now() + 3600000) }).returning();
    const otherInvoice = await request(`/api/invoices/${invoice.id}`, {}, ownerB);
    const otherConversation = await request(`/api/conversations/${conversation.id}/messages`, {}, ownerB);
    const ownGarage = await request(`/api/garages/${garageB.id}`, {}, ownerB);
    assert.equal(otherInvoice.response.status, 403); assert.equal(otherConversation.response.status, 403); assert.equal(ownGarage.response.status, 200);
  });
});
