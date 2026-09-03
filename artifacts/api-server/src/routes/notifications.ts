import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsResponse,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
} from "@workspace/api-zod";
import { positiveIntParam } from "../lib/routeParams";
const router: IRouter = Router();

router.get("/notifications", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const target = req.query.target as string | undefined;

  const conditions = [eq(notificationsTable.userId, req.user.id)];
  if (target === "client" || target === "pro") {
    conditions.push(eq(notificationsTable.target, target));
  }

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(
    ListNotificationsResponse.parse(
      rows.map((n) => ({
        id: n.id,
        type: n.type,
        target: n.target,
        content: n.content,
        relatedId: n.relatedId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/notifications/:notificationId/read", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const notificationId = positiveIntParam(req.params.notificationId);
  if (notificationId === null) {
    res.status(400).json({ error: "Identifiant de notification invalide" });
    return;
  }
  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, req.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(
    MarkNotificationReadResponse.parse({
      id: updated.id,
      type: updated.type,
      target: updated.target,
      content: updated.content,
      relatedId: updated.relatedId,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.patch("/notifications/read-all", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const target = req.query.target as string | undefined;

  const conditions = [eq(notificationsTable.userId, req.user.id)];
  if (target === "client" || target === "pro") {
    conditions.push(eq(notificationsTable.target, target));
  }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(...conditions));

  res.json(MarkAllNotificationsReadResponse.parse({ success: true }));
});

router.delete("/notifications/:notificationId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const notificationId = positiveIntParam(req.params.notificationId);
  if (notificationId === null) {
    res.status(400).json({ error: "Identifiant de notification invalide" });
    return;
  }
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, req.user.id)));

  res.json({ success: true });
});

export default router;
