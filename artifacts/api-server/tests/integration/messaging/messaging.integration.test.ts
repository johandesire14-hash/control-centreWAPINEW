import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db, conversationsTable, garagesTable, messagesTable, notificationsTable, sessionsTable, usersTable } from "@workspace/db";
import app from "../../../src/app";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL must target the isolated integration database");
let server: ReturnType<typeof app.listen>;
let baseUrl: string;

type Actor = { id: string; cookie: string };
async function resetDatabase() { await db.execute(sql`TRUNCATE TABLE notifications, messages, conversations, garages, sessions, users RESTART IDENTITY CASCADE`); }
async function actor(accountType = "client"): Promise<Actor> {
  const id = `msg-${randomUUID()}`; const email = `${id}@integration.test`; const sid = randomUUID().replaceAll("-", "");
  await db.insert(usersTable).values({ id, email, accountType });
  await db.insert(sessionsTable).values({ sid, sess: { user: { id, email, firstName: accountType, lastName: "Test" }, access_token: "integration", provider: "google" }, expire: new Date(Date.now() + 3600000) });
  return { id, cookie: `sid=${sid}` };
}
async function fixture() {
  const client = await actor(); const owner = await actor("garage_pro"); const outsider = await actor();
  const [garage] = await db.insert(garagesTable).values({ ownerId: owner.id, name: "Garage Messages", neighborhood: "Centre", address: "1 rue des Messages", phone: "+242060000003" }).returning();
  const [otherGarage] = await db.insert(garagesTable).values({ ownerId: outsider.id, name: "Autre Garage", neighborhood: "Nord", address: "2 rue des Messages", phone: "+242060000004" }).returning();
  const [conversation] = await db.insert(conversationsTable).values({ garageId: garage.id, clientId: client.id }).returning();
  const [otherConversation] = await db.insert(conversationsTable).values({ garageId: otherGarage.id, clientId: outsider.id }).returning();
  return { client, owner, outsider, garage, conversation, otherConversation };
}
async function request(path: string, init: RequestInit = {}, user?: Actor) { const headers = new Headers(init.headers); if (user) headers.set("cookie", user.cookie); const response = await fetch(`${baseUrl}${path}`, { ...init, headers }); return { response, body: await response.json().catch(() => null) }; }

describe("Messagerie — intégration PostgreSQL", { concurrency: false }, () => {
  before(async () => { server = app.listen(0); await new Promise<void>(r => server.once("listening", r)); const address = server.address(); if (!address || typeof address === "string") throw new Error("server did not start"); baseUrl = `http://127.0.0.1:${address.port}`; });
  beforeEach(resetDatabase);
  after(async () => { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await db.$client.end(); });

  it("limite la lecture aux conversations dont l’utilisateur est participant", async () => {
    const { client, owner, outsider, conversation, otherConversation } = await fixture();
    const own = await request(`/api/conversations/${conversation.id}/messages`, {}, client);
    const other = await request(`/api/conversations/${otherConversation.id}/messages`, {}, client);
    const ownerRead = await request(`/api/conversations/${conversation.id}/messages`, {}, owner);
    assert.equal(own.response.status, 200); assert.equal(ownerRead.response.status, 200); assert.equal(other.response.status, 403); assert.equal(other.body.error, "Not a participant in this conversation");
    assert.notEqual(outsider.id, client.id);
  });

  it("autorise uniquement l’auteur à supprimer un message, qui disparaît pour les deux parties", async () => {
    const { client, owner, conversation } = await fixture();
    const sent = await request(`/api/conversations/${conversation.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "text", content: "Message à supprimer" }) }, client);
    const messageId = sent.body.id;
    const forbidden = await request(`/api/conversations/${conversation.id}/messages/${messageId}`, { method: "DELETE" }, owner);
    const deleted = await request(`/api/conversations/${conversation.id}/messages/${messageId}`, { method: "DELETE" }, client);
    const clientRead = await request(`/api/conversations/${conversation.id}/messages`, {}, client);
    const ownerRead = await request(`/api/conversations/${conversation.id}/messages`, {}, owner);
    assert.equal(forbidden.response.status, 403); assert.equal(deleted.response.status, 200); assert.equal(clientRead.body.length, 0); assert.equal(ownerRead.body.length, 0);
  });

  it("crée une notification pour le bon destinataire lors d’un nouveau message", async () => {
    const { client, owner, outsider, conversation } = await fixture();
    const sent = await request(`/api/conversations/${conversation.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "text", content: "Bonjour garage" }) }, client);
    const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.type, "message"));
    assert.equal(sent.response.status, 201); assert.equal(notifications.length, 1); assert.equal(notifications[0].userId, owner.id); assert.notEqual(notifications[0].userId, client.id); assert.notEqual(notifications[0].userId, outsider.id);
  });

  it("permet au destinataire de marquer comme lu, mais refuse l’expéditeur", async () => {
    const { client, owner, conversation } = await fixture();
    await request(`/api/conversations/${conversation.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "text", content: "Réponse du garage" }) }, owner);
    const senderAttempt = await request(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }, owner);
    const recipientRead = await request(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }, client);
    const messages = await db.select().from(messagesTable).where(and(eq(messagesTable.conversationId, conversation.id), sql`read_at IS NOT NULL`));
    assert.equal(senderAttempt.response.status, 403); assert.equal(recipientRead.response.status, 200); assert.equal(messages.length, 1);
  });
});
