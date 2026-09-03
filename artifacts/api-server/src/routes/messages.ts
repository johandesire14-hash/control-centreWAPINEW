import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, isNull, or, inArray } from "drizzle-orm";
import { db, conversationsTable, messagesTable, garagesTable, usersTable, notificationsTable } from "@workspace/db";
import {
  ListConversationsResponse,
  StartConversationBody,
  StartConversationResponse,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  MarkConversationReadResponse,
} from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rateLimit";
import { positiveIntParam } from "../lib/routeParams";

const router: IRouter = Router();

async function serializeConversation(conversationId: number) {
  const [row] = await db
    .select({
      conversation: conversationsTable,
      garage: garagesTable,
      client: usersTable,
    })
    .from(conversationsTable)
    .innerJoin(garagesTable, eq(conversationsTable.garageId, garagesTable.id))
    .innerJoin(usersTable, eq(conversationsTable.clientId, usersTable.id))
    .where(eq(conversationsTable.id, conversationId));

  if (!row) return null;

  return {
    id: row.conversation.id,
    garageId: row.conversation.garageId,
    garageName: row.garage.name,
    garageAvatarImageUrl: row.garage.avatarImageUrl,
    clientId: row.conversation.clientId,
    clientName: [row.client.firstName, row.client.lastName].filter(Boolean).join(" ") || "Client",
    clientProfileImageUrl: row.client.profileImageUrl,
    lastMessage: row.conversation.lastMessage,
    lastMessageAt: row.conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: row.conversation.clientUnreadCount,
    garage: row.garage,
  };
}

router.get("/conversations", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = req.query.role as string | undefined; // "client" | "garage" | undefined
  const [ownedGarage] = await db.select().from(garagesTable).where(eq(garagesTable.ownerId, req.user.id));

  // Build the WHERE clause based on the requested role
  let whereClause;
  if (role === "client") {
    // Client inbox: only conversations where the user is the paying client
    whereClause = eq(conversationsTable.clientId, req.user.id);
  } else if (role === "garage" && ownedGarage) {
    // Garage inbox: only conversations received by user's garage
    whereClause = eq(conversationsTable.garageId, ownedGarage.id);
  } else {
    // Legacy / no-role: union of both (backward-compat)
    whereClause = ownedGarage
      ? or(eq(conversationsTable.clientId, req.user.id), eq(conversationsTable.garageId, ownedGarage.id))
      : eq(conversationsTable.clientId, req.user.id);
  }

  const rows = await db
    .select({ conversation: conversationsTable, garage: garagesTable, client: usersTable })
    .from(conversationsTable)
    .innerJoin(garagesTable, eq(conversationsTable.garageId, garagesTable.id))
    .innerJoin(usersTable, eq(conversationsTable.clientId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(conversationsTable.lastMessageAt));

  const isGarageOwner = (garageId: number) => ownedGarage?.id === garageId;

  res.json(
    ListConversationsResponse.parse(
      rows.map(({ conversation, garage, client }) => ({
        id: conversation.id,
        garageId: conversation.garageId,
        garageName: garage.name,
        garageAvatarImageUrl: garage.avatarImageUrl,
        clientId: conversation.clientId,
        clientName: [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client",
        clientProfileImageUrl: client.profileImageUrl,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        unreadCount: isGarageOwner(conversation.garageId)
          ? conversation.garageUnreadCount
          : conversation.clientUnreadCount,
      })),
    ),
  );
});

router.post("/conversations", rateLimit({ keyPrefix: "conversation-create", windowMs: 60 * 60_000, max: 20 }), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = StartConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, parsed.data.garageId));
  if (!garage) {
    res.status(404).json({ error: "Garage not found" });
    return;
  }

  // Anti-self-interaction: garage owner cannot message their own garage
  if (garage.ownerId === req.user.id) {
    res.status(403).json({ error: "Vous ne pouvez pas interagir avec votre propre garage." });
    return;
  }

  // Atomic upsert: INSERT ... ON CONFLICT DO NOTHING prevents duplicate conversations
  // even when the button is tapped multiple times in quick succession (race condition).
  const [inserted] = await db
    .insert(conversationsTable)
    .values({ garageId: garage.id, clientId: req.user.id })
    .onConflictDoNothing()
    .returning();

  const conversation =
    inserted ??
    (
      await db
        .select()
        .from(conversationsTable)
        .where(and(eq(conversationsTable.garageId, garage.id), eq(conversationsTable.clientId, req.user.id)))
    )[0];

  const serialized = await serializeConversation(conversation.id);
  res.json(StartConversationResponse.parse(serialized));
});

