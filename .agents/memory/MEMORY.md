- [Replit Auth on Expo apps](expo-replit-auth.md) — single hosted OIDC login covers signup/login/Google natively; don't build custom Supabase-style auth forms.
- [Orval-generated query hooks `enabled` option](orval-query-enabled-cast.md) — `{ query: { enabled } }` fails typecheck; needs `as never` cast until codegen is fixed.
- [Mobile apiClient base URL](mobile-api-baseurl.md) — base URL must be bare origin, not origin+/api, since generated client paths already include /api.

- [Imported artifact-shaped projects](imported-artifact-workflows.md) — GitHub imports with existing artifact.toml files may not have registered workflows/listArtifacts entries.
- [Supabase pooler + Drizzle prepared statements](supabase-pgbouncer.md) — transaction mode (port 6543) needs ?pgbouncer=true or intermittent 500s occur.
