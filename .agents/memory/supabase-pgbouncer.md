---
name: Supabase pooler + Drizzle prepared statements
description: PgBouncer transaction mode (port 6543) breaks Drizzle named prepared statements — requires ?pgbouncer=true in the connection URL.
---

# Supabase pooler + Drizzle prepared statements

**Rule:** When using Supabase connection pooler in transaction mode (port 6543), always append `?pgbouncer=true` to the connection string.

**Why:** PgBouncer transaction mode reassigns connections per transaction — named prepared statements from one "session" are gone by the next request. Drizzle's NodePgPreparedQuery uses named statements by default, causing intermittent 500 errors.

**How to apply:** In `lib/db/src/index.ts`, programmatically append the flag:
```ts
const connectionString = rawUrl.includes("pgbouncer=true")
  ? rawUrl
  : rawUrl.includes("?") ? `${rawUrl}&pgbouncer=true` : `${rawUrl}?pgbouncer=true`;
```

Session mode (port 5432 via pooler) does NOT need this. Transaction mode (port 6543) is the Supabase default for new projects.
