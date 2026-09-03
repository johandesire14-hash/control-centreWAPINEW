import { Router, type IRouter, type Request, type Response } from "express";
import { count, eq } from "drizzle-orm";
import { db, garagesTable, reviewsTable, usersTable } from "@workspace/db";
import { GetPlatformStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  const [[certifiedGarages], [totalReviews], [totalUsers]] = await Promise.all([
    db.select({ value: count() }).from(garagesTable).where(eq(garagesTable.certified, true)),
    db.select({ value: count() }).from(reviewsTable),
    db.select({ value: count() }).from(usersTable),
  ]);

  res.json(
    GetPlatformStatsResponse.parse({
      certifiedGarageCount: certifiedGarages?.value ?? 0,
      totalReviewCount: totalReviews?.value ?? 0,
      totalUserCount: totalUsers?.value ?? 0,
    }),
  );
});

export default router;
