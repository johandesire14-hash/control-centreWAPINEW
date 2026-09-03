export const INVOICE_TTL_MS = 10 * 60 * 1000;

export type InvoiceLike = {
  status: string;
  expiresAt: Date;
  amount: number | string;
  clientId: string | null;
};

export function getInvoiceExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + INVOICE_TTL_MS);
}

export function isInvoiceActive(invoice: Pick<InvoiceLike, "status" | "expiresAt">, now: Date): boolean {
  return ["issued", "pending"].includes(invoice.status) && invoice.expiresAt.getTime() > now.getTime();
}

export function canCreateInvoice(existing: Pick<InvoiceLike, "status" | "expiresAt"> | null, now: Date) {
  return existing === null || !isInvoiceActive(existing, now);
}

export function canAcceptInvoicePayment(invoice: InvoiceLike, requestedAmount: number, now: Date) {
  if (invoice.status === "paid") return { ok: false as const, reason: "already_paid" as const };
  if (!isInvoiceActive(invoice, now)) return { ok: false as const, reason: "expired_or_closed" as const };
  if (Number(invoice.amount) !== Number(requestedAmount)) return { ok: false as const, reason: "amount_mismatch" as const };
  return { ok: true as const };
}

export function canSubmitInvoiceReview(invoice: Pick<InvoiceLike, "status" | "clientId">, userId: string, alreadyReviewed: boolean) {
  if (alreadyReviewed) return { ok: false as const, reason: "already_reviewed" as const };
  if (invoice.clientId !== userId) return { ok: false as const, reason: "not_invoice_client" as const };
  if (invoice.status !== "paid") return { ok: false as const, reason: "invoice_not_paid" as const };
  return { ok: true as const };
}

export function isSuccessfulKpayStatus(status: string): boolean {
  return ["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED", "CONFIRMED"].includes(status.trim().toUpperCase());
}
