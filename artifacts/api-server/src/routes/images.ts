import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "wapi-bucket";
const CACHE_TTL = 60 * 60 * 24; // 24h

router.get("/images/*path", async (req: Request, res: Response) => {
  // Express 5 / path-to-regexp v8: *name captures segments as an array — join with "/"
  const raw = req.params.path;
  const imagePath = Array.isArray(raw) ? raw.join("/") : (raw ?? "");

  if (!imagePath) {
    res.status(400).json({ error: "Missing image path" });
    return;
  }

  if (!SUPABASE_URL) {
    req.log.error("EXPO_PUBLIC_SUPABASE_URL is not set — cannot proxy images");
    res.status(503).json({ error: "Image proxy not configured" });
    return;
  }

  const supabaseImageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${imagePath}`;

  req.log.info({ imagePath, supabaseImageUrl }, "Image proxy: fetching");

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(supabaseImageUrl, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    req.log.error({ err, imagePath }, "Image proxy: network error fetching from Supabase");
    res.status(502).json({ error: "Failed to fetch image from storage" });
    return;
  }

  if (!upstream.ok) {
    req.log.warn(
      { imagePath, status: upstream.status, supabaseImageUrl },
      "Image proxy: Supabase returned non-OK status",
    );
    res.status(upstream.status === 404 ? 404 : 502).json({
      error: "Image not found in storage",
      supabaseStatus: upstream.status,
    });
    return;
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL}, stale-while-revalidate=3600`);
  res.setHeader("X-Image-Source", "supabase-proxy");

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.status(200).send(buffer);
});

export default router;
