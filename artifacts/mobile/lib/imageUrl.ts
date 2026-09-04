/**
 * Image URL helper — converts Supabase Storage URLs to API proxy URLs.
 *
 * The mobile app no longer loads images directly from Supabase Storage.
 * Instead, all image requests go through the backend proxy at /api/images/*,
 * which handles Content-Type, caching, and Android compatibility.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "wapi-bucket";
const DOMAIN = (process.env.EXPO_PUBLIC_API_DOMAIN || "") ?? "";

// Prefix inside the Supabase storage path that we strip to get the object key
const STORAGE_PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/**
 * Old Replit Object Storage URLs (from the previous hosting environment).
 * These point to a dead domain (spock.replit.dev) and cannot be resolved.
 * Returning undefined immediately shows the placeholder without a network request.
 *
 * Pattern: https://<repl-id>.spock.replit.dev/api/storage/objects/...
 */
function isLegacyReplitStorageUrl(url: string): boolean {
  return url.includes(".replit.dev/api/storage/objects/");
}

/**
 * Returns a proxied image URL for any Supabase Storage URL.
 * - Legacy Replit Object Storage URLs → undefined (shows placeholder immediately)
 * - Supabase Storage URLs             → proxied through /api/images/*
 * - Google profile picture URLs       → passed through as-is
 * - Null / undefined / empty          → undefined (renders fallback)
 */
export function getImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Legacy Replit Object Storage URLs are permanently broken — show placeholder
  // immediately without attempting a network request that will always fail.
  if (isLegacyReplitStorageUrl(url)) {
    console.warn("[imageUrl] legacy Replit Storage URL — showing placeholder:", url);
    return undefined;
  }

  // If the DOMAIN is not configured yet (e.g. in a bare test env), fall back
  // to the original URL so images still appear rather than breaking silently.
  if (!DOMAIN) {
    console.warn("[imageUrl] EXPO_PUBLIC_DOMAIN not set — using raw URL as fallback", url);
    return url;
  }

  // Detect Supabase Storage URL by matching the base URL and bucket path
  if (SUPABASE_URL && url.startsWith(SUPABASE_URL)) {
    const idx = url.indexOf(STORAGE_PUBLIC_PREFIX);
    if (idx !== -1) {
      const objectPath = url.slice(idx + STORAGE_PUBLIC_PREFIX.length);
      const proxyUrl = `https://${DOMAIN}/api/images/${objectPath}`;
      console.log("[imageUrl] proxy:", proxyUrl);
      return proxyUrl;
    }
    // Supabase URL but unexpected format — log and fall back
    console.warn("[imageUrl] Unrecognised Supabase URL format:", url);
    return url;
  }

  // Non-Supabase URL (e.g. Google OAuth profile picture) — pass through
  return url;
}
