import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db, garagesTable, sessionsTable, usersTable } from "@workspace/db";
import app from "../../../src/app";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL must target the isolated integration database");

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

type Actor = { id: string; cookie: string };

async function resetDatabase() {
  await db.execute(sql`TRUNCATE TABLE garages, sessions, users RESTART IDENTITY CASCADE`);
}

async function createActor(): Promise<Actor> {
  const id = `upload-${randomUUID()}`;
  const email = `${id}@integration.test`;
  await db.insert(usersTable).values({ id, email });
  const sid = randomUUID().replaceAll("-", "");
  await db.insert(sessionsTable).values({
    sid,
    sess: { user: { id, email, firstName: "Upload", lastName: "Test", profileImageUrl: null }, access_token: "integration", provider: "google" },
    expire: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { id, cookie: `sid=${sid}` };
}

async function createGarage(ownerId: string) {
  const [garage] = await db.insert(garagesTable).values({
    ownerId,
    name: "Garage Upload",
    neighborhood: "Centre",
    address: "1 rue des Uploads",
    phone: "+242060000002",
  }).returning();
  return garage;
}

async function request(path: string, init: RequestInit, actor: Actor) {
  const headers = new Headers(init.headers);
  headers.set("cookie", actor.cookie);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  return { response, body };
}

describe("Uploads — intégration PostgreSQL", { concurrency: false }, () => {
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

  it("rejette un type de fichier invalide avant tout appel au stockage", async () => {
    const actor = await createActor();
    const { response, body } = await request("/api/upload", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: Buffer.from("MZ executable") }, actor);
    assert.equal(response.status, 415);
    assert.deepEqual(body, { error: "Format d'image non supporté." });
  });

  it("rejette un fichier au-dessus de la limite avant l’envoi au stockage", async () => {
    const actor = await createActor();
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    const { response, body } = await request("/api/upload", { method: "POST", headers: { "content-type": "image/png" }, body: oversized }, actor);
    assert.equal(response.status, 413);
    assert.equal(body?.error, "Fichier trop volumineux.");
  });

  it("retourne une erreur JSON propre pour une URL d’image invalide ou expirée", async () => {
    const actor = await createActor();
    const { response, body } = await request("/api/images/expired/not-found.jpg", { method: "GET" }, actor);
    assert.ok([404, 502].includes(response.status));
    assert.equal(typeof body?.error, "string");
    assert.doesNotMatch(String(body?.error), /ECONNREFUSED|FetchError|stack/i);
  });

  it("refuse l’upload au nom d’un autre utilisateur ou garage", async () => {
    const owner = await createActor();
    const attacker = await createActor();
    const garage = await createGarage(owner.id);
    const { response, body } = await request(`/api/upload?garageId=${garage.id}`, { method: "POST", headers: { "content-type": "image/png" }, body: Buffer.from("PNG") }, attacker);
    assert.equal(response.status, 403);
    assert.deepEqual(body, { error: "Vous ne pouvez pas téléverser une image pour ce garage." });
  });
});
