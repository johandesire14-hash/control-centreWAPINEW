import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, lte, or } from "drizzle-orm";
import { db, conversationsTable, garagesTable, invoicesTable, usersTable } from "@workspace/db";
import { getInvoiceExpiry } from "../lib/invoiceFlowRules";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

function authenticated(req: Request, res: Response): boolean {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Authentification requise." });
  return false;
}

router.post("/invoices/from-conversation/:conversationId", rateLimit({ keyPrefix: "invoice-create", windowMs: 60 * 60_000, max: 30 }), async (req: Request, res: Response) => {
  if (!authenticated(req, res)) return;
  const conversationId = Number(req.params.conversationId);
  const amount = Number(req.body?.amount);
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!Number.isInteger(conversationId) || !Number.isSafeInteger(amount) || amount < 100 || amount > 100_000_000) {
    res.status(400).json({ error: "Demande ou montant invalide." });
    return;
  }
  if (!description || description.length > 500) {
    res.status(400).json({ error: "La description de la prestation est requise." });
    return;
  }
  const now = new Date();
      const expiresAt = getInvoiceExpiry(now);
  try {
    const currentUser = req.user!;
    const result = await db.transaction(async tx => {
      const [conversation] = await tx
        .select({ conversation: conversationsTable, garage: garagesTable, client: usersTable })
        .from(conversationsTable)
        .innerJoin(garagesTable, eq(conversationsTable.garageId, garagesTable.id))
        .innerJoin(usersTable, eq(conversationsTable.clientId, usersTable.id))
        .where(eq(conversationsTable.id, conversationId));
      if (!conversation) return { error: "Demande introuvable.", status: 404 } as const;
      if (conversation.garage.ownerId !== currentUser.id) return { error: "Ce garage ne peut pas traiter cette demande.", status: 403 } as const;

      await tx
        .update(invoicesTable)
        .set({ status: "expired", updatedAt: now })
        .where(and(
          eq(invoicesTable.garageId, conversation.conversation.garageId),
          eq(invoicesTable.clientId, conversation.conversation.clientId),
          or(eq(invoicesTable.status, "issued"), eq(invoicesTable.status, "pending")),
          lte(invoicesTable.expiresAt, now),
        ));

      const [activeInvoice] = await tx
        .select({ id: invoicesTable.id, expiresAt: invoicesTable.expiresAt })
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.garageId, conversation.conversation.garageId),
          eq(invoicesTable.clientId, conversation.conversation.clientId),
          or(eq(invoicesTable.status, "issued"), eq(invoicesTable.status, "pending")),
        ))
        .orderBy(desc(invoicesTable.createdAt))
        .limit(1);
      if (activeInvoice) return { error: "Une facture est déjà en attente pour ce client.", status: 409, activeInvoice } as const;

      const [invoice] = await tx
        .insert(invoicesTable)
        .values({
          garageId: conversation.conversation.garageId,
          clientId: conversation.conversation.clientId,
          conversationId,
          amount,
          currency: "XAF",
          description,
          status: "pending",
          expiresAt,
        })
        .returning();
      await tx
        .update(conversationsTable)
        .set({ lastMessage: "Une facture a été créée pour cette demande.", lastMessageAt: now })
        .where(eq(conversationsTable.id, conversationId));
      return { invoice, client: conversation.client, garage: conversation.garage } as const;
    });
    if ("error" in result) {
      res.status(result.status as number).json(result);
      return;
    }
    res.status(201).json({
      invoiceId: result.invoice.id,
      client: { id: result.client.id, name: [result.client.firstName, result.client.lastName].filter(Boolean).join(" ") || "Client" },
      garage: { id: result.garage.id, name: result.garage.name },
      amount: result.invoice.amount,
      currency: result.invoice.currency,
      description: result.invoice.description,
      status: result.invoice.status,
      expiresAt: result.invoice.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[invoices/from-conversation] failed", error);
    res.status(500).json({ error: "Impossible de créer la facture." });
  }
});

router.delete("/invoices/:invoiceId", async (req: Request, res: Response) => {
  if (!authenticated(req, res)) return;
  const invoiceId = Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId;
  try {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });
    const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, invoice.garageId));
    if (!garage || garage.ownerId !== req.user!.id) return res.status(403).json({ error: "Seul le garage émetteur peut annuler cette facture." });
    if (invoice.status === "paid") return res.status(409).json({ error: "Une facture déjà payée ne peut pas être annulée." });
    if (!["issued", "pending"].includes(invoice.status)) return res.status(409).json({ error: "Cette facture ne peut plus être annulée." });
    await db.update(invoicesTable).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(invoicesTable.id, invoice.id), or(eq(invoicesTable.status, "issued"), eq(invoicesTable.status, "pending"))));
    return res.status(200).json({ invoiceId: invoice.id, status: "cancelled" });
  } catch (error) {
    console.error("[invoices/cancel] failed", error);
    return res.status(500).json({ error: "Impossible d’annuler la facture." });
  }
});

router.get("/invoices/:invoiceId", async (req: Request, res: Response) => {
  if (!authenticated(req, res)) return;
  const invoiceId = Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId;
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  if (!invoice) {
    res.status(404).json({ error: "Facture introuvable." });
    return;
  }
  const [invoiceGarage] = await db.select().from(garagesTable).where(eq(garagesTable.id, invoice.garageId));
  if (!invoiceGarage || (req.user!.id !== invoice.clientId && req.user!.id !== invoiceGarage.ownerId)) {
    res.status(403).json({ error: "Accès interdit à cette facture." });
    return;
  }
  if (["issued", "pending"].includes(invoice.status) && invoice.expiresAt <= new Date()) {
    await db.update(invoicesTable).set({ status: "expired", updatedAt: new Date() }).where(eq(invoicesTable.id, invoice.id));
    res.status(410).json({ error: "Cette facture a expiré." });
    return;
  }
  const garage = invoiceGarage;
  const [client] = invoice.clientId ? await db.select().from(usersTable).where(eq(usersTable.id, invoice.clientId)) : [];
  res.json({
    invoiceId: invoice.id,
    garage: garage ? { id: garage.id, name: garage.name, ownerId: garage.ownerId } : null,
    client: client ? { id: client.id, name: [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client" } : null,
    amount: invoice.amount,
    currency: invoice.currency,
    description: invoice.description,
    status: invoice.status,
    expiresAt: invoice.expiresAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
  });
});

export default router;