router.get("/conversations/:conversationId/messages", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const conversationId = positiveIntParam(req.params.conversationId);
  if (conversationId === null) {
    res.status(400).json({ error: "Identifiant de conversation invalide" });
    return;
  }
  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  if (!conversation) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, conversation.garageId));
  const isParticipant = conversation.clientId === req.user.id || garage?.ownerId === req.user.id;
  if (!isParticipant) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));

  res.json(
    ListMessagesResponse.parse(
      messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    ),
  );
});

router.post("/conversations/:conversationId/messages", rateLimit({ keyPrefix: "message-send", windowMs: 60 * 60_000, max: 120 }), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const conversationId = positiveIntParam(req.params.conversationId);
  if (conversationId === null) {
    res.status(400).json({ error: "Identifiant de conversation invalide" });
    return;
  }
  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  if (!conversation) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, conversation.garageId));
  const isClient = conversation.clientId === req.user.id;
  const isGarageOwner = garage?.ownerId === req.user.id;
  if (!isClient && !isGarageOwner) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ conversationId, senderId: req.user.id, type: parsed.data.type, content: parsed.data.content })
    .returning();

  await db
    .update(conversationsTable)
    .set({
      lastMessage: message.content,
      lastMessageAt: message.createdAt,
      clientUnreadCount: isClient ? conversation.clientUnreadCount : conversation.clientUnreadCount + 1,
      garageUnreadCount: isGarageOwner ? conversation.garageUnreadCount : conversation.garageUnreadCount + 1,
    })
    .where(eq(conversationsTable.id, conversationId));

  const recipientId = isClient ? garage?.ownerId : conversation.clientId;
  if (recipientId) {
    await db.insert(notificationsTable).values({
      userId: recipientId,
      type: "message",
      // Client envoie → destinataire est le garagiste (pro) ; pro envoie → destinataire est le client
      target: isClient ? "pro" : "client",
      content: "Vous avez reçu un nouveau message.",
      relatedId: conversationId,
    });
  }

  res.status(201).json(
    SendMessageResponse.parse({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
    }),
  );
});

router.patch("/conversations/:conversationId/read", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const conversationId = positiveIntParam(req.params.conversationId);
  if (conversationId === null) {
    res.status(400).json({ error: "Identifiant de conversation invalide" });
    return;
  }
  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  if (!conversation) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, conversation.garageId));
  const isClient = conversation.clientId === req.user.id;
  const isGarageOwner = garage?.ownerId === req.user.id;
  if (!isClient && !isGarageOwner) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.conversationId, conversationId), isNull(messagesTable.readAt)));

  await db
    .update(conversationsTable)
    .set(isClient ? { clientUnreadCount: 0 } : { garageUnreadCount: 0 })
    .where(eq(conversationsTable.id, conversationId));

  const serialized = await serializeConversation(conversationId);
  res.json(MarkConversationReadResponse.parse(serialized));
});

router.delete("/conversations/:conversationId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const conversationId = positiveIntParam(req.params.conversationId);
  if (conversationId === null) {
    res.status(400).json({ error: "Identifiant de conversation invalide" });
    return;
  }
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, conversation.garageId));
  const isClient = conversation.clientId === req.user.id;
  const isGarageOwner = garage?.ownerId === req.user.id;

  if (!isClient && !isGarageOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.conversationId, conversationId));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, conversationId));

  res.json({ success: true });
});

export default router;
