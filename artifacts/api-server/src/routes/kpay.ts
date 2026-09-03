import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { and, eq, lte, or } from "drizzle-orm";
import { db, invoicesTable, kpayPaymentsTable } from "@workspace/db";
import { canAcceptInvoicePayment, isSuccessfulKpayStatus } from "../lib/invoiceFlowRules";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();

function validWebhookSecret(req: Request): boolean {
  const expected = process.env.KPAY_WEBHOOK_SECRET;
  const provided = String(req.headers["x-kpay-webhook-secret"] ?? "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 9) return `242${digits}`;
  if (digits.length === 12 && digits.startsWith("242")) return digits;
  return null;
}

router.post("/webhook", rateLimit({ keyPrefix: "kpay-webhook", windowMs: 60_000, max: 120 }), async (req: Request, res: Response) => {
  if (!validWebhookSecret(req)) return res.status(401).json({ error: "Webhook non autorisé." });
  const payload = req.body as Record<string, unknown>;
  const externalId = String(payload.externalId ?? payload.external_id ?? payload.reference ?? "").trim();
  const transactionId = String(payload.transactionId ?? payload.transaction_id ?? payload.id ?? "").trim() || null;
  const status = String(payload.status ?? payload.state ?? "").trim().toUpperCase();
  const paid = isSuccessfulKpayStatus(status);
  if (!externalId) return res.status(400).json({ error: "Référence KPay manquante." });
  try {
    const [payment] = await db.select().from(kpayPaymentsTable).where(eq(kpayPaymentsTable.externalId, externalId));
    if (!payment) return res.status(404).json({ error: "Paiement introuvable." });
    if (payment.status === "SUCCESS" || payment.status === "PAID") {
      return res.status(200).json({ accepted: true, duplicate: true, invoiceId: payment.invoiceId });
    }
    if (!paid) {
      await db.update(kpayPaymentsTable).set({ status: "FAILED", transactionId, rawWebhookPayload: payload, updatedAt: new Date() }).where(eq(kpayPaymentsTable.id, payment.id));
      return res.status(200).json({ accepted: true, paid: false });
    }
    const [invoice] = payment.invoiceId
      ? await db.select().from(invoicesTable).where(eq(invoicesTable.id, payment.invoiceId))
      : [];
    if (!invoice || Number(payment.amount) !== Number(invoice.amount) || invoice.expiresAt <= new Date()) {
      await db.update(kpayPaymentsTable).set({ status: "FAILED", transactionId, rawWebhookPayload: payload, updatedAt: new Date() }).where(eq(kpayPaymentsTable.id, payment.id));
      return res.status(409).json({ error: "Paiement confirmé mais facture expirée ou montant incohérent." });
    }
    await db.transaction(async tx => {
      await tx.update(kpayPaymentsTable).set({ status: "SUCCESS", transactionId, paidAt: new Date(), rawWebhookPayload: payload, updatedAt: new Date() }).where(eq(kpayPaymentsTable.id, payment.id));
      await tx.update(invoicesTable).set({ status: "paid", paidAt: new Date(), kpayTransactionId: transactionId, updatedAt: new Date() }).where(and(eq(invoicesTable.id, invoice.id), or(eq(invoicesTable.status, "issued"), eq(invoicesTable.status, "pending"))));
    });
    return res.status(200).json({ accepted: true, paid: true, invoiceId: invoice.id });
  } catch (error) {
    console.error("[KPAY WEBHOOK ERROR]", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ error: "Erreur de traitement du webhook." });
  }
});

router.post("/pay", rateLimit({ keyPrefix: "kpay-pay", windowMs: 60_000, max: 5 }), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  const invoiceId = typeof req.body?.invoiceId === "string" ? req.body.invoiceId.trim() : "";
  const phoneNumber = normalizePhone(req.body?.phoneNumber ?? req.body?.phone);
  const providerInput = String(req.body?.provider ?? "").trim().toUpperCase();
  const provider = providerInput.includes("AIRTEL")
    ? "AIRTEL_COG"
    : providerInput.includes("MTN")
      ? "MTN_MOMO_COG"
      : null;
  if (!invoiceId || !phoneNumber || !provider) {
    return res.status(400).json({ error: "invoiceId, phoneNumber et provider sont requis." });
  }

  try {
    const now = new Date();
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });
    const paymentRule = canAcceptInvoicePayment(invoice, invoice.amount, now);
    if (!paymentRule.ok && paymentRule.reason === "expired_or_closed") {
      if (["issued", "pending"].includes(invoice.status) && invoice.expiresAt <= now) {
        await db.update(invoicesTable).set({ status: "expired", updatedAt: now }).where(eq(invoicesTable.id, invoice.id));
        return res.status(410).json({ error: "Cette facture a expiré." });
      }
      return res.status(409).json({ error: "Cette facture ne peut plus être payée." });
    }
    if (!paymentRule.ok && paymentRule.reason === "already_paid") return res.status(409).json({ error: "Cette facture est déjà payée." });

    const externalId = `INV-${invoice.id}-${Date.now()}`;
    await db.insert(kpayPaymentsTable).values({
      externalId,
      amount: String(invoice.amount),
      provider,
      phoneNumber,
      description: invoice.description ?? "Paiement WapiGarage",
      clientId: invoice.clientId,
      garageId: invoice.garageId,
      invoiceId: invoice.id,
      status: "PENDING",
    });

    const baseUrl = process.env.KPAY_API_URL || "https://admin.kpay.site";
    const apiKey = process.env.KPAY_API_KEY || "";
    const secretKey = process.env.KPAY_SECRET_KEY || "";
    const kpayRes = await fetch(`${baseUrl}/api/v1/payments/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Secret-Key": secretKey,
      },
      body: JSON.stringify({
        amount: invoice.amount,
        phoneNumber,
        provider,
        externalId,
        description: invoice.description ?? "Paiement WapiGarage",
      }),
    });
    const responseText = await kpayRes.text();
    if (!kpayRes.ok) {
      await db.update(kpayPaymentsTable).set({ status: "FAILED", updatedAt: new Date() }).where(eq(kpayPaymentsTable.externalId, externalId));
      return res.status(kpayRes.status).json({ error: "Échec du paiement KPay" });
    }
    let kpayData: unknown;
    try {
      kpayData = JSON.parse(responseText);
    } catch {
      kpayData = { raw: responseText };
    }
    return res.status(202).json({
      accepted: true,
      invoiceId: invoice.id,
      externalId,
      amount: invoice.amount,
      currency: invoice.currency,
      status: "pending",
      provider,
      kpay: kpayData,
    });
  } catch (error) {
    console.error("[KPAY ERROR]", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ error: "Erreur serveur pendant l'initialisation du paiement." });
  }
});

export default router;
