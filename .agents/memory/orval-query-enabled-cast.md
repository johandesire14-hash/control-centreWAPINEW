---
name: Orval-generated query hooks enabled option
description: Workaround for typecheck failures when passing { query: { enabled } } to generated React Query hooks
---

In this monorepo's Orval codegen setup, generated `UseQueryOptions` types are
imported raw from `@tanstack/react-query` without `Omit<...,'queryKey'|'queryFn'>`,
so `queryKey` ends up required instead of optional. Any call site passing
`{ query: { enabled: someBoolean } }` to a generated hook (e.g. `useGetMyProfile`,
useListConversations`) fails `tsc --noEmit` even though it works at runtime.

**Why:** Fixing the codegen template is out of scope for typical app work and
risks breaking other generated call sites.

**How to apply:** Cast the options object with `as never` at each call site,
e.g. `useGetMyProfile({ query: { enabled: isAuthenticated } as never })`. This
is a pragmatic, contained workaround — not a fix to the underlying generator.
