import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, favoritesTable, garagesTable } from "@workspace/db";
import { AddFavoriteResponse, ListMyFavoritesResponse, RemoveFavoriteResponse } from "@workspace/api-zod";
import { toGarageSummary } from "../lib/garageSerializers";
import { positiveIntParam } from "../lib/routeParams";

const router: IRouter = Router();

router.get("/favorites", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select({ garage: garagesTable })
    .from(favoritesTable)
    .innerJoin(garagesTable, eq(favoritesTable.garageId, garagesTable.id))
    .where(eq(favoritesTable.userId, req.user.id));

  const summaries = await Promise.all(rows.map((r) => toGarageSummary(r.garage, req.user!.id)));
  res.json(ListMyFavoritesResponse.parse(summaries));
});

router.post("/garages/:garageId/favorite", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }

  // Anti-self-interaction: garage owner cannot favorite their own garage
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (garage?.ownerId === req.user.id) {
    res.status(403).json({ error: "Vous ne pouvez pas interagir avec votre propre garage." });
    return;
  }

  await db
    .insert(favoritesTable)
    .values({ userId: req.user.id, garageId })
    .onConflictDoNothing();

  res.status(201).json(AddFavoriteResponse.parse({ garageId, isFavorite: true }));
});

router.delete("/garages/:garageId/favorite", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }

  await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, req.user.id), eq(favoritesTable.garageId, garageId)));

  res.json(RemoveFavoriteResponse.parse({ garageId, isFavorite: false }));
});

export default router;
