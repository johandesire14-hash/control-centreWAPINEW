import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, reviewsTable, usersTable, garagesTable, notificationsTable, invoicesTable } from "@workspace/db";
import { CreateGarageReviewBody, CreateGarageReviewResponse, ListGarageReviewsResponse } from "@workspace/api-zod";
import { canSubmitInvoiceReview } from "../lib/invoiceFlowRules";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.get("/garages/:garageId/reviews", async (req: Request, res: Response) => {
  const garageId = Number(req.params.garageId);

  const rows = await db
    .select({ review: reviewsTable, user: usersTable })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.garageId, garageId))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(
    ListGarageReviewsResponse.parse(
      rows.map(({ review, user }) => ({
        id: review.id,
        garageId: review.garageId,
        userId: review.userId,
        userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Utilisateur",
        userProfileImageUrl: user.profileImageUrl,
        rating: review.rating,
        comment: review.comment,
        qualityRating: review.qualityRating,
        honestyRating: review.honestyRating,
        punctualityRating: review.punctualityRating,
        valueRating: review.valueRating,
        createdAt: review.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/garages/:garageId/reviews", rateLimit({ keyPrefix: "review-create", windowMs: 60 * 60_000, max: 10 }), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const garageId = Number(req.params.garageId);
  const parsed = CreateGarageReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (!garage) {
    res.status(404).json({ error: "Garage not found" });
    return;
  }

  // Anti-self-interaction: garage owner cannot review their own garage
  if (garage.ownerId === req.user.id) {
    res.status(403).json({ error: "Vous ne pouvez pas interagir avec votre propre garage." });
    return;
  }

  const requestedInvoiceId = typeof req.body?.invoiceId === "string" ? req.body.invoiceId.trim() : "";
  const [invoice] = requestedInvoiceId
    ? await db.select().from(invoicesTable).where(eq(invoicesTable.id, requestedInvoiceId))
    : await db
        .select()
        .from(invoicesTable)
        .where(and(eq(invoicesTable.garageId, garageId), eq(invoicesTable.clientId, req.user.id), eq(invoicesTable.status, "paid")))
        .orderBy(desc(invoicesTable.paidAt))
        .limit(1);
  if (!invoice || invoice.garageId !== garageId) {
    res.status(403).json({ error: "Cette facture n'appartient pas à ce garage." });
    return;
  }
  const [existingReview] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.invoiceId, invoice.id))
    .limit(1);
  const reviewRule = canSubmitInvoiceReview(invoice, req.user.id, Boolean(existingReview));
  if (!reviewRule.ok && reviewRule.reason === "not_invoice_client") {
    res.status(403).json({ error: "Seul le client lié à la facture peut laisser un avis." });
    return;
  }
  if (!reviewRule.ok && reviewRule.reason === "invoice_not_paid") {
    res.status(403).json({ error: "L'avis est disponible après confirmation du paiement." });
    return;
  }
  if (!reviewRule.ok && reviewRule.reason === "already_reviewed") {
    res.status(409).json({ error: "Un avis existe déjà pour cette facture." });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      garageId,
      userId: req.user.id,
      invoiceId: invoice.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      qualityRating: parsed.data.qualityRating,
      honestyRating: parsed.data.honestyRating,
      punctualityRating: parsed.data.punctualityRating,
      valueRating: parsed.data.valueRating,
    })
    .returning();

  await db.insert(notificationsTable).values({
    userId: garage.ownerId,
    type: "review",
    target: "pro",
    content: "Votre garage a reçu un nouvel avis.",
    relatedId: garageId,
  });

  const user = req.user;
  res.status(201).json(
    CreateGarageReviewResponse.parse({
      id: review.id,
      garageId: review.garageId,
      userId: review.userId,
      userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Utilisateur",
      userProfileImageUrl: user.profileImageUrl,
      rating: review.rating,
      comment: review.comment,
      qualityRating: review.qualityRating,
      honestyRating: review.honestyRating,
      punctualityRating: review.punctualityRating,
      valueRating: review.valueRating,
      createdAt: review.createdAt.toISOString(),
    }),
  );
});

export default router;
