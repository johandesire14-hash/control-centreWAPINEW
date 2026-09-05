import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, garagesTable, garagePhotosTable, usersTable } from "@workspace/db";
import {
  CreateGarageBody,
  CreateGarageResponse,
  GetGarageResponse,
  GetMyGarageResponse,
  ListGaragesResponse,
  ListTopRatedGaragesResponse,
  ListCertifiedGaragesResponse,
  UpdateGarageBody,
  UpdateGarageResponse,
  AddGaragePhotoBody,
  AddGaragePhotoResponse,
  ListGaragePhotosResponse,
  DeleteGaragePhotoResponse,
} from "@workspace/api-zod";
import { toGarageDetail, toGarageSummary } from "../lib/garageSerializers";
import { positiveIntParam } from "../lib/routeParams";

const router: IRouter = Router();

router.get("/garages", async (req: Request, res: Response) => {
  const { q, neighborhood, specialty, minRating, certifiedOnly, emergencyOnly, sort } = req.query;

  const conditions: SQL[] = [eq(garagesTable.certified, true)];
  if (typeof q === "string" && q.trim()) {
    const searchCondition = or(ilike(garagesTable.name, `%${q}%`), ilike(garagesTable.neighborhood, `%${q}%`));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (typeof neighborhood === "string" && neighborhood.trim()) {
    conditions.push(ilike(garagesTable.neighborhood, `%${neighborhood}%`));
  }
  if (typeof specialty === "string" && specialty.trim()) {
    conditions.push(sql`${garagesTable.specialties} @> ${JSON.stringify([specialty])}::jsonb`);
  }
  if (certifiedOnly === "true") {
    conditions.push(eq(garagesTable.certified, true));
  }
  if (emergencyOnly === "true") {
    conditions.push(eq(garagesTable.emergencyAvailable, true));
  }

  let query = db
    .select()
    .from(garagesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(garagesTable.createdAt));

  const garages = await query;
  let summaries = await Promise.all(garages.map((g) => toGarageSummary(g, req.user?.id)));

  if (typeof minRating === "string" && minRating.trim()) {
    const min = Number(minRating);
    summaries = summaries.filter((s) => s.averageRating >= min);
  }

  if (sort === "rating") {
    summaries.sort((a, b) => b.averageRating - a.averageRating);
  } else if (sort === "reviews") {
    summaries.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  res.json(ListGaragesResponse.parse(summaries));
});

router.get("/garages/top-rated", async (req: Request, res: Response) => {
  const requestedLimit = req.query.limit ? Number(req.query.limit) : 10;
  const limit = Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
  const garages = await db.select().from(garagesTable).orderBy(desc(garagesTable.createdAt));
  const summaries = await Promise.all(garages.map((g) => toGarageSummary(g, req.user?.id)));
  summaries.sort((a, b) => b.averageRating - a.averageRating);
  res.json(ListTopRatedGaragesResponse.parse(summaries.slice(0, limit)));
});

router.get("/garages/certified", async (req: Request, res: Response) => {
  const requestedLimit = req.query.limit ? Number(req.query.limit) : 10;
  const limit = Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
  const garages = await db
    .select()
    .from(garagesTable)
    .where(eq(garagesTable.certified, true))
    .orderBy(desc(garagesTable.createdAt))
    .limit(limit);
  const summaries = await Promise.all(garages.map((g) => toGarageSummary(g, req.user?.id)));
  res.json(ListCertifiedGaragesResponse.parse(summaries));
});

router.get("/garages/mine", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.ownerId, req.user.id));
  if (!garage) {
    res.json(null);
    return;
  }

  res.json(GetMyGarageResponse.parse(await toGarageDetail(garage, req.user.id)));
});

