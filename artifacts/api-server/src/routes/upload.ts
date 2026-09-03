import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = "wapi-bucket";

// Accept raw binary body for this route only
router.post(
  "/upload",
  rateLimit({ keyPrefix: "upload", windowMs: 60 * 60_000, max: 30 }),
  express.raw({ type: ["image/*", "application/octet-stream"], limit: "10mb" }),
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      req.log.error("Supabase credentials not configured for upload");
      res.status(503).json({ error: "Upload not configured" });
      return;
    }

    const body = req.body as Buffer;
    if (!body || body.length === 0) {
      res.status(400).json({ error: "Empty body" });
      return;
    }

    const contentType = (req.headers["content-type"] ?? "image/jpeg").split(";")[0].trim();
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

    let uploadRes: globalThis.Response;
    try {
      uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "false",
        },
        body,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      req.log.error({ err }, "Upload: network error reaching Supabase Storage");
      res.status(502).json({ error: "Failed to reach storage" });
      return;
    }

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      req.log.error({ status: uploadRes.status, body: text }, "Upload: Supabase Storage error");
      res.status(502).json({ error: "Storage upload failed", detail: text });
      return;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    res.status(201).json({ url: publicUrl });
  },
);

export default router;
