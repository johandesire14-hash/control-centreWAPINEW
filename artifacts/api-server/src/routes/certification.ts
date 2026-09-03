import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, certificationRequestsTable } from "@workspace/db";
import {
  CreateCertificationRequestBody,
  CreateCertificationRequestResponse,
  ListMyCertificationRequestsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/certification-requests", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateCertificationRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  const [created] = await db
    .insert(certificationRequestsTable)
    .values({ userId: req.user.id, documentUrls: parsed.data.documentUrls })
    .returning();

  res.status(201).json(
    CreateCertificationRequestResponse.parse({
      id: created.id,
      status: created.status,
      documentUrls: created.documentUrls as string[],
      createdAt: created.createdAt.toISOString(),
    }),
  );
});

router.get("/certification-requests/mine", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select()
    .from(certificationRequestsTable)
    .where(eq(certificationRequestsTable.userId, req.user.id))
    .orderBy(desc(certificationRequestsTable.createdAt));

  res.json(
    ListMyCertificationRequestsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        documentUrls: r.documentUrls as string[],
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

export default router;