router.post("/garages", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateGarageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [existing] = await db.select().from(garagesTable).where(eq(garagesTable.ownerId, req.user.id));
  if (existing) {
    res.status(409).json({ error: "User already owns a garage" });
    return;
  }

  const { galleryImageUrls, ...garageInput } = parsed.data;

  const [garage] = await db
    .insert(garagesTable)
    .values({
      ownerId: req.user.id,
      name: garageInput.name,
      neighborhood: garageInput.neighborhood,
      address: garageInput.address,
      phone: garageInput.phone,
      whatsapp: garageInput.whatsapp ?? null,
      description: garageInput.description ?? null,
      coverImageUrl: garageInput.coverImageUrl ?? null,
      avatarImageUrl: garageInput.avatarImageUrl ?? null,
      specialties: garageInput.specialties,
      emergencyAvailable: garageInput.emergencyAvailable ?? false,
      averageRepairDelay: garageInput.averageRepairDelay ?? null,
      yearsExperience: garageInput.yearsExperience ?? 0,
      mechanicsCount: garageInput.mechanicsCount ?? 0,
      acceptedBrands: garageInput.acceptedBrands ?? [],
      openingHours: garageInput.openingHours ?? [],
    })
    .returning();

  if (galleryImageUrls?.length) {
    await db.insert(garagePhotosTable).values(galleryImageUrls.map((url) => ({ garageId: garage.id, url })));
  }

  await db.update(usersTable).set({ accountType: "garage_pro" }).where(eq(usersTable.id, req.user.id));

  res.status(201).json(CreateGarageResponse.parse(await toGarageDetail(garage, req.user.id)));
});

router.get("/garages/:garageId", async (req: Request, res: Response) => {
  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (!garage) {
    res.status(404).json({ error: "Garage not found" });
    return;
  }

  res.json(GetGarageResponse.parse(await toGarageDetail(garage, req.user?.id)));
});

router.patch("/garages/:garageId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (!garage) {
    res.status(404).json({ error: "Garage not found" });
    return;
  }
  if (garage.ownerId !== req.user.id) {
    res.status(403).json({ error: "Not the garage owner" });
    return;
  }

  const parsed = UpdateGarageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [updated] = await db
    .update(garagesTable)
    .set(parsed.data)
    .where(eq(garagesTable.id, garageId))
    .returning();

  res.json(UpdateGarageResponse.parse(await toGarageDetail(updated, req.user.id)));
});

router.get("/garages/:garageId/photos", async (req: Request, res: Response) => {
  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }
  const photos = await db
    .select()
    .from(garagePhotosTable)
    .where(eq(garagePhotosTable.garageId, garageId))
    .orderBy(desc(garagePhotosTable.createdAt));

  res.json(
    ListGaragePhotosResponse.parse(
      photos.map((p) => ({ id: p.id, garageId: p.garageId, url: p.url, createdAt: p.createdAt.toISOString() })),
    ),
  );
});

router.post("/garages/:garageId/photos", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (!garage || garage.ownerId !== req.user.id) {
    res.status(403).json({ error: "Not the garage owner" });
    return;
  }

  const parsed = AddGaragePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [photo] = await db
    .insert(garagePhotosTable)
    .values({ garageId, url: parsed.data.url })
    .returning();

  res.status(201).json(
    AddGaragePhotoResponse.parse({
      id: photo.id,
      garageId: photo.garageId,
      url: photo.url,
      createdAt: photo.createdAt.toISOString(),
    }),
  );
});

router.delete("/garages/:garageId/photos/:photoId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const garageId = positiveIntParam(req.params.garageId);
  if (garageId === null) {
    res.status(400).json({ error: "Identifiant de garage invalide" });
    return;
  }
  const photoId = positiveIntParam(req.params.photoId);
  if (photoId === null) {
    res.status(400).json({ error: "Identifiant de photo invalide" });
    return;
  }
  const [garage] = await db.select().from(garagesTable).where(eq(garagesTable.id, garageId));
  if (!garage || garage.ownerId !== req.user.id) {
    res.status(403).json({ error: "Not the garage owner" });
    return;
  }

  await db
    .delete(garagePhotosTable)
    .where(and(eq(garagePhotosTable.id, photoId), eq(garagePhotosTable.garageId, garageId)));

  res.json(DeleteGaragePhotoResponse.parse({ success: true }));
});

export default router;
