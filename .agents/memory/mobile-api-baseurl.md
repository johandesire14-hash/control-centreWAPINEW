---
  name: Mobile apiClient base URL must not include /api
  description: WapiGarage mobile app's generated API client paths already start with /api; setting the fetch base URL to include a trailing /api causes every call to hit /api/api/... and 404.
  ---

  The Orval-generated API client (`@workspace/api-client-react`) embeds the full `/api/...` path in every generated function (e.g. `/api/profile`, `/api/garages`). `artifacts/mobile/lib/apiClient.ts` calls `setBaseUrl` once at startup — it must be set to just `https://${domain}` (origin only), NOT `https://${domain}/api`.

  **Why:** Setting the base URL with a trailing `/api` doubles the prefix (`/api/api/profile`), which 404s. This silently broke profile updates and garage creation ("Impossible de mettre à jour le profil") after the Google auth changes made the issue easier to reproduce, though the bug was pre-existing and unrelated to auth.

  **How to apply:** Any time `setBaseUrl` is (re)configured for `@workspace/api-client-react`, or a new generated api client is introduced, verify the base URL is the bare origin — check a couple of generated function paths to confirm they already include `/api`.
  