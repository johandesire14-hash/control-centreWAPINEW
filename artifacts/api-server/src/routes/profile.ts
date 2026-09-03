import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  garagesTable,
  favoritesTable,
  notificationsTable,
  conversationsTable,
  certificationRequestsTable,
  deletionReasonsTable,
} from "@workspace/db";
import { GetMyProfileResponse, UpdateMyProfileBody, UpdateMyProfileResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [garage] = await db
    .select({ id: garagesTable.id })
    .from(garagesTable)
    .where(eq(garagesTable.ownerId, user.id));

  res.json(
    GetMyProfileResponse.parse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      phone: user.phone,
      accountType: user.accountType,
      hasGarage: !!garage,
      onboardingCompleted: user.onboardingCompleted,
    }),
  );
});

router.patch("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  const [garage] = await db
    .select({ id: garagesTable.id })
    .from(garagesTable)
    .where(eq(garagesTable.ownerId, req.user.id));

  res.json(
    UpdateMyProfileResponse.parse({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      profileImageUrl: updated.profileImageUrl,
      phone: updated.phone,
      accountType: updated.accountType,
      hasGarage: !!garage,
      onboardingCompleted: updated.onboardingCompleted,
    }),
  );
});

/**
 * DELETE /api/users/me
 * Supprime toutes les données personnelles de l'utilisateur.
 * Les avis restent dans la DB mais apparaissent comme "Utilisateur supprimé"
 * (le nom est lu depuis usersTable via join — on efface firstName/lastName).
 * Comme reviews.userId est NOT NULL avec FK, on anonymise le compte plutôt
 * que de le supprimer physiquement.
 */
router.delete("/users/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  // 0. Enregistrer le motif de suppression (optionnel — on ne bloque pas si absent)
  const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 120) : null;
  const reasonDetail = typeof req.body?.reasonDetail === "string" ? req.body.reasonDetail.slice(0, 400) : null;
  if (reason) {
    await db.insert(deletionReasonsTable).values({ userId, reason, reasonDetail });
  }

  // 1. Supprimer les notifications
  await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));

  // 2. Supprimer les conversations dont l'utilisateur est le client
  //    (les messages cascadent automatiquement via onDelete: cascade)
  await db.delete(conversationsTable).where(eq(conversationsTable.clientId, userId));

  // 3. Supprimer les favoris
  await db.delete(favoritesTable).where(eq(favoritesTable.userId, userId));

  // 4. Supprimer les demandes de certification
  await db.delete(certificationRequestsTable).where(eq(certificationRequestsTable.userId, userId));

  // 5. Si garage pro : supprimer le garage (conversations/photos cascadent)
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.ownerId, userId));
  if (garage) {
    // Les conversations liées au garage sont supprimées (messages cascadent)
    await db.delete(conversationsTable).where(eq(conversationsTable.garageId, garage.id));
    await db.delete(garagesTable).where(eq(garagesTable.id, garage.id));
  }

  // 6. Anonymiser le compte (reviews.userId est NOT NULL donc on ne peut pas
  //    supprimer l'utilisateur — on efface les données personnelles à la place)
  await db
    .update(usersTable)
    .set({
      firstName: null,
      lastName: null,
      email: `deleted_${userId}@wapi.deleted`,
      profileImageUrl: null,
      phone: null,
      accountType: "client",
    })
    .where(eq(usersTable.id, userId));

  res.json({ success: true });
});

export default router;
