import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

function clientKeys(req: Request, prefix: string): string[] {
  const keys = [`${prefix}:ip:${req.ip ?? "unknown"}`];
  const userId = req.isAuthenticated?.() ? req.user?.id : undefined;
  if (userId) keys.push(`${prefix}:user:${userId}`);
  return keys;
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    let retryAfter = 0;
    for (const key of clientKeys(req, options.keyPrefix)) {
      const current = buckets.get(key);
      const bucket = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current;
      bucket.count += 1;
      buckets.set(key, bucket);
      if (bucket.count > options.max) {
        retryAfter = Math.max(retryAfter, Math.ceil((bucket.resetAt - now) / 1000));
      }
    }

    if (retryAfter > 0) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
    }
    return next();
  };
}

// Prevent unbounded memory growth in a single process. In a multi-instance
// deployment, replace this store with Redis or another shared limiter.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref();
